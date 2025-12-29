// Advanced Fraud Detection and Security Monitoring System
// Integrates with admin dashboard for real-time security insights

import initFirestore from './firebaseAdmin.js';
import { logSecurityEvent } from './securityMiddleware.js';
import { securityAlerts } from './securityAlerts.js';

// Fraud detection patterns and rules
const FRAUD_PATTERNS = {
  // High-risk indicators
  HIGH_RISK: {
    velocityChecks: {
      sameIpMultipleCards: 3,      // Same IP using different cards
      sameCardMultipleIps: 2,      // Same card from different IPs
      rapidRequests: 10,           // Requests per minute
      unusualAmount: 1000          // Amounts above R$ 1000
    },
    geographicAnomalies: {
      impossibleTravel: true,      // Same session from distant locations
      highRiskCountries: ['North Korea', 'Iran', 'Syria']
    },
    behavioralPatterns: {
      copyPasteFields: true,       // Likely bot behavior
      rapidFormFilling: 2000,      // Form completed too quickly (ms)
      suspiciousUserAgent: true
    }
  },

  // Risk scoring weights
  RISK_WEIGHTS: {
    velocityCheck: 25,
    geographicAnomaly: 30,
    behavioralPattern: 20,
    blacklistMatch: 50,
    amountAnomaly: 15,
    timeAnomaly: 10
  }
};

// Security event types for dashboard
const SECURITY_EVENTS = {
  FRAUD_ATTEMPT: 'fraud_attempt',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  INPUT_VALIDATION_FAIL: 'input_validation_fail',
  ORIGIN_VIOLATION: 'origin_violation',
  BRUTE_FORCE: 'brute_force_attempt',
  SQL_INJECTION: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt'
};

