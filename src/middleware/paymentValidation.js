// Validações específicas para pagamentos PIX
// src/middleware/paymentValidation.js

import { securityMiddleware } from './security.js';
import crypto from 'crypto';

export class PaymentValidation {
  constructor() {
    this.maxPaymentAmount = 50000; // R$ 50.000
    this.minPaymentAmount = 1;     // R$ 1,00
  }

  // Schema de validação para checkout PIX
  getPixCheckoutSchema() {
    return {
      valor: {
        type: 'number',
        required: true,
        min: this.minPaymentAmount,
        max: this.maxPaymentAmount
      },
      metodoPagamento: {
        type: 'enum',
        required: true,
        values: ['pix']
      },
      packageData: {
        type: 'object',
        required: true,
        schema: {
          serviceId: { type: 'string', required: true, maxLength: 50 },
          providerId: { type: 'string', required: true, maxLength: 50 },
          title: { type: 'string', required: true, maxLength: 200 }
        }
      },
      reservaData: {
        type: 'object',
        required: true,
        schema: {
          customerName: {
            type: 'string',
            required: true,
            minLength: 2,
            maxLength: 100,
            pattern: /^[a-zA-ZÀ-ÿ\s]+$/
          },
          customerEmail: {
            type: 'email',
            required: true,
            maxLength: 254
          },
          customerCPF: {
            type: 'cpf',
            required: true
          },
          customerPhone: {
            type: 'string',
            required: false,
            maxLength: 20,
            pattern: /^\+?[\d\s\-\(\)]+$/
          }
        }
      }
    };
  }

  // Schema de validação para webhooks
  getWebhookSchema() {
    return {
      event: {
        type: 'enum',
        required: true,
        values: ['billing.paid', 'billing.expired', 'billing.cancelled', 'billing.created']
      },
      data: {
        type: 'object',
        required: true,
        schema: {
          billing: {
            type: 'object',
            required: true,
            schema: {
              id: { type: 'string', required: true, maxLength: 100 },
              amount: { type: 'number', required: true, min: 1, max: this.maxPaymentAmount },
              status: { type: 'enum', required: true, values: ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'] },
              metadata: {
                type: 'object',
                required: false,
                schema: {
                  orderId: { type: 'string', required: true, maxLength: 50 }
                }
              }
            }
          }
        }
      }
    };
  }

  // Validação completa de checkout PIX
  validatePixCheckout(data, clientIP) {
    const schema = this.getPixCheckoutSchema();
    const validationErrors = securityMiddleware.validatePaymentData(data);

    if (validationErrors.length > 0) {
      securityMiddleware.secureLog('warn', 'Validação de checkout PIX falhou', {
        ip: clientIP,
        errors: validationErrors,
        data: data
      });
      return {
        valid: false,
        errors: validationErrors,
        sanitized: null
      };
    }

    // 🔒 Sanitização dos dados
    const sanitized = this.sanitizePaymentData(data);

    // Validações adicionais de negócio
    const businessErrors = this.validateBusinessRules(sanitized);

    if (businessErrors.length > 0) {
      return {
        valid: false,
        errors: businessErrors,
        sanitized: sanitized
      };
    }

    return {
      valid: true,
      errors: [],
      sanitized: sanitized
    };
  }

  // Validação de webhook
  validateWebhook(data, signature, clientIP) {
    // Verificar assinatura primeiro
    if (!this.verifyWebhookSignature(data, signature)) {
      securityMiddleware.secureLog('error', 'Assinatura de webhook inválida', {
        ip: clientIP,
        signature: signature ? '[PRESENT]' : '[MISSING]'
      });
      return { valid: false, errors: ['Assinatura inválida'] };
    }

    const schema = this.getWebhookSchema();
    const validation = securityMiddleware.validateAndSanitizeInput(data, schema);

    if (!validation.valid) {
      securityMiddleware.secureLog('warn', 'Validação de webhook falhou', {
        ip: clientIP,
        errors: validation.errors
      });
    }

    return validation;
  }

  // Regras de negócio específicas
  validateBusinessRules(data) {
    const errors = [];

    // Verificar se o valor está dentro dos limites
    if (data.valor > this.maxPaymentAmount) {
      errors.push(`Valor máximo permitido: R$ ${this.maxPaymentAmount}`);
    }

    if (data.valor < this.minPaymentAmount) {
      errors.push(`Valor mínimo permitido: R$ ${this.minPaymentAmount}`);
    }

    // Verificar se o serviço existe (simulação - em produção consultar banco)
    if (!data.packageData.serviceId) {
      errors.push('Serviço não encontrado');
    }

    // Verificar se o prestador existe
    if (!data.packageData.providerId) {
      errors.push('Prestador não encontrado');
    }

    // Verificar formato do telefone se fornecido
    if (data.reservaData.customerPhone) {
      const cleanPhone = data.reservaData.customerPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        errors.push('Telefone deve ter 10 ou 11 dígitos');
      }
    }

    return errors;
  }

  // Verificação de assinatura HMAC para webhooks
  verifyWebhookSignature(payload, signature) {
    try {
      const ABACATEPAY_PUBLIC_KEY = process.env.ABACATEPAY_PUBLIC_KEY;

      if (!ABACATEPAY_PUBLIC_KEY) {
        console.error('[PAYMENT VALIDATION] Chave pública do AbacatePay não configurada');
        return false;
      }

      const bodyBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
      const expectedSig = crypto
        .createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
        .update(bodyBuffer)
        .digest('base64');

      const A = Buffer.from(expectedSig);
      const B = Buffer.from(signature);

      return A.length === B.length && crypto.default.timingSafeEqual(A, B);
    } catch (error) {
      console.error('[PAYMENT VALIDATION] Erro na verificação de assinatura:', error);
      return false;
    }
  }

  // Sanitização específica para dados de pagamento
  sanitizePaymentData(data) {
    const sanitized = { ...data };

    // Sanitizar campos de texto
    if (sanitized.reservaData) {
      sanitized.reservaData.customerName = securityMiddleware.sanitizeString(
        sanitized.reservaData.customerName, 100
      );
      sanitized.reservaData.customerEmail = sanitized.reservaData.customerEmail.toLowerCase().trim();
    }

    if (sanitized.packageData) {
      sanitized.packageData.title = securityMiddleware.sanitizeString(
        sanitized.packageData.title, 200
      );
    }

    return sanitized;
  }

  // Verificação de idempotência para webhooks
  async checkIdempotency(webhookId, eventType) {
    // Em produção, implementar cache Redis ou banco para verificar
    // se o webhook já foi processado
    const cacheKey = `webhook:${eventType}:${webhookId}`;

    // Simulação - em produção usar Redis
    if (global.processedWebhooks?.has(cacheKey)) {
      return false; // Já processado
    }

    // Marcar como processado
    if (!global.processedWebhooks) {
      global.processedWebhooks = new Set();
    }
    global.processedWebhooks.add(cacheKey);

    // Expira após 24 horas
    setTimeout(() => {
      global.processedWebhooks?.delete(cacheKey);
    }, 24 * 60 * 60 * 1000);

    return true; // Novo webhook
  }
}

export const paymentValidation = new PaymentValidation();