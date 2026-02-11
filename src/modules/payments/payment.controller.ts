import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { RateLimitGuard } from '../rate-limiting/rate-limit.guard';
import { UsageTrackingInterceptor } from '../rate-limiting/usage-tracking.interceptor';
import {
  ApiAuthenticatedResponses,
  ApiCreatedResponse,
  ApiSuccessResponse,
  ApiNotFoundResponse,
} from '../../common/decorators/api-responses.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, TenantGuard, RateLimitGuard)
@UseInterceptors(UsageTrackingInterceptor)
@ApiAuthenticatedResponses()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment (tenant-scoped, rate-limited)' })
  @ApiCreatedResponse('Payment created')
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments for current tenant (paginated)' })
  @ApiSuccessResponse('Payments listed')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID (returns 404 if wrong tenant)' })
  @ApiSuccessResponse('Payment found')
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.paymentService.findById(id);
  }
}
