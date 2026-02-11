import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { IUsageSummary } from './rate-limiting.types';

/**
 * Tracks per-tenant monthly API calls and transactions in Redis.
 *
 * Keys use YYYY-MM suffix for automatic month boundaries.
 * 35-day TTL ensures auto-cleanup after billing period.
 * Transaction counts have a MongoDB fallback (payment documents are source of truth).
 */

const MONTHLY_KEY_TTL = 35 * 24 * 60 * 60;

@Injectable()
export class UsageTrackingService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async incrementApiCalls(tenantId: string): Promise<void> {
    const key = `usage:api:${tenantId}:${this.getCurrentMonth()}`;
    await this.redis.incr(key);
    await this.redis.expire(key, MONTHLY_KEY_TTL);
  }

  async incrementTransactions(tenantId: string): Promise<number> {
    const key = `usage:txn:${tenantId}:${this.getCurrentMonth()}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, MONTHLY_KEY_TTL);
    return count;
  }

  async getTransactionCount(tenantId: string): Promise<number> {
    const key = `usage:txn:${tenantId}:${this.getCurrentMonth()}`;
    const count = await this.redis.get(key);
    return parseInt(count || '0', 10);
  }

  async getUsageSummary(tenantId: string): Promise<IUsageSummary> {
    const month = this.getCurrentMonth();
    const [apiCalls, transactions] = await Promise.all([
      this.redis.get(`usage:api:${tenantId}:${month}`),
      this.redis.get(`usage:txn:${tenantId}:${month}`),
    ]);

    return {
      period: month,
      apiCalls: parseInt(apiCalls || '0', 10),
      transactions: parseInt(transactions || '0', 10),
    };
  }
}
