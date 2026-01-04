// Endpoint para verificar status do pedido no Firestore
// Usado para polling após pagamento Pix - também verifica na API do AbacatePay
import initFirestore from '../_lib/firebaseAdmin.js';
import { sendFirstAccessEmail, generateResetToken } from '../_lib/brevoEmail.js';

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

// Domínios permitidos para CORS
const ALLOWED_ORIGINS = [
  'https://lucrazi.com.br',
  'https://www.lucrazi.com.br',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Rate limiting simples em memória (por IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX = 100; // máx 100 requests por minuto por IP

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    record.count++;
  }
  
  rateLimitMap.set(ip, record);
  return record.count <= RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  
  console.log('[Order Status] Verificando status', {
    method: req.method,
    query: req.query,
    ip: clientIP
  });

  // CORS seguro
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    console.warn('[Order Status] Rate limit excedido para IP:', clientIP);
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { orderId } = req.query;

  // Validação de orderId (formato Firebase)
  if (!orderId || typeof orderId !== 'string' || orderId.length < 10 || orderId.length > 30) {
    return res.status(400).json({ error: 'orderId inválido' });
  }
  
  // Sanitização - apenas caracteres alfanuméricos permitidos
  if (!/^[a-zA-Z0-9]+$/.test(orderId)) {
    return res.status(400).json({ error: 'orderId contém caracteres inválidos' });
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
