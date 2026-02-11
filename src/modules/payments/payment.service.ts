import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UsageTrackingService } from '../rate-limiting/usage-tracking.service';
import { TenantContext } from '../tenant/tenant.context';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
    private usageTrackingService: UsageTrackingService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<PaymentDocument> {
    const tenant = TenantContext.getCurrentTenant();

    if (tenant.settings.maxTransactionsPerMonth !== -1) {
      const currentCount = await this.getMonthlyTransactionCount();
      if (currentCount >= tenant.settings.maxTransactionsPerMonth) {
        throw new ForbiddenException({
          error: 'TRANSACTION_LIMIT_REACHED',
          message: 'Monthly transaction limit reached',
          usage: {
            used: currentCount,
            limit: tenant.settings.maxTransactionsPerMonth,
          },
        });
      }
    }

    const reference = this.generateReference(tenant.slug);

    const payment = await this.paymentModel.create({
      ...dto,
      reference,
      status: 'pending',
    });

    await this.usageTrackingService.incrementTransactions(tenant._id);

    return payment;
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{
    data: PaymentDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.paymentModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments().exec(),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  /**
   * Redis as fast cache, MongoDB as persistent fallback.
   * If Redis returns 0 (could be data loss), falls back to counting payment documents.
   */
  private async getMonthlyTransactionCount(): Promise<number> {
    const tenant = TenantContext.getCurrentTenant();

    const redisCount = await this.usageTrackingService.getTransactionCount(
      tenant._id,
    );
    if (redisCount > 0) return redisCount;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.paymentModel
      .countDocuments({ createdAt: { $gte: startOfMonth } })
      .exec();
  }

  private generateReference(tenantSlug: string): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY-${tenantSlug.toUpperCase()}-${date}-${random}`;
  }
}
