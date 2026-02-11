/**
 * Default settings per tenant tier 
 *
 * These are applied automatically when a tenant is created. Changing a tenant's
 * tier reapplies the corresponding defaults (unless custom overrides are set).
 */
export const TIER_DEFAULTS = {
  starter: {
    maxUsers: 10,
    maxTransactionsPerMonth: 1000,
    apiRateLimit: 60, // requests per minute
    features: ['basic_payments'],
  },
  professional: {
    maxUsers: 100,
    maxTransactionsPerMonth: 50000,
    apiRateLimit: 300,
    features: ['basic_payments', 'bulk_payments', 'analytics'],
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxTransactionsPerMonth: -1, // unlimited
    apiRateLimit: 1000,
    features: [
      'basic_payments',
      'bulk_payments',
      'analytics',
      'custom_workflows',
      'white_label',
      'api_access',
    ],
  },
} as const;

export type TenantTier = keyof typeof TIER_DEFAULTS;
