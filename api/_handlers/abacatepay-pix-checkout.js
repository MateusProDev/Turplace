// Endpoint para checkout AbacatePay PIX
// Caminho sugerido: api/abacatepay-pix-checkout.js

import AbacatePay from 'abacatepay-nodejs-sdk';
import initFirestore from '../_lib/firebaseAdmin.cjs';

const apiKey = process.env.ABACATEPAY_API_KEY;

console.log('[AbacatePay PIX Checkout] Inicializando cliente AbacatePay...');

const abacate = AbacatePay.default(apiKey);

console.log('[AbacatePay PIX Checkout] Cliente AbacatePay inicializado com sucesso');

export default async function handler(req, res) {
  console.log('[AbacatePay PIX Checkout] Iniciando processamento', {
    method: req.method,
    headers: Object.keys(req.headers),
    body: req.body
  });

  if (!apiKey) {
    console.error('[AbacatePay PIX Checkout] API key não configurada');
    return res.status(500).json({ error: 'Configuração do AbacatePay não encontrada' });
  }

  console.log('[AbacatePay PIX Checkout] AbacatePay configurado com sucesso');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {
    console.log('[AbacatePay PIX Checkout] GET request - retornando status');
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        hasApiKey: !!process.env.ABACATEPAY_API_KEY,
        apiKeyPrefix: process.env.ABACATEPAY_API_KEY?.substring(0, 10) + '...',
        nodeEnv: process.env.NODE_ENV
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { valor, packageData, reservaData } = req.body;

    console.log('[AbacatePay PIX Checkout] Dados recebidos:', {
      valor,
      packageData,
      reservaData
    });

    if (!valor) {
      console.error('[AbacatePay PIX Checkout] Valor obrigatório faltando');
      return res.status(400).json({ error: 'Valor obrigatório não fornecido' });
    }

    const valorEmCentavos = Math.round(valor * 100);
    console.log('[AbacatePay PIX Checkout] Valor em centavos:', valorEmCentavos);

    if (!valorEmCentavos || valorEmCentavos <= 0) {
      console.error('[AbacatePay PIX Checkout] Valor inválido');
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Criar pedido no Firestore antes de criar o pagamento
    console.log('[AbacatePay PIX Checkout] Inicializando Firestore...');
    const db = initFirestore();
    console.log('[AbacatePay PIX Checkout] Firestore inicializado com sucesso');

    const orderRef = db.collection('orders').doc();

    // Extrair dados do cliente
    const customerName = reservaData?.customerName || 'Cliente';
    const customerEmail = reservaData?.customerEmail || 'cliente@exemplo.com';
    const customerCPF = reservaData?.customerCPF || '11111111111';
    const customerPhone = reservaData?.customerPhone || '';

    console.log('[AbacatePay PIX Checkout] Dados do cliente:', {
      customerName,
      customerEmail,
      customerCPF,
      customerPhone
    });

    // Buscar plano do provider para calcular comissão
    let commissionPercent = 1.99; // PIX sempre 1,99% (já inclui todas as taxas)

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
      abacatepayPaymentId: null, // Será atualizado após criação do pagamento
      customerName,
      customerEmail,
      customerCPF,
      customerPhone
    };

    console.log('[AbacatePay PIX Checkout] Criando pedido no Firestore:', order);
    await orderRef.set(order);

    // Criar cobrança PIX no AbacatePay
    const billingData = {
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: packageData?.serviceId || orderRef.id,
          name: packageData?.title || 'Pagamento PIX',
          quantity: 1,
          price: valorEmCentavos
        }
      ],
      returnUrl: process.env.ABACATEPAY_RETURN_URL || 'https://yourwebsite.com/return',
      completionUrl: process.env.ABACATEPAY_COMPLETION_URL || 'https://yourwebsite.com/complete',
      customer: {
        email: customerEmail,
        name: customerName,
        taxId: customerCPF.replace(/\D/g, ''),
        phone: customerPhone.replace(/\D/g, '')
      },
      metadata: {
        orderId: orderRef.id,
        customerData: JSON.stringify(reservaData),
        packageData: JSON.stringify(packageData)
      }
    };

    console.log('[AbacatePay PIX Checkout] Criando cobrança no AbacatePay:', billingData);
    const billing = await abacate.billing.create(billingData);
    console.log('[AbacatePay PIX Checkout] Cobrança criada:', billing);

    if (!billing.data) {
      throw new Error('Erro ao criar cobrança no AbacatePay');
    }

    // Atualizar pedido com o billingId
    await orderRef.update({
      abacatepayBillingId: billing.data.id
    });

    return res.status(200).json({
      success: true,
      billing_id: billing.data.id,
      orderId: orderRef.id,
      status: billing.data.status,
      url: billing.data.url,
      qrCode: billing.data.pixQrCode?.brCode || '',
      qrCodeBase64: billing.data.pixQrCode?.brCodeBase64 || '',
      expiration_date: billing.data.pixQrCode?.expiresAt
    });
  } catch (error) {
    console.error('[AbacatePay PIX Checkout] Erro:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}

