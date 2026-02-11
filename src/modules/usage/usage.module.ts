import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsageController],
})
export class UsageModule {}
