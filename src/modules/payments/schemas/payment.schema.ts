import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { tenantAwarePlugin } from '../../../common/database/tenant-aware.plugin';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  // tenantId, isDeleted, deletedAt — auto-added by tenantAwarePlugin

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'INR' })
  currency: string;

  @Prop({
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: string;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  senderAccount: string;

  @Prop({ required: true })
  receiverName: string;

  @Prop({ required: true })
  receiverAccount: string;

  @Prop({ unique: true })
  reference: string;

  @Prop({ type: String, default: null })
  description: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Apply tenant isolation
PaymentSchema.plugin(tenantAwarePlugin);

// Compound indexes — tenantId first for efficient scoped queries
PaymentSchema.index({ tenantId: 1, createdAt: -1 });
PaymentSchema.index({ tenantId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, reference: 1 }, { unique: true });
