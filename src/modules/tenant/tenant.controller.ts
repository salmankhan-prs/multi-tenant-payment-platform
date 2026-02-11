import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import {
  ApiCreatedResponse,
  ApiSuccessResponse,
  ApiConflictResponse,
} from '../../common/decorators/api-responses.decorator';

/**
 * Admin-only tenant management endpoints.
 * These are NOT tenant-scoped — the middleware is excluded for /api/admin/* routes.
 */
@ApiTags('Admin — Tenants')
@Controller('admin/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant with tier-based defaults' })
  @ApiCreatedResponse('Tenant created')
  @ApiConflictResponse('Slug already exists')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  @ApiSuccessResponse('All tenants returned')
  findAll() {
    return this.tenantService.findAll();
  }
}
