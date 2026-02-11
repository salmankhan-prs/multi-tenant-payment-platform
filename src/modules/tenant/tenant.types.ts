export interface ITenantSettings {
  maxUsers: number;
  maxTransactionsPerMonth: number;
  apiRateLimit: number;
  features: string[];
}

export interface ITenantWhiteLabel {
  logoUrl: string | null;
  primaryColor: string;
  companyName: string;
}

export interface ITenantInfo {
  _id: string;
  slug: string;
  name: string;
  tier: 'starter' | 'professional' | 'enterprise';
  settings: ITenantSettings;
  whiteLabel: ITenantWhiteLabel;
  status: string;
}

export interface ITenantStore {
  tenant: ITenantInfo;
}
