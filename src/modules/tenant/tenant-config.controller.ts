import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantContext } from './tenant.context';
import { TenantGuard } from './tenant.guard';
import {
  ApiTenantResponses,
  ApiSuccessResponse,
} from '../../common/decorators/api-responses.decorator';

/**
 * Tenant-scoped endpoint that returns the current tenant's configuration.
 * Used by frontends for white-label branding (logo, colors, features).
 */
@ApiTags('Tenant')
@Controller('tenant')
@UseGuards(TenantGuard)
@ApiTenantResponses()
export class TenantConfigController {
  @Get('config')
  @ApiOperation({
    summary: 'Get current tenant config (white-label, tier, features)',
  })
  @ApiSuccessResponse('Tenant config returned')
  getConfig() {
    const tenant = TenantContext.getCurrentTenant();
    return {
      slug: tenant.slug,
      name: tenant.name,
      tier: tenant.tier,
      features: tenant.settings.features,
      whiteLabel: tenant.whiteLabel,
    };
  }
}
