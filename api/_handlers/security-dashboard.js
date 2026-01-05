// Security Dashboard API - For Admin Real-time Monitoring
// Provides comprehensive security metrics and alerts

import initFirestore from '.cjs';
import { setSecurityHeaders, setCorsHeaders, getClientIP } from '../_lib/security.js';

async function securityDashboardHandler(req, res) {
  // Apply security headers
  setSecurityHeaders(res);
  setCorsHeaders(req, res);
  
  // Only allow GET requests for dashboard data
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = initFirestore();

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get security metrics for today
    const todayMetricsRef = db.collection('security_metrics').doc(today);
    const todayMetricsDoc = await todayMetricsRef.get();
    const todayMetrics = todayMetricsDoc.exists ? todayMetricsDoc.data() : {};

    // Get recent security logs (last 24h) - usando security_logs que é onde salvamos
    let recentEvents = [];
    try {
      const recentEventsQuery = db.collection('security_logs')
        .where('createdAt', '>=', last24h.toISOString())
        .orderBy('createdAt', 'desc')
        .limit(100);

      const recentEventsSnapshot = await recentEventsQuery.get();
      recentEvents = recentEventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (indexError) {
      // Se não tiver índice, buscar sem filtro de data
      console.warn('[SecurityDashboard] Index não disponível, buscando sem filtro de data');
      const fallbackQuery = db.collection('security_logs')
        .orderBy('createdAt', 'desc')
        .limit(100);
      const fallbackSnapshot = await fallbackQuery.get();
      recentEvents = fallbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    // Get active blacklist entries
    let activeBlacklist = [];
    try {
      const blacklistQuery = db.collection('security_blacklist')
        .where('active', '==', true)
        .limit(50);

      const blacklistSnapshot = await blacklistQuery.get();
      activeBlacklist = blacklistSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (e) {
      console.warn('[SecurityDashboard] Blacklist não disponível');
    }

    // Get high-risk orders (last 7 days)
    const highRiskOrdersQuery = db.collection('orders')
      .where('createdAt', '>=', last7d.toISOString())
      .where('security.riskLevel', 'in', ['high', 'critical'])
      .orderBy('createdAt', 'desc')
      .limit(20);

    const highRiskOrdersSnapshot = await highRiskOrdersQuery.get();
    const highRiskOrders = highRiskOrdersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate real-time statistics
    const stats24h = {
      totalEvents: recentEvents.length,
      blockedPayments: recentEvents.filter(e => e.type === 'PAYMENT_ATTEMPT' && e.riskAssessment?.recommendedAction === 'block').length,
      suspiciousActivities: recentEvents.filter(e => e.type === 'SUSPICIOUS_ACTIVITY').length,
      rateLimitHits: recentEvents.filter(e => e.type === 'RATE_LIMIT_HIT').length,
      fraudAttempts: recentEvents.filter(e => e.type === 'FRAUD_ATTEMPT').length,
      inputValidationFails: recentEvents.filter(e => e.type === 'INPUT_VALIDATION_FAIL').length,
      originViolations: recentEvents.filter(e => e.type === 'ORIGIN_VIOLATION').length
    };

    // Risk level distribution
    const riskDistribution = {
      critical: recentEvents.filter(e => e.riskAssessment?.level === 'critical').length,
      high: recentEvents.filter(e => e.riskAssessment?.level === 'high').length,
      medium: recentEvents.filter(e => e.riskAssessment?.level === 'medium').length,
      low: recentEvents.filter(e => e.riskAssessment?.level === 'low').length,
      minimal: recentEvents.filter(e => e.riskAssessment?.level === 'minimal').length
    };

    // Top attack sources (IPs)
    const ipCounts = {};
    recentEvents.forEach(event => {
      if (event.details?.ip) {
        ipCounts[event.details.ip] = (ipCounts[event.details.ip] || 0) + 1;
      }
    });

    const topAttackSources = Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // System health indicators
    const systemHealth = {
      blacklistSize: activeBlacklist.length,
      highRiskOrdersCount: highRiskOrders.length,
      averageRiskScore: recentEvents
        .filter(e => e.riskAssessment?.score)
        .reduce((sum, e) => sum + e.riskAssessment.score, 0) /
        Math.max(recentEvents.filter(e => e.riskAssessment?.score).length, 1),
      lastSecurityEvent: recentEvents.length > 0 ? recentEvents[0].timestamp : null
    };

    // Security alerts (critical issues requiring attention)
    const alerts = [];

    if (stats24h.blockedPayments > 5) {
      alerts.push({
        level: 'critical',
        message: `${stats24h.blockedPayments} pagamentos bloqueados nas últimas 24h`,
        action: 'Revisar tentativas de fraude'
      });
    }

    if (riskDistribution.critical > 0) {
      alerts.push({
        level: 'critical',
        message: `${riskDistribution.critical} eventos de risco crítico detectados`,
        action: 'Investigação imediata necessária'
      });
    }

    if (stats24h.rateLimitHits > 20) {
      alerts.push({
        level: 'warning',
        message: `${stats24h.rateLimitHits} violações de rate limit`,
        action: 'Possível ataque de força bruta'
      });
    }

    if (activeBlacklist.length > 100) {
      alerts.push({
        level: 'info',
        message: `${activeBlacklist.length} entradas na blacklist ativa`,
        action: 'Monitorar crescimento da blacklist'
      });
    }

    // Response
    const dashboardData = {
      timestamp: now.toISOString(),
      period: {
        today,
        last24h: last24h.toISOString(),
        last7d: last7d.toISOString()
      },
      summary: {
        ...stats24h,
        riskDistribution,
        systemHealth
      },
      alerts,
      topAttackSources,
      recentEvents: recentEvents.slice(0, 20), // Last 20 events
      activeBlacklist: activeBlacklist.slice(0, 10), // Top 10 blacklist entries
      highRiskOrders: highRiskOrders.slice(0, 5), // Top 5 high-risk orders
      todayMetrics
    };

    return res.status(200).json(dashboardData);

  } catch (error) {
    console.error('[SecurityDashboard] Error:', error);
    return res.status(500).json({
      error: 'Failed to load security dashboard',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Export handler diretamente (proteção de admin feita no frontend)
export default securityDashboardHandler;
