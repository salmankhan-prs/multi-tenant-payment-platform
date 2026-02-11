import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true })
export class Tenant {
  @ApiProperty({ example: 'hdfc' })
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @ApiProperty({ example: 'HDFC Bank' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ example: 'payments.hdfcbank.com', required: false })
  @Prop({ type: String })
  customDomain?: string;

  @ApiProperty({ enum: ['starter', 'professional', 'enterprise'] })
  @Prop({ required: true, enum: ['starter', 'professional', 'enterprise'] })
  tier: string;

  @Prop({
    type: {
      maxUsers: { type: Number, required: true },
      maxTransactionsPerMonth: { type: Number, required: true },
      apiRateLimit: { type: Number, required: true },
      features: { type: [String], required: true },
    },
    required: true,
    _id: false,
  })
  settings: {
    maxUsers: number;
    maxTransactionsPerMonth: number;
    apiRateLimit: number;
    features: string[];
  };

  @Prop({
    type: {
      logoUrl: { type: String, default: null },
      primaryColor: { type: String, default: '#1a73e8' },
      companyName: { type: String },
    },
    _id: false,
    default: {},
  })
  whiteLabel: {
    logoUrl: string | null;
    primaryColor: string;
    companyName: string;
  };

  @Prop({
    required: true,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active',
  })
  status: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Indexes — slug and customDomain are the two lookup paths for tenant resolution
TenantSchema.index({ customDomain: 1 }, { unique: true, sparse: true });
TenantSchema.index({ status: 1 });
