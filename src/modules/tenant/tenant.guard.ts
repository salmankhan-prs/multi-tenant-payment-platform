import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContext } from './tenant.context';

/**
 * Safety-net guard that verifies a valid tenant context exists and the tenant is active.
 * The middleware handles primary validation; this guard prevents edge cases where
 * a route might accidentally bypass the middleware.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const tenant = TenantContext.getCurrentTenant();

    if (tenant.status !== 'active') {
      throw new ForbiddenException({
        error: 'TENANT_INACTIVE',
        message: 'Tenant is not active',
      });
    }

    return true;
  }
}
