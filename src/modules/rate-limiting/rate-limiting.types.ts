export interface IRateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

export interface IUsageSummary {
  period: string;
  apiCalls: number;
  transactions: number;
}
