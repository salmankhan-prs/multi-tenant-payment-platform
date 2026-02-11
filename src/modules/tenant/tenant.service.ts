import {
  Injectable,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { Tenant, TenantDocument } from './schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TIER_DEFAULTS } from '../../common/constants/tier-defaults';

const TENANT_CACHE_TTL = 300; // 5 minutes — balances freshness with reduced DB load

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async create(dto: CreateTenantDto): Promise<TenantDocument> {
    const existing = await this.tenantModel.findOne({ slug: dto.slug });
    if (existing) {
      throw new ConflictException(
        `Tenant with slug "${dto.slug}" already exists`,
      );
    }

    const tierSettings = TIER_DEFAULTS[dto.tier];

    const tenant = new this.tenantModel({
      ...dto,
      settings: tierSettings,
      whiteLabel: {
        companyName: dto.name,
        primaryColor: '#1a73e8',
        ...dto.whiteLabel,
      },
      status: 'active',
    });

    return tenant.save();
  }

  async findAll(): Promise<TenantDocument[]> {
    return this.tenantModel.find().exec();
  }

  /**
   * Resolves a tenant by slug with Redis caching
   *
   * Lookup flow: Redis cache -> MongoDB -> populate cache.
   * 5-minute TTL means tenant config changes propagate within 5 minutes.
   */
  async findBySlug(slug: string): Promise<TenantDocument | null> {
    const cacheKey = `tenant:slug:${slug}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const tenant = await this.tenantModel
      .findOne({ slug, status: { $ne: 'inactive' } })
      .exec();

    if (tenant) {
      await this.redis.setex(
        cacheKey,
        TENANT_CACHE_TTL,
        JSON.stringify(tenant.toJSON()),
      );
    }

    return tenant;
  }

  /**
   * Resolves tenant by custom domain for white-label access.
   * Two-layer cache: domain→slug mapping + slug→tenant document.
   */
  async findByCustomDomain(domain: string): Promise<TenantDocument | null> {
    const cacheKey = `tenant:domain:${domain}`;

    const cachedSlug = await this.redis.get(cacheKey);
    if (cachedSlug) {
      return this.findBySlug(cachedSlug);
    }

    const tenant = await this.tenantModel
      .findOne({ customDomain: domain, status: { $ne: 'inactive' } })
      .exec();

    if (tenant) {
      await this.redis.setex(cacheKey, TENANT_CACHE_TTL, tenant.slug);
      await this.redis.setex(
        `tenant:slug:${tenant.slug}`,
        TENANT_CACHE_TTL,
        JSON.stringify(tenant.toJSON()),
      );
    }

    return tenant;
  }
}
