import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { tenantAwarePlugin } from '../../../common/database/tenant-aware.plugin';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  // tenantId is auto-injected by tenantAwarePlugin — not defined here

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, enum: ['admin', 'member'], default: 'member' })
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Apply tenant isolation — all user queries auto-filter by tenantId
UserSchema.plugin(tenantAwarePlugin);

// Unique email per tenant (not globally — different tenants can have same email)
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
