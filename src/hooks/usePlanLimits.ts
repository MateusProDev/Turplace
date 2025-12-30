import { useAuth } from './useAuth';
import {
  canCreateService,
  canCreateLeadPage,
  hasCustomDomainAccess,
  hasAnalyticsAccess,
  hasPrioritySupport,
  getCommissionRate
} from '../utils/planUtils';

export function usePlanLimits() {
  const { userData } = useAuth();

  const planId = userData?.planId || 'free';
  const planFeatures = userData?.planFeatures;

  return {
    planId,
    planFeatures,

    // Verificações de limites
    canCreateService: (currentCount: number) => canCreateService(planId, currentCount),
    canCreateLeadPage: (currentCount: number) => canCreateLeadPage(planId, currentCount),
    hasCustomDomainAccess: () => hasCustomDomainAccess(planId),
    hasAnalyticsAccess: () => hasAnalyticsAccess(planId),
    hasPrioritySupport: () => hasPrioritySupport(planId),

    // Taxas e valores
    getCommissionRate: () => getCommissionRate(planId),

    // Limites atuais
    maxServices: planFeatures?.maxServices || 10,
    maxLeadPages: planFeatures?.maxLeadPages || 1,
    commissionRate: planFeatures?.commissionRate || 0.09,

    // Status do plano
    isFreePlan: planId === 'free',
    isProPlan: planId === 'professional',
    isPremiumPlan: planId === 'premium'
  };
}