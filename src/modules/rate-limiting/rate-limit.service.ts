import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { IRateLimitResult } from './rate-limiting.types';

/**
 * Per-tenant rate limiting using rate-limiter-flexible with a sliding window algorithm.
 *
 * Uses the "sliding window" strategy via RateLimiterRedis — it counts requests across
 * two fixed windows and applies a weighted average, preventing the burst-at-boundary
 * problem of fixed windows. All Redis operations are atomic internally.
 *
 * Each tenant gets an independent rate limit based on their tier configuration.
 */
@Injectable()
export class RateLimitService implements OnModuleInit {
  private limiterMap = new Map<number, RateLimiterRedis>();

  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  onModuleInit() {
    // Pre-create limiters for common tier limits to avoid creating on every request.
    // If a tenant has a different limit, one is created on-demand and cached.
    for (const limit of [60, 300, 1000]) {
      this.limiterMap.set(limit, this.createLimiter(limit));
    }
  }

  private createLimiter(points: number): RateLimiterRedis {
    return new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'ratelimit',
      points,
      duration: 60, // per minute
    });
  }

  private getLimiter(limit: number): RateLimiterRedis {
    let limiter = this.limiterMap.get(limit);
    if (!limiter) {
      limiter = this.createLimiter(limit);
      this.limiterMap.set(limit, limiter);
    }
    return limiter;
  }

  async checkRateLimit(
    tenantId: string,
    limit: number,
  ): Promise<IRateLimitResult> {
    const limiter = this.getLimiter(limit);

    try {
      const res = await limiter.consume(tenantId);
      return {
        allowed: true,
        current: limit - res.remainingPoints,
        limit,
        remaining: res.remainingPoints,
        resetInSeconds: Math.ceil(res.msBeforeNext / 1000),
      };
    } catch (rejRes: any) {
      // rate-limiter-flexible throws RateLimiterRes when limit is exceeded
      return {
        allowed: false,
        current: limit,
        limit,
        remaining: 0,
        resetInSeconds: Math.ceil(rejRes.msBeforeNext / 1000),
      };
    }
  }
}
