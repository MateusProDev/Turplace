// Endpoint para verificar status do pedido no Firestore
// Usado para polling após pagamento Pix - também verifica na API do AbacatePay
import initFirestore from '.cjs';
import { sendFirstAccessEmail, generateResetToken } from '../_lib/brevoEmail.js';
import { 
  applySecurityMiddleware, 
  validateOrderId,
  logSecurityEvent 
} from '../_lib/security.js';

// Função para verificar status diretamente na API do AbacatePay
async function checkAbacatePayStatus(pixId) {
  const apiKey = process.env.ABACATEPAY_API_KEY;
  if (!apiKey || !pixId) return null;

  try {
    const response = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${pixId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('[Order Status] Erro ao verificar AbacatePay:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[Order Status] Status AbacatePay:', data);
    return data?.data?.status || null;
  } catch (error) {
    console.error('[Order Status] Erro ao verificar AbacatePay:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // Aplicar middleware de segurança completo
  const securityCheck = applySecurityMiddleware(req, res, 'status');
  
  if (securityCheck.blocked) {
    return res.status(securityCheck.status).json({ 
      error: securityCheck.reason === 'rate_limit' 
        ? 'Muitas requisições. Aguarde um momento.' 
        : 'Acesso bloqueado.'
    });
  }

  const clientIP = securityCheck.ip;
  
  console.log('[Order Status] Verificando status', {
    method: req.method,
    query: req.query,
    ip: clientIP
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { orderId } = req.query;

  // Validação de orderId usando módulo de segurança
  const orderIdValidation = validateOrderId(orderId);
  if (!orderIdValidation.valid) {
    logSecurityEvent({ type: 'INVALID_ORDER_ID', ip: clientIP, orderId });
    return res.status(400).json({ error: orderIdValidation.reason });
  }

  try {
    const db = initFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.log('[Order Status] Pedido não encontrado:', orderId);
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const orderData = orderDoc.data();
    console.log('[Order Status] Pedido encontrado:', { 
      orderId, 
      status: orderData.status,
      paidAt: orderData.paidAt,
      pixId: orderData.abacatepayPixId
    });

    // Se já está pago, retornar direto
    if (orderData.status === 'paid' || orderData.status === 'completed') {
      return res.status(200).json({
        orderId: orderId,
        status: 'approved',
        orderStatus: orderData.status,
        paidAt: orderData.paidAt || null,
        customerEmail: orderData.customerEmail || null,
        serviceTitle: orderData.serviceTitle || orderData.title || null,
        accessEmailSent: orderData.accessEmailSent || false
      });
    }

    // Se ainda pending e tem pixId, verificar na API do AbacatePay
    if (orderData.status === 'pending' && orderData.abacatepayPixId) {
      const abacateStatus = await checkAbacatePayStatus(orderData.abacatepayPixId);
      
      // Status possíveis: PENDING, PAID, EXPIRED
      if (abacateStatus === 'PAID') {
        console.log('[Order Status] Pagamento confirmado via AbacatePay!');
        
        // Atualizar pedido como pago
        const updateData = {
          status: 'paid',
          paidAt: new Date().toISOString(),
          paymentConfirmedAt: new Date().toISOString(),
          paymentConfirmedVia: 'polling'
        };
        
        await orderRef.update(updateData);

        // Atualizar carteira do provider
        if (orderData.providerId) {
          try {
            const walletRef = db.collection('wallets').doc(orderData.providerId);
            const walletDoc = await walletRef.get();
            const providerAmount = orderData.providerAmount || (orderData.totalAmount * 0.91);
            
            if (walletDoc.exists) {
              const currentBalance = walletDoc.data().balance || 0;
              await walletRef.update({
                balance: currentBalance + providerAmount,
                lastUpdated: new Date().toISOString()
              });
            } else {
              await walletRef.set({
                userId: orderData.providerId,
                balance: providerAmount,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              });
            }
            console.log('[Order Status] Carteira atualizada:', { providerId: orderData.providerId, amount: providerAmount });
          } catch (walletError) {
            console.error('[Order Status] Erro ao atualizar carteira:', walletError);
          }
        }

        // Enviar email de primeiro acesso
        if (orderData.customerEmail && !orderData.accessEmailSent) {
          try {
            // Gerar token de reset de senha
            const resetToken = generateResetToken();
            
            // Salvar token no Firestore para validação posterior
            await db.collection('passwordResets').doc(resetToken).set({
              email: orderData.customerEmail,
              orderId: orderId,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
              used: false
            });
            
            const emailResult = await sendFirstAccessEmail({
              customerEmail: orderData.customerEmail,
              customerName: orderData.customerName || 'Cliente',
              serviceTitle: orderData.serviceTitle || 'Produto',
              providerName: orderData.providerName || 'Lucrazi',
              amount: orderData.totalAmount,
              orderId: orderId,
              resetToken: resetToken
            });
            
            if (emailResult.success) {
              await orderRef.update({ accessEmailSent: true });
              console.log('[Order Status] Email enviado com sucesso');
            }
          } catch (emailError) {
            console.error('[Order Status] Erro ao enviar email:', emailError);
          }
        }

        return res.status(200).json({
          orderId: orderId,
          status: 'approved',
          orderStatus: 'paid',
          paidAt: updateData.paidAt,
          customerEmail: orderData.customerEmail || null,
          serviceTitle: orderData.serviceTitle || orderData.title || null,
          accessEmailSent: true
        });
      } else if (abacateStatus === 'EXPIRED') {
        await orderRef.update({ status: 'expired' });
        return res.status(200).json({
          orderId: orderId,
          status: 'rejected',
          orderStatus: 'expired',
          paidAt: null
        });
      }
    }

    // Mapear status do pedido para status de pagamento
    let paymentStatus = 'pending';
    if (orderData.status === 'paid' || orderData.status === 'completed') {
      paymentStatus = 'approved';
    } else if (orderData.status === 'cancelled' || orderData.status === 'expired') {
      paymentStatus = 'rejected';
    } else if (orderData.status === 'pending' || orderData.status === 'awaiting_payment') {
      paymentStatus = 'pending';
    }

    return res.status(200).json({
      orderId: orderId,
      status: paymentStatus,
      orderStatus: orderData.status,
      paidAt: orderData.paidAt || null,
      customerEmail: orderData.customerEmail || null,
      serviceTitle: orderData.serviceTitle || orderData.title || null,
      accessEmailSent: orderData.accessEmailSent || false
    });
  } catch (error) {
    console.error('[Order Status] Erro ao verificar status:', error);
    return res.status(500).json({ error: 'Erro ao verificar status do pedido', details: error.message });
  }
}
