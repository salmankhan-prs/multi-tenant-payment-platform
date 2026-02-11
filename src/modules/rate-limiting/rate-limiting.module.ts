import { Module, Global } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { UsageTrackingService } from './usage-tracking.service';
import { UsageTrackingInterceptor } from './usage-tracking.interceptor';

@Global()
@Module({
  providers: [
    RateLimitService,
    RateLimitGuard,
    UsageTrackingService,
    UsageTrackingInterceptor,
  ],
  exports: [
    RateLimitService,
    RateLimitGuard,
    UsageTrackingService,
    UsageTrackingInterceptor,
  ],
})
export class RateLimitingModule {}
