// Endpoint para checkout Mercado Pago (cartão e Pix)
// Caminho sugerido: api/mercadopago-checkout.js

import { MercadoPagoConfig, Payment } from 'mercadopago';
import initFirestore from '../_lib/firebaseAdmin.js';
import { 
  applySecurityMiddleware, 
  validateCPF, 
  validateEmail, 
  validatePhone,
  sanitizeString,
  logSecurityEvent,
  getClientIP
} from '../_lib/security.js';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.REACT_APP_MERCADO_PAGO_ACCESS_TOKEN;
const abacateApiKey = process.env.ABACATEPAY_API_KEY;

console.log('[MercadoPago Checkout] Inicializando cliente Mercado Pago...');

const client = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 5000 }
});

const payment = new Payment(client);

console.log('[MercadoPago Checkout] Cliente Mercado Pago inicializado com sucesso');

// Função para criar PIX via API direta do AbacatePay
async function createAbacatePayPix(pixData) {
  const response = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${abacateApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(pixData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AbacatePay error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Validação de valor
const MIN_AMOUNT = 1; // R$ 1,00 mínimo
const MAX_AMOUNT = 50000; // R$ 50.000,00 máximo

export default async function handler(req, res) {
  // Aplicar middleware de segurança completo
  const securityCheck = applySecurityMiddleware(req, res, 'checkout');
  
  if (securityCheck.blocked) {
    return res.status(securityCheck.status).json({ 
      error: securityCheck.reason === 'rate_limit' 
        ? 'Muitas requisições. Aguarde um momento.' 
        : 'Acesso bloqueado por motivos de segurança.'
    });
  }

  const clientIP = securityCheck.ip;

  // Log seguro (sem dados sensíveis)
  console.log('[MercadoPago Checkout] Requisição recebida', {
    method: req.method,
    ip: clientIP,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    timestamp: new Date().toISOString()
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
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

    // Validação de valor
    const valorNumerico = Number(valor);
    if (isNaN(valorNumerico) || valorNumerico < MIN_AMOUNT || valorNumerico > MAX_AMOUNT) {
      logSecurityEvent({ type: 'INVALID_AMOUNT', ip: clientIP, valor });
      return res.status(400).json({ error: `Valor deve estar entre R$ ${MIN_AMOUNT} e R$ ${MAX_AMOUNT}` });
    }

    // Validação de método de pagamento
    if (!['pix', 'cartao'].includes(metodoPagamento)) {
      logSecurityEvent({ type: 'INVALID_PAYMENT_METHOD', ip: clientIP, metodoPagamento });
      return res.status(400).json({ error: 'Método de pagamento inválido' });
    }

    // Validação de email
    const emailValidation = validateEmail(reservaData?.customerEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.reason });
    }

    // Validação de CPF (se fornecido)
    const cpfInput = reservaData?.customerCPF || '';
    let cleanCPF = '';
    if (cpfInput) {
      const cpfValidation = validateCPF(cpfInput);
      if (!cpfValidation.valid) {
        logSecurityEvent({ type: 'INVALID_CPF', ip: clientIP });
        return res.status(400).json({ error: cpfValidation.reason });
      }
      cleanCPF = cpfValidation.cleanCPF;
    }

    // Validação de telefone
    const phoneValidation = validatePhone(reservaData?.customerPhone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.reason });
    }

    // Sanitizar nome
    const customerName = sanitizeString(reservaData?.customerName || 'Cliente', 100);

    console.log('[MercadoPago Checkout] Dados recebidos', {
      metodoPagamento,
      valor: valorNumerico,
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
      // Para PIX: taxa AbacatePay 1,99% + taxa fixa da plataforma R$0,80
      const PIX_PERCENT_FEE = 1.99; // AbacatePay
      const PIX_FIXED_FEE = 0.80; // Taxa fixa da plataforma
      
      const pixPercentAmount = valor * (PIX_PERCENT_FEE / 100);
      const totalPixFee = pixPercentAmount + PIX_FIXED_FEE;
      const providerAmount = valor - totalPixFee;

      const order = {
        serviceId: packageData?.serviceId || null,
        providerId: packageData?.providerId || null,
        totalAmount: valor,
        // Taxas PIX
        pixPercentFee: PIX_PERCENT_FEE,
        pixFixedFee: PIX_FIXED_FEE,
        commissionAmount: totalPixFee,
        providerAmount: providerAmount,
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
      
      let pixResponse;
      try {
        pixResponse = await createAbacatePayPix(pixData);
        console.log('[MercadoPago Checkout] QRCode PIX criado:', JSON.stringify(pixResponse, null, 2));
      } catch (abacateError) {
        console.error('[MercadoPago Checkout] Erro AbacatePay detalhado:', abacateError.message);
        throw new Error(`Erro AbacatePay: ${abacateError.message || 'Erro desconhecido'}`);
      }

      if (!pixResponse || !pixResponse.data) {
        console.error('[MercadoPago Checkout] Resposta inválida:', pixResponse);
        throw new Error('Erro ao criar QRCode PIX no AbacatePay - resposta inválida');
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
      console.log('[MercadoPago Checkout] Processando pagamento com cartão (SPLIT)');

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

      // 🔥 SPLIT: Buscar dados do provider para split de pagamento
      let providerData = null;
      let commissionPercent = 9; // Default para free
      
      if (packageData?.providerId) {
        try {
          const providerDoc = await db.collection('users').doc(packageData.providerId).get();
          providerData = providerDoc.data();
          const planId = providerData?.planId || 'free';
          const commissions = {
            free: 9,
            professional: 7,
            premium: 6
          };
          commissionPercent = commissions[planId] || 9;
          console.log('[MercadoPago Checkout] Provider encontrado:', {
            mpConnected: providerData?.mpConnected,
            mpUserId: providerData?.mpUserId,
            planId,
            commissionPercent
          });
        } catch (error) {
          console.warn('[MercadoPago Checkout] Erro ao buscar provider:', error);
        }
      }

      // Calcular valores do split
      const marketplaceFee = Math.round(valor * (commissionPercent / 100) * 100) / 100; // Taxa da plataforma
      const providerAmount = valor - marketplaceFee;

      const order = {
        serviceId: packageData?.serviceId || null,
        providerId: packageData?.providerId || null,
        totalAmount: valor,
        commissionPercent: commissionPercent,
        commissionAmount: marketplaceFee,
        providerAmount: providerAmount,
        status: 'pending',
        paymentMethod: 'card',
        paymentType: providerData?.mpConnected ? 'split' : 'platform', // Indica tipo de pagamento
        createdAt: new Date().toISOString(),
        mercadopagoPaymentId: null,
        customerName,
        customerEmail,
        customerCPF,
        customerPhone
      };

      console.log('[MercadoPago Checkout] Criando pedido no Firestore para cartão:', order);
      await orderRef.set(order);

      // 🔗 URL do webhook
      const webhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL || 'https://lucrazi.com.br/api/mercadopago-webhook';
      
      // ✅ Validar CPF
      const cpfRaw = (payerData?.cpf || customerCPF).replace(/\D/g, '');
      const cpfValidated = cpfRaw.slice(0, 11);
      
      if (cpfValidated.length !== 11) {
        console.error('[MercadoPago Checkout] CPF inválido:', cpfValidated, 'length:', cpfValidated.length);
        return res.status(400).json({
          success: false,
          error: 'CPF inválido. Deve conter exatamente 11 dígitos.'
        });
      }

      // 🔥 DECISÃO: Usar Split ou Pagamento Normal
      let paymentResult;
      
      if (providerData?.mpConnected && providerData?.mpAccessToken) {
        // ✅ SPLIT DE PAGAMENTO - Prestador recebe direto na conta dele!
        console.log('[MercadoPago Checkout] 💰 Usando SPLIT - Prestador receberá direto na conta MP dele');
        
        // Criar cliente MP com token do PRESTADOR
        const providerClient = new MercadoPagoConfig({
          accessToken: providerData.mpAccessToken,
          options: { timeout: 5000 }
        });
        const providerPayment = new Payment(providerClient);
        
        // Payload com marketplace_fee (sua taxa)
        const splitPaymentData = {
          transaction_amount: valor,
          token: cardToken,
          description: `${packageData?.title || 'Produto'} - Lucrazi`,
          installments: parseInt(installments) || 1,
          payment_method_id: paymentMethodId || undefined,
          issuer_id: issuerId ? parseInt(issuerId) : undefined,
          binary_mode: false,
          capture: true,
          statement_descriptor: 'LUCRAZI',
          
          // 🔥 MARKETPLACE FEE - Sua taxa vai direto para sua conta!
          marketplace_fee: marketplaceFee,
          
          payer: {
            email: payerData?.email || customerEmail,
            first_name: payerData?.first_name || customerName.split(' ')[0] || 'Cliente',
            last_name: payerData?.last_name || customerName.split(' ').slice(1).join(' ') || 'Lucrazi',
            identification: {
              type: 'CPF',
              number: cpfValidated
            }
          },
          
          external_reference: orderRef.id,
          notification_url: webhookUrl,
          
          metadata: {
            order_id: orderRef.id,
            service_id: packageData?.serviceId || null,
            provider_id: packageData?.providerId || null,
            platform: 'Lucrazi Marketplace',
            payment_type: 'split',
            marketplace_fee: marketplaceFee
          }
        };

        // Remover campos undefined
        if (!splitPaymentData.payment_method_id) delete splitPaymentData.payment_method_id;
        if (!splitPaymentData.issuer_id) delete splitPaymentData.issuer_id;

        console.log('[MercadoPago Checkout] 🚀 Criando pagamento SPLIT:', JSON.stringify(splitPaymentData, null, 2));
        
        try {
          paymentResult = await providerPayment.create({ body: splitPaymentData });
          console.log('[MercadoPago Checkout] ✅ Pagamento SPLIT criado com sucesso!');
          
          // Atualizar order com info do split
          await orderRef.update({
            mercadopagoPaymentId: paymentResult.id,
            splitPayment: true,
            providerReceivedDirectly: true
          });
        } catch (splitError) {
          console.error('[MercadoPago Checkout] ❌ Erro no split, tentando pagamento normal:', splitError.message);
          // Fallback para pagamento normal se split falhar
          providerData.mpConnected = false; // Força usar pagamento normal
        }
      }
      
      // Pagamento normal (sem split) - fallback ou prestador não conectou MP
      if (!providerData?.mpConnected || !paymentResult) {
        console.log('[MercadoPago Checkout] 📦 Usando pagamento NORMAL (prestador sacará depois)');
        
        // 🎯 PAYLOAD NORMAL - Pagamento vai para conta da plataforma
        const paymentData = {
          transaction_amount: valor,
          token: cardToken,
          description: `${packageData?.title || 'Produto'} - Lucrazi`,
          installments: parseInt(installments) || 1,
          payment_method_id: paymentMethodId || undefined,
          issuer_id: issuerId ? parseInt(issuerId) : undefined,
          binary_mode: false,
          capture: true,
          statement_descriptor: 'LUCRAZI',
          
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
          
          external_reference: orderRef.id,
          notification_url: webhookUrl,
          
          additional_info: {
            items: [{
              id: packageData?.serviceId || orderRef.id,
              title: packageData?.title || 'Produto Digital',
              description: packageData?.description || `Compra na Lucrazi`,
              category_id: 'services',
              quantity: 1,
              unit_price: valor
            }],
            payer: {
              first_name: payerData?.first_name || customerName.split(' ')[0],
              last_name: payerData?.last_name || customerName.split(' ').slice(1).join(' ')
            }
          },
          
          metadata: {
            order_id: orderRef.id,
            service_id: packageData?.serviceId || null,
            provider_id: packageData?.providerId || null,
            platform: 'Lucrazi Marketplace',
            payment_type: 'normal'
          }
        };

        // Remover campos undefined
        if (!paymentData.payment_method_id) delete paymentData.payment_method_id;
        if (!paymentData.issuer_id) delete paymentData.issuer_id;

        console.log('[MercadoPago Checkout] Criando pagamento NORMAL:', JSON.stringify(paymentData, null, 2));
        paymentResult = await payment.create({ body: paymentData });
        console.log('[MercadoPago Checkout] ✅ Pagamento NORMAL criado:', paymentResult.id);

        // Atualizar order
        await orderRef.update({
          mercadopagoPaymentId: paymentResult.id,
          splitPayment: false,
          providerReceivedDirectly: false
        });
      }

      // Retornar resultado do pagamento (split ou normal)
      return res.status(200).json({
        success: true,
        payment_id: paymentResult.id,
        orderId: orderRef.id,
        status: paymentResult.status,
        status_detail: paymentResult.status_detail,
        payment_method_id: paymentResult.payment_method_id,
        installments: paymentResult.installments,
        transaction_amount: paymentResult.transaction_amount,
        date_created: paymentResult.date_created,
        split_payment: order.paymentType === 'split'
      });
    }
    return res.status(400).json({ error: 'Método de pagamento não suportado ou dados insuficientes.' });
  } catch (error) {
    console.error('[MercadoPago Checkout] Erro no processamento:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
