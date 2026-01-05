// Handler seguro para checkout Mercado Pago/AbacatePay
// api/mercadopago-checkout.js

import { MercadoPagoConfig, Payment } from 'mercadopago';
import AbacatePay from 'abacatepay-nodejs-sdk';
import initFirestore from '.cjs';
import { withSecurity } from './_middleware/security.js';
import { securityMiddleware } from '../../src/middleware/security.js';

// Inicialização segura (sem logs de credenciais)
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const abacateApiKey = process.env.ABACATEPAY_API_KEY;

if (!accessToken) {
  throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
}

if (!abacateApiKey) {
  throw new Error('ABACATEPAY_API_KEY não configurado');
}

const client = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 5000, retries: 2 }
});

const payment = new Payment(client);
const abacate = AbacatePay.default(abacateApiKey);

async function handler(req, res) {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

  try {
    // Log seguro (sem dados sensíveis)
    securityMiddleware.secureLog('info', 'Checkout request initiated', {
      method: req.method,
      clientIP,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });

    // Validação de entrada
    const { valor, metodoPagamento, packageData, reservaData, cardToken, installments, payerData } = req.body;

    const validationErrors = securityMiddleware.validatePaymentData(req.body);
    if (validationErrors.length > 0) {
      securityMiddleware.secureLog('warn', 'Validation failed', {
        clientIP,
        errors: validationErrors
      });
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationErrors
      });
    }

    // Sanitização de dados
    const sanitizedData = {
      valor: securityMiddleware.sanitizeInput(valor),
      metodoPagamento: securityMiddleware.sanitizeInput(metodoPagamento),
      packageData: packageData ? {
        ...packageData,
        title: securityMiddleware.sanitizeInput(packageData.title),
        description: securityMiddleware.sanitizeInput(packageData.description)
      } : null,
      reservaData: reservaData ? {
        ...reservaData,
        customerName: securityMiddleware.sanitizeInput(reservaData.customerName),
        customerEmail: securityMiddleware.sanitizeInput(reservaData.customerEmail),
        customerCPF: reservaData.customerCPF.replace(/\D/g, ''), // Apenas números
        customerPhone: reservaData.customerPhone.replace(/\D/g, '') // Apenas números
      } : null
    };

    // Cálculo seguro de valores
    const valorFinal = metodoPagamento === 'pix'
      ? Math.round((valor * 0.95) * 100) / 100  // 95% para prestador
      : Math.round(valor * 100) / 100;         // 100% para cartão

    if (valorFinal <= 0 || valorFinal > 50000) {
      securityMiddleware.secureLog('warn', 'Invalid calculated amount', {
        clientIP,
        valorFinal
      });
      return res.status(400).json({ error: 'Valor calculado inválido' });
    }

    // Processamento PIX
    if (metodoPagamento === 'pix') {
      securityMiddleware.secureLog('info', 'Processing PIX payment', {
        clientIP,
        valorFinal
      });

      const db = initFirestore();

      // Criação segura do pedido
      const orderRef = db.collection('orders').doc();
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
        clientIP, // Para auditoria
        userAgent: req.headers['user-agent']?.substring(0, 200),
        abacatepayPixId: null,
        customerName: sanitizedData.reservaData.customerName,
        customerEmail: sanitizedData.reservaData.customerEmail,
        customerCPF: sanitizedData.reservaData.customerCPF,
        customerPhone: sanitizedData.reservaData.customerPhone
      };

      await orderRef.set(order);

      // Criação do QRCode PIX
      const pixData = {
        amount: Math.round(valorFinal * 100), // Em centavos
        description: `Pagamento PIX - ${sanitizedData.packageData?.title || 'Serviço'}`.substring(0, 100),
        metadata: {
          orderId: orderRef.id,
          timestamp: new Date().toISOString(),
          clientIP
        }
      };

      const pixResponse = await abacate.pixQrCode.create(pixData);

      if (!pixResponse?.data) {
        throw new Error('Falha ao gerar QRCode PIX');
      }

      // Atualização segura do pedido
      await orderRef.update({
        abacatepayPixId: pixResponse.data.id,
        updatedAt: new Date().toISOString()
      });

      securityMiddleware.secureLog('info', 'PIX payment created successfully', {
        orderId: orderRef.id,
        pixId: pixResponse.data.id,
        clientIP
      });

      return res.status(200).json({
        success: true,
        pix_id: pixResponse.data.id,
        orderId: orderRef.id,
        status: pixResponse.data.status,
        qrCode: pixResponse.data.brCode,
        qrCodeBase64: pixResponse.data.brCodeBase64,
        expiration_date: pixResponse.data.expiresAt,
        amount: pixResponse.data.amount,
        description: pixResponse.data.description
      });
    }

    // Processamento Cartão (Mercado Pago)
    if (metodoPagamento === 'cartao') {
      if (!cardToken) {
        return res.status(400).json({ error: 'Token do cartão obrigatório' });
      }

      securityMiddleware.secureLog('info', 'Processing card payment', {
        clientIP,
        installments: installments || 1
      });

      // Implementar lógica de cartão aqui...
      return res.status(200).json({
        success: true,
        message: 'Pagamento com cartão - implementar lógica'
      });
    }

    return res.status(400).json({ error: 'Método de pagamento não suportado' });

  } catch (error) {
    securityMiddleware.secureLog('error', 'Checkout error', {
      error: error.message,
      clientIP,
      stack: error.stack?.substring(0, 500)
    });

    // Não expor detalhes do erro em produção
    const errorMessage = process.env.NODE_ENV === 'development'
      ? error.message
      : 'Erro interno do servidor';

    return res.status(500).json({
      error: errorMessage,
      code: 'INTERNAL_ERROR'
    });
  }
}

export default withSecurity(handler);
