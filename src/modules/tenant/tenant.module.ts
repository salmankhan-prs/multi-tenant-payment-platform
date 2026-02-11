import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantConfigController } from './tenant-config.controller';
import { TenantMiddleware } from './tenant.middleware';
import { TenantGuard } from './tenant.guard';

/**
 * Global module — TenantService and TenantGuard are available across
 * all modules without explicit imports, since tenant context is a
 * cross-cutting concern used by every tenant-scoped feature.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [TenantController, TenantConfigController],
  providers: [TenantService, TenantMiddleware, TenantGuard],
  exports: [TenantService, TenantGuard, JwtModule],
})
export class TenantModule {}
