// Módulo centralizado de segurança para APIs
// Inclui: Rate Limiting, Headers de Segurança, Validação de CPF, CORS, Monitoramento

// ============================================
// CONFIGURAÇÕES
// ============================================

// Domínios permitidos para CORS
export const ALLOWED_ORIGINS = [
  'https://lucrazi.com.br',
  'https://www.lucrazi.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

// Rate Limiting
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMITS = {
  default: 100,        // 100 req/min padrão
  checkout: 10,        // 10 checkouts/min por IP
  webhook: 200,        // 200 webhooks/min (pode ter burst)
  status: 120,         // 120 status checks/min
  auth: 5              // 5 tentativas de auth/min
};

// Storage de rate limiting (em memória - em produção usar Redis)
const rateLimitStore = new Map();

// Log de segurança (tentativas suspeitas)
const securityLogs = [];
const MAX_SECURITY_LOGS = 1000;

// ============================================
// HEADERS DE SEGURANÇA (Helmet-like)
// ============================================

export function setSecurityHeaders(res) {
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS Protection (legacy, mas ainda útil)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy para APIs
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  
  // Prevenir caching de dados sensíveis
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  
  // Strict Transport Security (HTTPS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// ============================================
// CORS SEGURO
// ============================================

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    // Em desenvolvimento, permitir qualquer origem
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  // Em produção, se origem não permitida, não seta header (bloqueado pelo browser)
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-signature, x-signature');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ============================================
// RATE LIMITING
// ============================================

export function checkRateLimit(ip, type = 'default') {
  const now = Date.now();
  const limit = RATE_LIMITS[type] || RATE_LIMITS.default;
  const key = `${ip}:${type}`;
  
  // Limpar entradas antigas periodicamente
  if (rateLimitStore.size > 10000) {
    cleanupRateLimitStore();
  }
  
  const record = rateLimitStore.get(key) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    record.count++;
  }
  
  rateLimitStore.set(key, record);
  
  const allowed = record.count <= limit;
  
  if (!allowed) {
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      ip,
      limitType: type,
      count: record.count,
      limit
    });
  }
  
  return {
    allowed,
    remaining: Math.max(0, limit - record.count),
    resetTime: record.resetTime,
    limit
  };
}

function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// ============================================
// VALIDAÇÃO DE CPF
// ============================================

export function validateCPF(cpf) {
  if (!cpf) return { valid: false, reason: 'CPF não fornecido' };
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica tamanho
  if (cleanCPF.length !== 11) {
    return { valid: false, reason: 'CPF deve ter 11 dígitos' };
  }
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1+$/.test(cleanCPF)) {
    return { valid: false, reason: 'CPF inválido - todos dígitos iguais' };
  }
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) {
    return { valid: false, reason: 'Primeiro dígito verificador inválido' };
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) {
    return { valid: false, reason: 'Segundo dígito verificador inválido' };
  }
  
  return { valid: true, cleanCPF };
}

// ============================================
// VALIDAÇÃO DE EMAIL
// ============================================

export function validateEmail(email) {
  if (!email) return { valid: false, reason: 'Email não fornecido' };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Formato de email inválido' };
  }
  
  if (email.length > 254) {
    return { valid: false, reason: 'Email muito longo' };
  }
  
  return { valid: true, email: email.toLowerCase().trim() };
}

// ============================================
// VALIDAÇÃO DE TELEFONE
// ============================================

export function validatePhone(phone) {
  if (!phone) return { valid: true, cleanPhone: '' }; // Telefone é opcional
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return { valid: false, reason: 'Telefone deve ter 10 ou 11 dígitos' };
  }
  
  return { valid: true, cleanPhone };
}

// ============================================
// SANITIZAÇÃO DE STRINGS
// ============================================

export function sanitizeString(str, maxLength = 255) {
  if (!str) return '';
  
  return String(str)
    .substring(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'&]/g, '') // Remove caracteres perigosos
    .trim();
}

// ============================================
// VALIDAÇÃO DE ORDER ID
// ============================================

export function validateOrderId(orderId) {
  if (!orderId || typeof orderId !== 'string') {
    return { valid: false, reason: 'orderId não fornecido' };
  }
  
  if (orderId.length < 10 || orderId.length > 30) {
    return { valid: false, reason: 'orderId com tamanho inválido' };
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(orderId)) {
    return { valid: false, reason: 'orderId contém caracteres inválidos' };
  }
  
  return { valid: true, orderId };
}

// ============================================
// LOG DE SEGURANÇA
// ============================================

export function logSecurityEvent(event) {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  securityLogs.push(logEntry);
  
  // Manter apenas os últimos N logs
  if (securityLogs.length > MAX_SECURITY_LOGS) {
    securityLogs.shift();
  }
  
  // Log no console para monitoramento
  console.warn('[SECURITY]', JSON.stringify(logEntry));
  
  return logEntry;
}

export function getSecurityLogs(limit = 100) {
  return securityLogs.slice(-limit);
}

// ============================================
// DETECÇÃO DE ATAQUES
// ============================================

export function detectSuspiciousActivity(req) {
  const suspiciousPatterns = [];
  const ip = getClientIP(req);
  
  // Verificar user-agent suspeito
  const userAgent = req.headers['user-agent'] || '';
  if (!userAgent || userAgent.length < 10) {
    suspiciousPatterns.push('missing_or_short_user_agent');
  }
  
  // Verificar SQL Injection patterns no body
  const bodyStr = JSON.stringify(req.body || {});
  const sqlPatterns = /('|"|;|--|\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bDELETE\b)/i;
  if (sqlPatterns.test(bodyStr)) {
    suspiciousPatterns.push('possible_sql_injection');
  }
  
  // Verificar XSS patterns
  const xssPatterns = /<script|javascript:|on\w+\s*=/i;
  if (xssPatterns.test(bodyStr)) {
    suspiciousPatterns.push('possible_xss');
  }
  
  if (suspiciousPatterns.length > 0) {
    logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      ip,
      patterns: suspiciousPatterns,
      userAgent: userAgent.substring(0, 100),
      path: req.url
    });
  }
  
  return suspiciousPatterns;
}

// ============================================
// UTILITÁRIOS
// ============================================

export function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

// Middleware completo de segurança
export function applySecurityMiddleware(req, res, type = 'default') {
  const ip = getClientIP(req);
  
  // 1. Headers de segurança
  setSecurityHeaders(res);
  
  // 2. CORS
  setCorsHeaders(req, res);
  
  // 3. Rate limiting
  const rateLimit = checkRateLimit(ip, type);
  res.setHeader('X-RateLimit-Limit', rateLimit.limit);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', rateLimit.resetTime);
  
  if (!rateLimit.allowed) {
    return { blocked: true, reason: 'rate_limit', status: 429 };
  }
  
  // 4. Detectar atividade suspeita
  const suspicious = detectSuspiciousActivity(req);
  if (suspicious.length > 2) {
    // Muitos padrões suspeitos - bloquear
    return { blocked: true, reason: 'suspicious_activity', status: 403 };
  }
  
  return { blocked: false, ip };
}

export default {
  ALLOWED_ORIGINS,
  setSecurityHeaders,
  setCorsHeaders,
  checkRateLimit,
  validateCPF,
  validateEmail,
  validatePhone,
  sanitizeString,
  validateOrderId,
  logSecurityEvent,
  getSecurityLogs,
  detectSuspiciousActivity,
  getClientIP,
  applySecurityMiddleware
};
