import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Provides the shared Redis client used across the platform for
 * rate limiting, usage tracking, and tenant config caching.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = new Redis(config.get<string>('redis.url') || 'redis://localhost:6379', {
          maxRetriesPerRequest: 3,
          retryStrategy(times: number) {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
          },
        });

        redis.on('connect', () => console.log('Redis connected'));
        redis.on('error', (err: Error) =>
          console.error('Redis error:', err.message),
        );

        return redis;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
