// Security middleware for payment endpoints
// Implements comprehensive security measures against common attacks

import crypto from 'crypto';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Security configuration
const SECURITY_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 10,
  MAX_REQUESTS_PER_HOUR: 50,
  SUSPICIOUS_PATTERNS: [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /\b(eval|alert|confirm|prompt)\b/i,
    /base64,/i,
    /data:text/i
  ],
  ALLOWED_ORIGINS: [
    'https://turplace.turvia.com.br',
    'https://marketplace.turvia.com.br',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
};

// Generate request fingerprint for tracking
function generateRequestFingerprint(req) {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.ip || req.connection.remoteAddress || 'unknown'
  ];

  return crypto.createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}

// Check for suspicious patterns in input
function containsSuspiciousPatterns(data, path = '') {
  if (!data) return false;

  // Check strings
  if (typeof data === 'string') {
    return SECURITY_CONFIG.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(data));
  }

  // Check objects recursively
  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (containsSuspiciousPatterns(value, `${path}.${key}`)) {
        return true;
      }
    }
  }

  return false;
}

// Validate and sanitize input data
function validateAndSanitizeInput(data) {
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields from logging
    if (['password', 'token', 'secret', 'key', 'stripe', 'card'].some(field =>
      key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Validate serviceId format (should be Firestore document ID)
    if (key === 'serviceId' && typeof value === 'string') {
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
        throw new Error(`Invalid serviceId format: ${key}`);
      }
    }

    // Validate URLs
    if (key.includes('Url') && typeof value === 'string') {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error(`Invalid URL protocol: ${key}`);
        }
      } catch {
        throw new Error(`Invalid URL format: ${key}`);
      }
    }

    // Check for suspicious patterns
    if (containsSuspiciousPatterns(value)) {
      throw new Error(`Suspicious content detected in: ${key}`);
    }

    sanitized[key] = value;
  }

  return sanitized;
}

// Rate limiting check
function checkRateLimit(req) {
  const fingerprint = generateRequestFingerprint(req);
  const now = Date.now();
  const windowMinute = Math.floor(now / 60000); // 1 minute window
  const windowHour = Math.floor(now / 3600000); // 1 hour window

  const keyMinute = `${fingerprint}:minute:${windowMinute}`;
  const keyHour = `${fingerprint}:hour:${windowHour}`;

  const requestsMinute = (rateLimitStore.get(keyMinute) || 0) + 1;
  const requestsHour = (rateLimitStore.get(keyHour) || 0) + 1;

  // Clean old entries (simple cleanup)
  if (rateLimitStore.size > 10000) {
    const cutoff = now - 3600000; // 1 hour ago
    for (const [key, timestamp] of rateLimitStore.entries()) {
      if (timestamp < cutoff) {
        rateLimitStore.delete(key);
      }
    }
  }

  // Check limits
  if (requestsMinute > SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    throw new Error('RATE_LIMIT_EXCEEDED_MINUTE');
  }

  if (requestsHour > SECURITY_CONFIG.MAX_REQUESTS_PER_HOUR) {
    throw new Error('RATE_LIMIT_EXCEEDED_HOUR');
  }

  // Update counters
  rateLimitStore.set(keyMinute, requestsMinute);
  rateLimitStore.set(keyHour, requestsHour);

  return { fingerprint, requestsMinute, requestsHour };
}

// Security headers middleware
function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

// Origin validation
function validateOrigin(req) {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return true; // Allow requests without origin (server-to-server)

  try {
    const originUrl = new URL(origin);
    return SECURITY_CONFIG.ALLOWED_ORIGINS.some(allowed =>
      allowed === origin || originUrl.hostname === 'localhost'
    );
  } catch {
    return false;
  }
}

// Log security events
function logSecurityEvent(type, details, req) {
  const timestamp = new Date().toISOString();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             req.connection?.remoteAddress ||
             'unknown';

  console.log(`[SECURITY:${type}]`, {
    timestamp,
    ip,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    fingerprint: generateRequestFingerprint(req),
    ...details
  });
}

// Main security middleware
export function securityMiddleware(handler) {
  return async (req, res) => {
    try {
      // Apply security headers
      applySecurityHeaders(res);

      // Validate origin
      if (!validateOrigin(req)) {
        logSecurityEvent('INVALID_ORIGIN', {
          origin: req.headers.origin,
          referer: req.headers.referer
        }, req);
        return res.status(403).json({ error: 'Origin not allowed' });
      }

      // Rate limiting
      let rateLimitInfo;
      try {
        rateLimitInfo = checkRateLimit(req);
      } catch (error) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          limit: error.message,
          ...rateLimitInfo
        }, req);
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: 60
        });
      }

      // Validate and sanitize input for POST requests
      if (req.method === 'POST' && req.body) {
        try {
          req.sanitizedBody = validateAndSanitizeInput(req.body);
        } catch (error) {
          logSecurityEvent('INPUT_VALIDATION_FAILED', {
            field: error.message,
            bodySize: JSON.stringify(req.body).length
          }, req);
          return res.status(400).json({ error: 'Invalid input data' });
        }
      }

      // Log successful security check
      if (req.method === 'POST') {
        logSecurityEvent('REQUEST_ALLOWED', {
          method: req.method,
          rateLimitMinute: rateLimitInfo.requestsMinute,
          rateLimitHour: rateLimitInfo.requestsHour
        }, req);
      }

      // Call the actual handler
      return await handler(req, res);

    } catch (error) {
      // Log unexpected errors
      logSecurityEvent('UNEXPECTED_ERROR', {
        error: error.message,
        stack: error.stack?.substring(0, 200)
      }, req);

      // Don't expose internal errors
      return res.status(500).json({
        error: 'Internal server error',
        requestId: crypto.randomUUID()
      });
    }
  };
}

// Export utilities for use in handlers
export {
  generateRequestFingerprint,
  containsSuspiciousPatterns,
  validateAndSanitizeInput,
  checkRateLimit,
  logSecurityEvent,
  SECURITY_CONFIG
};