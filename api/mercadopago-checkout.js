// Endpoint para checkout Mercado Pago (cartão e Pix)
// Caminho sugerido: api/mercadopago-checkout.js

import { MercadoPagoConfig, Payment } from 'mercadopago';
import initFirestore from './_lib/firebaseAdmin.js';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.REACT_APP_MERCADO_PAGO_ACCESS_TOKEN;

console.log('[MercadoPago Checkout] Inicializando cliente Mercado Pago...');

const client = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 5000 }
});

const payment = new Payment(client);

console.log('[MercadoPago Checkout] Cliente Mercado Pago inicializado com sucesso');

export default async function handler(req, res) {
  console.log('[MercadoPago Checkout] Iniciando processamento', {
    method: req.method,
    headers: Object.keys(req.headers),
    body: req.body
  });

  console.log('[MercadoPago Checkout] Environment check:', {
    hasAccessToken: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    accessTokenLength: process.env.MERCADO_PAGO_ACCESS_TOKEN?.length,
    hasWebhookSecret: !!process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    webhookSecretLength: process.env.MERCADO_PAGO_WEBHOOK_SECRET?.length,
    nodeEnv: process.env.NODE_ENV
  });

  if (!accessToken) {
    console.error('[MercadoPago Checkout] Access token não configurado');
    return res.status(500).json({ error: 'Configuração do Mercado Pago não encontrada' });
  }

  console.log('[MercadoPago Checkout] Mercado Pago configurado com sucesso');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {
    console.log('[MercadoPago Checkout] GET request - retornando status');
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        hasAccessToken: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
        accessTokenPrefix: process.env.MERCADO_PAGO_ACCESS_TOKEN?.substring(0, 10) + '...',
        hasWebhookSecret: !!process.env.MERCADO_PAGO_WEBHOOK_SECRET,
        webhookSecretPrefix: process.env.MERCADO_PAGO_WEBHOOK_SECRET?.substring(0, 10) + '...',
        hasFirebaseSA: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { valor, metodoPagamento, packageData, reservaData, cardToken, installments, payerData } = req.body;

    console.log('[MercadoPago Checkout] Dados recebidos:', {
      valor,
      metodoPagamento,
      packageData,
      reservaData,
      hasCardToken: !!cardToken,
      installments
    });

    if (!valor || !metodoPagamento) {
      console.error('[MercadoPago Checkout] Dados obrigatórios faltando');
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    const valorFinal = metodoPagamento === 'pix' ? Math.round((valor * 0.95) * 100) / 100 : Math.round(valor * 100) / 100;
    console.log('[MercadoPago Checkout] Valor calculado:', { valorOriginal: valor, valorFinal });

    if (!valorFinal || valorFinal <= 0) {
      console.error('[MercadoPago Checkout] Valor inválido');
      return res.status(400).json({ error: 'Valor inválido' });
    }
    if (metodoPagamento === 'pix') {
      console.log('[MercadoPago Checkout] Processando pagamento Pix');

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

      const order = {
        serviceId: packageData?.serviceId || null,
        providerId: packageData?.providerId || null,
        totalAmount: valor,
        commissionPercent: 0.05, // 5% de comissão
        commissionAmount: valor * 0.05,
        providerAmount: valor * 0.95,
        status: 'pending',
        paymentMethod: 'pix',
        createdAt: new Date().toISOString(),
        mercadopagoPaymentId: null, // Será atualizado após criação do pagamento
        customerName,
        customerEmail,
        customerCPF,
        customerPhone
      };

      console.log('[MercadoPago Checkout] Criando pedido no Firestore:', order);
      await orderRef.set(order);

      const paymentData = {
        transaction_amount: valorFinal,
        description: `Pagamento Pix - ${packageData?.title || 'Produto'}`,
        payment_method_id: 'pix',
        payer: {
          email: customerEmail,
          first_name: customerName.split(' ')[0] || 'Cliente',
          last_name: customerName.split(' ').slice(1).join(' ') || 'Test',
          identification: {
            type: 'CPF',
            number: customerCPF.replace(/\D/g, '') // Remove caracteres não numéricos
          },
          phone: customerPhone ? {
            area_code: customerPhone.replace(/\D/g, '').substring(0, 2),
            number: customerPhone.replace(/\D/g, '').substring(2)
          } : undefined
        },
        notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL || '',
        metadata: {
          orderId: orderRef.id,
          customerData: JSON.stringify(reservaData),
          packageData: JSON.stringify(packageData),
          metodo_pagamento: metodoPagamento,
          valor_original: valor,
          valor_final: valorFinal
        }
      };

      console.log('[MercadoPago Checkout] Criando pagamento no Mercado Pago:', paymentData);
      const result = await payment.create({ body: paymentData });
      console.log('[MercadoPago Checkout] Pagamento criado:', result);

      // Atualizar pedido com o paymentId
      await orderRef.update({
        mercadopagoPaymentId: result.id
      });

      return res.status(200).json({
        success: true,
        payment_id: result.id,
        orderId: orderRef.id,
        status: result.status,
        qrCode: result.point_of_interaction?.transaction_data?.qr_code || '',
        qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url || '',
        expiration_date: result.date_of_expiration
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

      const order = {
        serviceId: packageData?.serviceId || null,
        providerId: packageData?.providerId || null,
        totalAmount: valor,
        commissionPercent: 0.05, // 5% de comissão
        commissionAmount: valor * 0.05,
        providerAmount: valor * 0.95,
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

      const paymentData = {
        transaction_amount: valorFinal,
        token: cardToken,
        description: `Pagamento Cartão - ${packageData?.title || 'Produto'}`,
        installments: parseInt(installments) || 1,
        payment_method_id: 'visa', // Mercado Pago detectará automaticamente
        payer: {
          email: customerEmail,
          first_name: customerName.split(' ')[0] || 'Cliente',
          last_name: customerName.split(' ').slice(1).join(' ') || 'Test',
          identification: {
            type: 'CPF',
            number: customerCPF.replace(/\D/g, '') // Remove caracteres não numéricos
          },
          phone: customerPhone ? {
            area_code: customerPhone.replace(/\D/g, '').substring(0, 2),
            number: customerPhone.replace(/\D/g, '').substring(2)
          } : undefined
        },
        notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL || '',
        metadata: {
          orderId: orderRef.id,
          customerData: JSON.stringify(reservaData),
          packageData: JSON.stringify(packageData),
          metodo_pagamento: metodoPagamento,
          valor_original: valor,
          valor_final: valorFinal,
          installments: installments
        }
      };

      console.log('[MercadoPago Checkout] Criando pagamento com cartão no Mercado Pago:', paymentData);
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