// Blacklist management
class SecurityBlacklist {
  constructor() {
    this.db = null;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async init() {
    if (!this.db) {
      this.db = initFirestore();
    }
  }

  async isBlacklisted(type, value) {
    await this.init();

    const cacheKey = `${type}:${value}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.isBlacklisted;
    }

    try {
      const doc = await this.db.collection('security_blacklist')
        .doc(`${type}_${value.replace(/[^a-zA-Z0-9]/g, '_')}`)
        .get();

      const isBlacklisted = doc.exists && doc.data().active;

      this.cache.set(cacheKey, {
        isBlacklisted,
        timestamp: Date.now()
      });

      return isBlacklisted;
    } catch (error) {
      console.error('[SecurityBlacklist] Error checking blacklist:', error);
      return false;
    }
  }

  async addToBlacklist(type, value, reason, severity = 'medium') {
    await this.init();

    const docId = `${type}_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const blacklistEntry = {
      type,
      value,
      reason,
      severity,
      addedAt: new Date().toISOString(),
      addedBy: 'system',
      active: true,
      hitCount: 0,
      lastHit: null
    };

    await this.db.collection('security_blacklist').doc(docId).set(blacklistEntry);

    // Clear cache
    this.cache.delete(`${type}:${value}`);

    logSecurityEvent('BLACKLIST_ADD', { type, value, reason, severity });
  }

  async recordHit(type, value) {
    await this.init();

    const docId = `${type}_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      await this.db.collection('security_blacklist').doc(docId).update({
        hitCount: admin.firestore.FieldValue.increment(1),
        lastHit: new Date().toISOString()
      });
    } catch (error) {
      // Document might not exist, ignore
    }
  }
}

// Fraud detection engine
class FraudDetectionEngine {
  constructor() {
    this.db = null;
    this.blacklist = new SecurityBlacklist();
  }

  async init() {
    if (!this.db) {
      this.db = initFirestore();
    }
    await this.blacklist.init();
  }

  // Calculate risk score for a payment attempt
  async calculateRiskScore(paymentData, requestContext) {
    await this.init();

    let riskScore = 0;
    const riskFactors = [];

    const { amount, cardLast4, ip, userAgent, timestamp } = paymentData;

    // 1. Velocity checks
    const velocityRisk = await this.checkVelocityRisks(ip, cardLast4, amount);
    riskScore += velocityRisk.score;
    riskFactors.push(...velocityRisk.factors);

    // 2. Geographic anomalies
    const geoRisk = await this.checkGeographicRisks(ip, requestContext);
    riskScore += geoRisk.score;
    riskFactors.push(...geoRisk.factors);

    // 3. Behavioral patterns
    const behaviorRisk = this.checkBehavioralRisks(requestContext, userAgent);
    riskScore += behaviorRisk.score;
    riskFactors.push(...behaviorRisk.factors);

    // 4. Amount anomalies
    const amountRisk = this.checkAmountAnomalies(amount);
    riskScore += amountRisk.score;
    riskFactors.push(...amountRisk.factors);

    // 5. Blacklist checks
    const blacklistRisk = await this.checkBlacklistRisks(ip, cardLast4, userAgent);
    riskScore += blacklistRisk.score;
    riskFactors.push(...blacklistRisk.factors);

    // 6. Time-based anomalies
    const timeRisk = this.checkTimeAnomalies(timestamp);
    riskScore += timeRisk.score;
    riskFactors.push(...timeRisk.factors);

    return {
      score: Math.min(riskScore, 100), // Cap at 100
      level: this.getRiskLevel(riskScore),
      factors: riskFactors,
      recommendedAction: this.getRecommendedAction(riskScore)
    };
  }

  async checkVelocityRisks(ip, cardLast4, amount) {
    let score = 0;
    const factors = [];

    try {
      // Check recent payments from same IP
      const recentFromIp = await this.db.collection('orders')
        .where('ip', '==', ip)
        .where('createdAt', '>', new Date(Date.now() - 3600000)) // Last hour
        .limit(10)
        .get();

      if (recentFromIp.size >= 5) {
        score += FRAUD_PATTERNS.RISK_WEIGHTS.velocityCheck;
        factors.push('High velocity from same IP');
      }

      // Check unusual amounts
      if (amount > FRAUD_PATTERNS.HIGH_RISK.velocityChecks.unusualAmount) {
        score += FRAUD_PATTERNS.RISK_WEIGHTS.amountAnomaly;
        factors.push('Unusual payment amount');
      }

    } catch (error) {
      console.error('[FraudDetection] Velocity check error:', error);
    }

    return { score, factors };
  }

  async checkGeographicRisks(ip, context) {
    let score = 0;
    const factors = [];

    // This would integrate with a GeoIP service
    // For now, we'll check for obvious anomalies
    if (context?.country && FRAUD_PATTERNS.HIGH_RISK.geographicAnomalies.highRiskCountries.includes(context.country)) {
      score += FRAUD_PATTERNS.RISK_WEIGHTS.geographicAnomaly;
      factors.push(`High-risk country: ${context.country}`);
    }

    return { score, factors };
  }

  checkBehavioralRisks(context, userAgent) {
    let score = 0;
    const factors = [];

    // Check for suspicious user agents
    if (userAgent && (
      userAgent.includes('bot') ||
      userAgent.includes('crawler') ||
      userAgent.length < 20
    )) {
      score += FRAUD_PATTERNS.RISK_WEIGHTS.behavioralPattern;
      factors.push('Suspicious user agent');
    }

    // Check form completion time
    if (context?.formCompletionTime && context.formCompletionTime < FRAUD_PATTERNS.HIGH_RISK.behavioralPatterns.rapidFormFilling) {
      score += FRAUD_PATTERNS.RISK_WEIGHTS.behavioralPattern;
      factors.push('Form completed too quickly');
    }

    return { score, factors };
  }

  checkAmountAnomalies(amount) {
    let score = 0;
    const factors = [];

    // Round amounts are suspicious
    if (amount % 100 === 0 && amount > 500) {
      score += FRAUD_PATTERNS.RISK_WEIGHTS.amountAnomaly;
      factors.push('Round amount anomaly');
    }

    return { score, factors };
  }

  async checkBlacklistRisks(ip, cardLast4, userAgent) {
    let score = 0;
    const factors = [];

    // Check IP blacklist
    if (await this.blacklist.isBlacklisted('ip', ip)) {
      score += FRAUD_PATTERNS.RISK_WEIGHTS.blacklistMatch;
      factors.push('IP in blacklist');
      await this.blacklist.recordHit('ip', ip);
    }

    // Check card blacklist
    if (cardLast4 && await this.blacklist.isBlacklisted('card', cardLast4)) {
      score += FRAUD_PATTERNS.RISK_WEIGHTS.blacklistMatch;
      factors.push('Card in blacklist');
      await this.blacklist.recordHit('card', cardLast4);
    }

    return { score, factors };
  }

  checkTimeAnomalies(timestamp) {
    let score = 0;
    const factors = [];

    const now = new Date();
    const paymentTime = new Date(timestamp);

    // Payments at unusual hours (2-6 AM)
    const hour = paymentTime.getHours();
    if (hour >= 2 && hour <= 6) {
      score += FRAUD_PATTERNS.RISK_WEIGHTS.timeAnomaly;
      factors.push('Unusual payment time');
    }

    return { score, factors };
  }

  getRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'minimal';
  }

  getRecommendedAction(score) {
    if (score >= 80) return 'block';
    if (score >= 60) return 'require_3ds';
    if (score >= 40) return 'flag_for_review';
    if (score >= 20) return 'monitor';
    return 'allow';
  }

  // Log security event to dashboard
  async logSecurityEvent(eventType, details, riskAssessment = null) {
    await this.init();

    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      details,
      riskAssessment,
      processed: false
    };

    await this.db.collection('security_events').add(event);

    // Update dashboard counters
    await this.updateDashboardMetrics(eventType, riskAssessment);

    // 🔒 INTEGRAR COM SISTEMA DE ALERTAS
    await securityAlerts.processSecurityEvent(eventType, details, riskAssessment);

    logSecurityEvent('SECURITY_EVENT_LOGGED', {
      eventType,
      riskScore: riskAssessment?.score,
      riskLevel: riskAssessment?.level
    });
  }

  async updateDashboardMetrics(eventType, riskAssessment) {
    const today = new Date().toISOString().split('T')[0];

    try {
      const metricsRef = this.db.collection('security_metrics').doc(today);
      const metricsDoc = await metricsRef.get();

      const updateData = {};
      updateData[`events.${eventType}`] = admin.firestore.FieldValue.increment(1);

      if (riskAssessment) {
        updateData[`riskLevels.${riskAssessment.level}`] = admin.firestore.FieldValue.increment(1);
        updateData.totalRiskScore = admin.firestore.FieldValue.increment(riskAssessment.score);
      }

      if (metricsDoc.exists) {
        await metricsRef.update(updateData);
      } else {
        await metricsRef.set({
          date: today,
          events: { [eventType]: 1 },
          riskLevels: riskAssessment ? { [riskAssessment.level]: 1 } : {},
          totalRiskScore: riskAssessment?.score || 0,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[SecurityMetrics] Error updating metrics:', error);
    }
  }
}

// Export singleton instance
export const fraudDetection = new FraudDetectionEngine();
export const securityBlacklist = new SecurityBlacklist();