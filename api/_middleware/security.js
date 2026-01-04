// Middleware de segurança para APIs Vercel
// api/_middleware/security.js

import { securityMiddleware } from '../../src/middleware/security.js';

export function withSecurity(handler) {
  return async (req, res) => {
    try {
      // 1. Rate Limiting
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
      const endpoint = req.url;

      if (!securityMiddleware.checkRateLimit(clientIP, endpoint)) {
        securityMiddleware.secureLog('warn', 'Rate limit exceeded', { clientIP, endpoint });
        return res.status(429).json({
          error: 'Muitas requisições. Tente novamente em alguns minutos.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      // 2. Validação de método HTTP
      if (!['GET', 'POST', 'OPTIONS'].includes(req.method)) {
        securityMiddleware.secureLog('warn', 'Invalid HTTP method', { method: req.method, clientIP });
        return res.status(405).json({ error: 'Método não permitido' });
      }

      // 3. Headers de segurança
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");

      // 4. CORS restritivo (apenas origens permitidas)
      const allowedOrigins = [
        'http://localhost:5173', // Desenvolvimento
        'http://localhost:3000', // Desenvolvimento
        'https://lucrazi.com.br' // Produção
      ];

      const origin = req.headers.origin;
      const referer = req.headers.referer;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (!origin && referer && referer.startsWith('https://lucrazi.com.br')) {
        res.setHeader('Access-Control-Allow-Origin', 'https://lucrazi.com.br');
      } else if (process.env.NODE_ENV === 'development') {
        res.setHeader('Access-Control-Allow-Origin', '*'); // Apenas para desenvolvimento
      }

      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas

      // 5. Handle OPTIONS
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // 6. Validação de Content-Type
      if (req.method === 'POST' && req.headers['content-type'] !== 'application/json') {
        securityMiddleware.secureLog('warn', 'Invalid content type', {
          contentType: req.headers['content-type'],
          clientIP
        });
        return res.status(400).json({ error: 'Content-Type deve ser application/json' });
      }

      // 7. Limitação de tamanho do body
      if (req.body && JSON.stringify(req.body).length > 10240) { // 10KB
        securityMiddleware.secureLog('warn', 'Request body too large', { clientIP, size: JSON.stringify(req.body).length });
        return res.status(413).json({ error: 'Payload muito grande' });
      }

      // 8. Detecção de atividade suspeita
      if (req.body && securityMiddleware.detectSuspiciousActivity(req.body)) {
        securityMiddleware.secureLog('error', 'Suspicious activity detected', { clientIP, endpoint });
        return res.status(400).json({ error: 'Requisição inválida' });
      }

      // Continua para o handler original
      return handler(req, res);

    } catch (error) {
      securityMiddleware.secureLog('error', 'Security middleware error', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}