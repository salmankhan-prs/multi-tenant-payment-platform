import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant.context';
import { TenantService } from './tenant.service';
import { ITenantInfo } from './tenant.types';

/**
 * Resolves the current tenant from the request and stores it in AsyncLocalStorage.
 *
 * Resolution priority:
 *   1. JWT claims (signed, most trusted)
 *   2. Subdomain (URL-based)
 *   3. X-Tenant-ID header (API clients)
 *   4. Custom domain lookup (white-label)
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly baseDomain: string;

  constructor(
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
  ) {
    this.baseDomain = process.env.BASE_DOMAIN || 'localhost';
  }

  async use(req: Request, res: Response, next: NextFunction) {
    let tenant = null;

    const slug = this.extractTenantSlug(req);

    if (slug) {
      tenant = await this.tenantService.findBySlug(slug);
    }

    if (!tenant) {
      const host = this.getCleanHost(req);
      if (host && host !== this.baseDomain) {
        tenant = await this.tenantService.findByCustomDomain(host);
      }
    }

    if (!tenant) {
      throw new BadRequestException({
        error: 'TENANT_NOT_RESOLVED',
        message:
          'Could not resolve tenant from request. ' +
          'Provide via subdomain, X-Tenant-ID header, or JWT token.',
      });
    }

    if (tenant.status === 'suspended') {
      throw new ForbiddenException({
        error: 'TENANT_SUSPENDED',
        message: 'Tenant account is suspended. Contact support.',
      });
    }

    TenantContext.run({ tenant: this.toTenantInfo(tenant) }, () => next());
  }

  private extractTenantSlug(req: Request): string | null {
    const jwtSlug = this.extractFromJwt(req);
    if (jwtSlug) return jwtSlug;

    const subdomainSlug = this.extractFromSubdomain(req);
    if (subdomainSlug) return subdomainSlug;

    const headerSlug = req.headers['x-tenant-id'] as string;
    if (headerSlug) return headerSlug.toLowerCase();

    return null;
  }

  private extractFromJwt(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    try {
      const token = authHeader.slice(7);
      const decoded = this.jwtService.verify(token);
      return decoded.tenantSlug || null;
    } catch {
      return null;
    }
  }

  private extractFromSubdomain(req: Request): string | null {
    const host = this.getCleanHost(req);
    if (!host) return null;

    const hostParts = host.split('.');
    const baseParts = this.baseDomain.split('.');

    if (hostParts.length <= baseParts.length) return null;

    let subdomain = hostParts[0];

    // Skip reserved subdomains (www, api, admin, etc.)
    if (subdomain === 'www' && hostParts.length > baseParts.length + 1) {
      subdomain = hostParts[1];
    } else if (subdomain === 'www') {
      return null;
    }

    const reserved = ['www', 'api', 'admin', 'mail', 'ftp', 'docs'];
    if (reserved.includes(subdomain)) return null;

    return subdomain;
  }

  private getCleanHost(req: Request): string {
    let host = req.headers.host || '';
    host = host.split(':')[0];
    return host.toLowerCase();
  }

  private toTenantInfo(tenant: any): ITenantInfo {
    const plain =
      typeof tenant.toJSON === 'function' ? tenant.toJSON() : tenant;
    return {
      _id: plain._id?.toString ? plain._id.toString() : plain._id,
      slug: plain.slug,
      name: plain.name,
      tier: plain.tier,
      settings: plain.settings,
      whiteLabel: plain.whiteLabel || {
        logoUrl: null,
        primaryColor: '#1a73e8',
        companyName: plain.name,
      },
      status: plain.status,
    };
  }
}
