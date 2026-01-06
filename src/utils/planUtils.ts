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

export function canCreateService(_userPlanId: string, _currentServiceCount: number): boolean {
  // No modelo freemium, criação ilimitada de serviços
  return true;
}

export function canCreateLeadPage(_userPlanId: string, _currentLeadPageCount: number): boolean {
  // No modelo freemium, criação ilimitada de lead pages
  return true;
}

export function hasCustomDomainAccess(_userPlanId: string): boolean {
  // No modelo freemium, domínio personalizado disponível para todos
  return true;
}

export function hasAnalyticsAccess(_userPlanId: string): boolean {
  // No modelo freemium, analytics disponível para todos
  return true;
}

export function hasPrioritySupport(_userPlanId: string): boolean {
  // No modelo freemium, suporte prioritário disponível para todos
  return true;
}

export function getCommissionRate(_userPlanId: string): number {
  // Taxa fixa de 8% para cartão no modelo freemium
  return 0.08;
}

export function getAvailableTemplates(_userPlanId: string, allTemplates: LeadPageTemplate[]): LeadPageTemplate[] {
  // No modelo freemium, todos os templates estão disponíveis
  return allTemplates;
}