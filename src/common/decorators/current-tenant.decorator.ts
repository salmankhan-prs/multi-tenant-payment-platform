import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../../modules/tenant/tenant.context';
import { ITenantInfo } from '../../modules/tenant/tenant.types';

/**
 * Parameter decorator that injects the current tenant into a controller method.
 *
 * Usage:
 *   @Get('config')
 *   getConfig(@CurrentTenant() tenant: ITenantInfo) { return tenant; }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): ITenantInfo => {
    return TenantContext.getCurrentTenant();
  },
);
