// Endpoint para checkout Mercado Pago (cartão e Pix)
// Caminho sugerido: api/mercadopago-checkout.js

import { MercadoPagoConfig, Payment } from 'mercadopago';
import AbacatePay from 'abacatepay-nodejs-sdk';
import initFirestore from '../_lib/firebaseAdmin.js';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.REACT_APP_MERCADO_PAGO_ACCESS_TOKEN;
const abacateApiKey = process.env.ABACATEPAY_API_KEY;

console.log('[MercadoPago Checkout] Inicializando cliente Mercado Pago...');

const client = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 5000 }
});

const payment = new Payment(client);

console.log('[MercadoPago Checkout] Cliente Mercado Pago inicializado com sucesso');

const abacate = AbacatePay.default(abacateApiKey);

console.log('[MercadoPago Checkout] Cliente AbacatePay inicializado com sucesso');

export default async function handler(req, res) {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection?.remoteAddress ||
                   req.socket?.remoteAddress ||
                   'unknown';

  // Log seguro (sem dados sensíveis)
  console.log('[MercadoPago Checkout] Requisição recebida', {
    method: req.method,
    ip: clientIP,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    timestamp: new Date().toISOString()
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
    return res.status(200).end();
  }

  // Apenas POST permitido
  if (req.method !== 'POST') {
    console.warn('[MercadoPago Checkout] Método não permitido', {
      method: req.method,
      ip: clientIP
    });
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const requestData = req.body;
    const { valor, metodoPagamento, packageData, reservaData, cardToken, installments, payerData, deviceId, issuerId, paymentMethodId } = requestData;

    console.log('[MercadoPago Checkout] Dados recebidos', {
      metodoPagamento,
      valor,
      ip: clientIP,
      issuerId,
      paymentMethodId
    });
    if (metodoPagamento === 'pix') {
      console.log('[MercadoPago Checkout] Processando pagamento Pix com AbacatePay (QRCode direto)');

      if (!abacateApiKey) {
        console.error('[MercadoPago Checkout] API key do AbacatePay não configurada');
        return res.status(500).json({ error: 'Configuração do AbacatePay não encontrada' });
      }

      // Criar pedido no Firestore antes de criar o pagamento
      console.log('[MercadoPago Checkout] Inicializando Firestore...');
      const db = initFirestore();
      console.log('[MercadoPago Checkout] Firestore inicializado com sucesso');

      const orderRef = db.collection('orders').doc();

      // Extrair dados do cliente
      const customerName = reservaData?.customerName || 'Cliente';
      const customerEmail = reservaData?.customerEmail || 'cliente@exemplo.com';
      const customerCPF = reservaData?.customerCPF || '11111111111';
      const customerPhone = reservaData?.customerPhone || '';

      console.log('[MercadoPago Checkout] Dados do cliente:', {
        customerName,
        customerEmail,
        customerCPF,
        customerPhone
      });

      // Buscar plano do provider para calcular comissão
      let commissionPercent = 9; // Default para free
      if (packageData?.providerId) {
        try {
          const providerDoc = await db.collection('users').doc(packageData.providerId).get();
          const provider = providerDoc.data();
          const planId = provider?.planId || 'free';
          const commissions = {
            free: 9,
            professional: 7,
            premium: 6
          };
          commissionPercent = commissions[planId] || 9;
        } catch (error) {
          console.warn('[MercadoPago Checkout] Erro ao buscar plano do provider:', error);
        }
      }

      const order = {
        serviceId: packageData?.serviceId || null,
        providerId: packageData?.providerId || null,
        totalAmount: valor,
        commissionPercent: commissionPercent,
        commissionAmount: valor * (commissionPercent / 100),
        providerAmount: valor * (1 - commissionPercent / 100),
        status: 'pending',
        paymentMethod: 'pix',
        createdAt: new Date().toISOString(),
        abacatepayPixId: null, // Será atualizado após criação do QRCode
        customerName,
        customerEmail,
        customerCPF,
        customerPhone
      };

      console.log('[MercadoPago Checkout] Criando pedido no Firestore:', order);
      await orderRef.set(order);

      // Criar QRCode PIX direto (retorna o QR Code para exibir no frontend)
      const valorEmCentavos = Math.round(valor * 100);
      
      // Montar dados do PIX - customer é opcional
      const pixData = {
        amount: valorEmCentavos,
        description: `Pagamento PIX - ${packageData?.title || 'Produto'}`.substring(0, 140),
        expiresIn: 3600 // 1 hora
      };
      
      // Adicionar customer apenas se todos os campos estiverem preenchidos
      const cleanPhone = customerPhone?.replace(/\D/g, '') || '';
      const cleanCPF = customerCPF?.replace(/\D/g, '') || '';
      
      if (customerName && customerEmail && cleanPhone && cleanCPF) {
        pixData.customer = {
          name: customerName,
          email: customerEmail,
          cellphone: cleanPhone,
          taxId: cleanCPF
        };
      }

      console.log('[MercadoPago Checkout] Criando QRCode PIX direto:', pixData);
      const pixResponse = await abacate.pixQrCode.create(pixData);
      console.log('[MercadoPago Checkout] QRCode PIX criado:', JSON.stringify(pixResponse, null, 2));

      if (!pixResponse || !pixResponse.data) {
        throw new Error('Erro ao criar QRCode PIX no AbacatePay');
      }

      const pix = pixResponse.data;

      // Atualizar pedido com o pixId
      await orderRef.update({
        abacatepayPixId: pix.id,
        serviceTitle: packageData?.title || 'Produto',
        providerName: packageData?.ownerName || 'Lucrazi'
      });

      return res.status(200).json({
        success: true,
        pix_id: pix.id,
        orderId: orderRef.id,
        status: pix.status,
        qrCode: pix.brCode || '',
        qrCodeBase64: pix.brCodeBase64 || '',
        expiration_date: pix.expiresAt,
        amount: pix.amount,
        description: pix.description || packageData?.title || 'Pagamento PIX'
      });
    }
    if (metodoPagamento === 'cartao' && cardToken) {
      console.log('[MercadoPago Checkout] Processando pagamento com cartão');

      // Criar pedido no Firestore antes de criar o pagamento
      const db = initFirestore();
      const orderRef = db.collection('orders').doc();

      // Extrair dados do cliente
      const customerName = reservaData?.customerName || 'Cliente';
      const customerEmail = reservaData?.customerEmail || 'cliente@exemplo.com';
      const customerCPF = reservaData?.customerCPF || '11111111111';
      const customerPhone = reservaData?.customerPhone || '';

      console.log('[MercadoPago Checkout] Dados do cliente para cartão:', {
        customerName,
        customerEmail,
        customerCPF,
        customerPhone
      });

      // Buscar plano do provider para calcular comissão
      let commissionPercent = 9; // Default para free
      if (packageData?.providerId) {
        try {
          const providerDoc = await db.collection('users').doc(packageData.providerId).get();
          const provider = providerDoc.data();
          const planId = provider?.planId || 'free';
          const commissions = {
            free: 9,
            professional: 7,
            premium: 6
          };
          commissionPercent = commissions[planId] || 9;
        } catch (error) {
          console.warn('[MercadoPago Checkout] Erro ao buscar plano do provider:', error);
        }
      }

      const order = {
        serviceId: packageData?.serviceId || null,
        providerId: packageData?.providerId || null,
        totalAmount: valor,
        commissionPercent: commissionPercent,
        commissionAmount: valor * (commissionPercent / 100),
        providerAmount: valor * (1 - commissionPercent / 100),
        status: 'pending',
        paymentMethod: 'card',
        createdAt: new Date().toISOString(),
        mercadopagoPaymentId: null, // Será atualizado após criação do pagamento
        customerName,
        customerEmail,
        customerCPF,
        customerPhone
      };

      console.log('[MercadoPago Checkout] Criando pedido no Firestore para cartão:', order);
      await orderRef.set(order);

      // 🔗 URL do webhook - OBRIGATÓRIO para 100% na qualidade
      const webhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL || 'https://lucrazi.com.br/api/mercadopago-webhook';
      
      // ✅ Validar e limitar CPF a 11 dígitos ANTES de montar o payload
      // CPF pode vir com dígitos extras por erro do usuário
      const cpfRaw = (payerData?.cpf || customerCPF).replace(/\D/g, '');
      const cpfValidated = cpfRaw.slice(0, 11); // Garantir máximo 11 dígitos
      
      if (cpfValidated.length !== 11) {
        console.error('[MercadoPago Checkout] CPF inválido:', cpfValidated, 'length:', cpfValidated.length);
        return res.status(400).json({
          success: false,
          error: 'CPF inválido. Deve conter exatamente 11 dígitos.'
        });
      }
      
      // 🎯 PAYLOAD COMPLETO PARA 100/100 NO MERCADO PAGO
      const paymentData = {
        transaction_amount: valor,
        token: cardToken,
        description: `${packageData?.title || 'Produto'} - Lucrazi`,
        installments: parseInt(installments) || 1,
        // payment_method_id e issuer_id do CardForm
        payment_method_id: paymentMethodId || undefined,
        issuer_id: issuerId ? parseInt(issuerId) : undefined,
        
        // ✅ BINARY MODE - false para permitir análise de fraude (recomendado)
        binary_mode: false,
        
        // ✅ CAPTURE - true para captura automática
        capture: true,
        
        // ✅ STATEMENT DESCRIPTOR - Nome na fatura do cartão (NÍVEL RAIZ) - MAX 22 CHARS
        // IMPORTANTE: Deve ser enviado ANTES do payer
        statement_descriptor: 'LUCRAZI',
        
        // ✅ PAYER - Todos os campos obrigatórios (NÍVEL RAIZ)
        payer: {
          email: payerData?.email || customerEmail,
          first_name: payerData?.first_name || customerName.split(' ')[0] || 'Cliente',
          last_name: payerData?.last_name || customerName.split(' ').slice(1).join(' ') || 'Lucrazi',
          identification: {
            type: 'CPF',
            number: cpfValidated
          },
          phone: customerPhone ? {
            area_code: customerPhone.replace(/\D/g, '').substring(0, 2),
            number: customerPhone.replace(/\D/g, '').substring(2)
          } : undefined,
          address: {
            zip_code: reservaData?.zipCode || '00000000',
            street_name: reservaData?.address || 'Não informado',
            street_number: reservaData?.addressNumber || 'S/N'
          }
        },
        
        // ✅ EXTERNAL REFERENCE - Obrigatório para conciliação (NÍVEL RAIZ)
        external_reference: orderRef.id,
        
        // ✅ NOTIFICATION URL - Obrigatório para webhooks (NÍVEL RAIZ)
        notification_url: webhookUrl,
        
        // ✅ ADDITIONAL INFO - Dados adicionais para melhor análise de fraude
        additional_info: {
          items: [{
            id: packageData?.serviceId || orderRef.id,
            title: packageData?.title || 'Produto Digital',
            description: packageData?.description || `Compra realizada na plataforma Lucrazi - ${packageData?.title || 'Produto'}`,
            category_id: 'services',
            quantity: 1,
            unit_price: valor,
            picture_url: packageData?.imageUrl || undefined
          }],
          payer: {
            first_name: payerData?.first_name || customerName.split(' ')[0],
            last_name: payerData?.last_name || customerName.split(' ').slice(1).join(' '),
            phone: customerPhone ? {
              area_code: customerPhone.replace(/\D/g, '').substring(0, 2),
              number: customerPhone.replace(/\D/g, '').substring(2)
            } : undefined,
            registration_date: new Date().toISOString()
          },
          shipments: {
            receiver_address: {
              zip_code: reservaData?.zipCode || '00000000',
              street_name: reservaData?.address || 'Digital',
              street_number: reservaData?.addressNumber || '0'
            }
          }
        },
        
        // ✅ METADATA - Dados internos para rastreamento
        metadata: {
          order_id: orderRef.id,
          service_id: packageData?.serviceId || null,
          provider_id: packageData?.providerId || null,
          platform: 'Lucrazi Marketplace',
          integration_version: '2.1'
        }
      };

      // Remover campos undefined
      if (!paymentData.payment_method_id) delete paymentData.payment_method_id;
      if (!paymentData.issuer_id) delete paymentData.issuer_id;

      // ⚠️ GARANTIR que external_reference, statement_descriptor e notification_url estão presentes
      // Forçar valores caso estejam undefined
      if (!paymentData.external_reference) {
        paymentData.external_reference = orderRef.id;
      }
      if (!paymentData.statement_descriptor) {
        paymentData.statement_descriptor = 'LUCRAZI';
      }
      if (!paymentData.notification_url) {
        paymentData.notification_url = 'https://lucrazi.com.br/api/mercadopago-webhook';
      }
      
      console.log('[MercadoPago Checkout] ✅ Campos obrigatórios verificados:', {
        external_reference: paymentData.external_reference,
        statement_descriptor: paymentData.statement_descriptor,
        notification_url: paymentData.notification_url
      });

      console.log('[MercadoPago Checkout] Criando pagamento com cartão no Mercado Pago:', JSON.stringify(paymentData, null, 2));
      const result = await payment.create({ body: paymentData });
      console.log('[MercadoPago Checkout] Pagamento com cartão criado:', result);

      // Atualizar pedido com o paymentId
      await orderRef.update({
        mercadopagoPaymentId: result.id
      });

      return res.status(200).json({
        success: true,
        payment_id: result.id,
        orderId: orderRef.id,
        status: result.status,
        status_detail: result.status_detail,
        payment_method_id: result.payment_method_id,
        installments: result.installments,
        transaction_amount: result.transaction_amount,
        date_created: result.date_created
      });
    }
    return res.status(400).json({ error: 'Método de pagamento não suportado ou dados insuficientes.' });
  } catch (error) {
    console.error('[MercadoPago Checkout] Erro no processamento:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
