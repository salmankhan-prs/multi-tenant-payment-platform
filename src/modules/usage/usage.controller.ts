import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantContext } from '../tenant/tenant.context';
import { TenantGuard } from '../tenant/tenant.guard';
import { RateLimitGuard } from '../rate-limiting/rate-limit.guard';
import { UsageTrackingService } from '../rate-limiting/usage-tracking.service';
import { RateLimitService } from '../rate-limiting/rate-limit.service';
import { UsageTrackingInterceptor } from '../rate-limiting/usage-tracking.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiAuthenticatedResponses,
  ApiSuccessResponse,
} from '../../common/decorators/api-responses.decorator';

@ApiTags('Usage')
@Controller('usage')
@UseGuards(JwtAuthGuard, TenantGuard, RateLimitGuard)
@UseInterceptors(UsageTrackingInterceptor)
@ApiAuthenticatedResponses()
export class UsageController {
  constructor(
    private readonly usageTrackingService: UsageTrackingService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current month usage summary for billing' })
  @ApiSuccessResponse('Usage stats returned')
  async getUsage() {
    const tenant = TenantContext.getCurrentTenant();

    const [usage, rateLimit] = await Promise.all([
      this.usageTrackingService.getUsageSummary(tenant._id),
      this.rateLimitService.checkRateLimit(
        tenant._id,
        tenant.settings.apiRateLimit,
      ),
    ]);

    const maxTxn = tenant.settings.maxTransactionsPerMonth;

    return {
      tenant: tenant.slug,
      tier: tenant.tier,
      period: usage.period,
      apiCalls: {
        used: usage.apiCalls,
      },
      transactions: {
        used: usage.transactions,
        limit: maxTxn === -1 ? 'unlimited' : maxTxn,
        remaining:
          maxTxn === -1
            ? 'unlimited'
            : Math.max(0, maxTxn - usage.transactions),
      },
      rateLimit: {
        limit: tenant.settings.apiRateLimit,
        remaining: rateLimit.remaining,
        resetsInSeconds: rateLimit.resetInSeconds,
      },
    };
  }
}
