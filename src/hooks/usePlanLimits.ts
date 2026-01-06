import { useAuth } from './useAuth';

export function usePlanLimits() {
  const { userData } = useAuth();

  const planId = userData?.planId || 'freemium';
  const planFeatures = userData?.planFeatures;

  return {
    planId,
    planFeatures,

    // No modelo freemium, tudo é ilimitado
    canCreateService: () => true,
    canCreateLeadPage: () => true,
    hasCustomDomainAccess: () => true,
    hasAnalyticsAccess: () => true,
    hasPrioritySupport: () => true,

    // Taxas fixas do modelo freemium
    getCommissionRate: () => 0.08, // 8% para cartão, mas isso pode variar por método

    // Limites ilimitados no freemium
    maxServices: Infinity,
    maxLeadPages: Infinity,
    commissionRate: 0.08,

    // Status do plano - sempre freemium
    isFreePlan: false,
    isProPlan: false,
    isPremiumPlan: false,
    isFreemiumPlan: true
  };
}