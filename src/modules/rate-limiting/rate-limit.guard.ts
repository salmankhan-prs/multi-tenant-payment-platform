import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { TenantContext } from '../tenant/tenant.context';
import { RateLimitService } from './rate-limit.service';

/** Enforces per-tenant API rate limits. Sets standard X-RateLimit-* headers. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tenant = TenantContext.getCurrentTenant();
    const response = context.switchToHttp().getResponse<Response>();

    const result = await this.rateLimitService.checkRateLimit(
      tenant._id,
      tenant.settings.apiRateLimit,
    );

    response.set({
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(
        Math.floor(Date.now() / 1000) + result.resetInSeconds,
      ),
    });

    if (!result.allowed) {
      response.set('Retry-After', String(result.resetInSeconds));
      throw new HttpException(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: `API rate limit exceeded. Limit: ${result.limit} requests/minute.`,
          retryAfter: result.resetInSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
