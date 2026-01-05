// Utilitários para gestão de planos
import type { LeadPageTemplate } from '../types/leadpage.js';
export interface PlanFeatures {
  maxServices: number;
  maxLeadPages: number;
  hasCustomDomain: boolean;
  hasAnalytics: boolean;
  hasPrioritySupport: boolean;
  commissionRate: number;
}

export interface PlanLimits {
  id: string;
  name: string;
  features: PlanFeatures;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    features: {
      maxServices: 10,
      maxLeadPages: 1,
      hasCustomDomain: false,
      hasAnalytics: false,
      hasPrioritySupport: false,
      commissionRate: 0.09 // 9%
    }
  },
  professional: {
    id: 'professional',
    name: 'Pro',
    features: {
      maxServices: 20,
      maxLeadPages: 3,
      hasCustomDomain: true,
      hasAnalytics: false,
      hasPrioritySupport: true,
      commissionRate: 0.07 // 7%
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    features: {
      maxServices: 100,
      maxLeadPages: 5,
      hasCustomDomain: true,
      hasAnalytics: true,
      hasPrioritySupport: true,
      commissionRate: 0.06 // 6%
    }
  }
};

export function getPlanLimits(planId: string): PlanLimits {
  return PLAN_LIMITS[planId] || PLAN_LIMITS.free;
}

export function canCreateService(userPlanId: string, currentServiceCount: number): boolean {
  const plan = getPlanLimits(userPlanId);
  return currentServiceCount < plan.features.maxServices;
}

export function canCreateLeadPage(userPlanId: string, currentLeadPageCount: number): boolean {
  const plan = getPlanLimits(userPlanId);
  return currentLeadPageCount < plan.features.maxLeadPages;
}

export function hasCustomDomainAccess(userPlanId: string): boolean {
  const plan = getPlanLimits(userPlanId);
  return plan.features.hasCustomDomain;
}

export function hasAnalyticsAccess(userPlanId: string): boolean {
  const plan = getPlanLimits(userPlanId);
  return plan.features.hasAnalytics;
}

export function hasPrioritySupport(userPlanId: string): boolean {
  const plan = getPlanLimits(userPlanId);
  return plan.features.hasPrioritySupport;
}

export function getCommissionRate(userPlanId: string): number {
  const plan = getPlanLimits(userPlanId);
  return plan.features.commissionRate;
}

export function getAvailableTemplates(userPlanId: string, allTemplates: LeadPageTemplate[]): LeadPageTemplate[] {
  if (userPlanId === 'free') {
    // Plano free: apenas o template padrão
    return allTemplates.filter(template => template.id === 'default-modern');
  }
  // Planos pagos: todos os templates
  return allTemplates;
}