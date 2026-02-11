import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { TenantContext } from '../tenant/tenant.context';
import { UsageTrackingService } from './usage-tracking.service';

/** Increments API call counter after a successful response (fire-and-forget). */
@Injectable()
export class UsageTrackingInterceptor implements NestInterceptor {
  constructor(
    private readonly usageTrackingService: UsageTrackingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        if (TenantContext.hasTenant()) {
          const tenantId = TenantContext.getTenantId();
          this.usageTrackingService
            .incrementApiCalls(tenantId)
            .catch(() => {});
        }
      }),
    );
  }
}
