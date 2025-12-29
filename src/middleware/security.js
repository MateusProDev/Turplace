// Middleware de segurança para rate limiting
// src/middleware/security.js

import crypto from 'crypto';

class SecurityMiddleware {
  constructor() {
    this.requests = new Map();
    this.maxRequestsPerMinute = 10;
    this.maxRequestsPerHour = 100;
    this.suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\(/i,
      /alert\(/i,
      /document\./i,
      /window\./i,
      /location\./i,
      /cookie/i,
      /\bunion\b.*\bselect\b/i,
      /\bdrop\b.*\btable\b/i,
      /\bexec\b/i,
      /\bscript\b/i
    ];
  }

  // Rate limiting por IP
  checkRateLimit(ip, endpoint) {
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto

    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    const data = this.requests.get(key);

    if (now > data.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (data.count >= this.maxRequestsPerMinute) {
      return false;
    }

    data.count++;
    return true;
  }

  // Sanitização de entrada
  sanitizeInput(input) {
    if (typeof input === 'string') {
      // Remove caracteres de controle e scripts
      return input
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/on\w+\s*=\s*'[^']*'/gi, '')
        .trim();
    }
    return input;
  }

  // Validação de dados de pagamento
  validatePaymentData(data) {
    const errors = [];

    // Validação de valor
    if (!data.valor || typeof data.valor !== 'number' || data.valor <= 0 || data.valor > 50000) {
      errors.push('Valor inválido');
    }

    // Validação de método de pagamento
    if (!data.metodoPagamento || !['pix', 'cartao'].includes(data.metodoPagamento)) {
      errors.push('Método de pagamento inválido');
    }

    // Validação de dados do cliente
    if (!data.reservaData?.customerName || data.reservaData.customerName.length < 2) {
      errors.push('Nome do cliente inválido');
    }

    if (!data.reservaData?.customerEmail || !this.isValidEmail(data.reservaData.customerEmail)) {
      errors.push('Email inválido');
    }

    if (!data.reservaData?.customerCPF || !this.isValidCPF(data.reservaData.customerCPF)) {
      errors.push('CPF inválido');
    }

    return errors;
  }

  // Validação de email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Validação básica de CPF
  isValidCPF(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11 && /^\d{11}$/.test(cleanCPF);
  }

  // Detecção de padrões suspeitos
  detectSuspiciousActivity(data) {
    const dataString = JSON.stringify(data).toLowerCase();

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(dataString)) {
        return true;
      }
    }

    return false;
  }

  // Log seguro (sem dados sensíveis)
  secureLog(level, message, context = {}) {
    const safeContext = { ...context };

    // Remove dados sensíveis dos logs
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'authorization', 'cookie'];
    sensitiveFields.forEach(field => {
      if (safeContext[field]) {
        safeContext[field] = '[REDACTED]';
      }
    });

    console[level]('[SECURITY]', message, safeContext);
  }
}

export const securityMiddleware = new SecurityMiddleware();