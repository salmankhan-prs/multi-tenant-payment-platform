/**
 * Seed script — populates the database with test tenants, users, and payments.
 *
 * Uses NestJS standalone application context to reuse the actual schemas,
 * models, and services defined in the application modules.
 *
 * Run with: npm run seed
 */

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { TenantContext } from './modules/tenant/tenant.context';
import { TIER_DEFAULTS } from './common/constants/tier-defaults';
import { Tenant, TenantDocument } from './modules/tenant/schemas/tenant.schema';
import { User, UserDocument } from './modules/auth/schemas/user.schema';
import { Payment, PaymentDocument } from './modules/payments/schemas/payment.schema';

const TENANTS = [
  {
    slug: 'hdfc',
    name: 'HDFC Bank',
    tier: 'starter' as const,
    whiteLabel: { companyName: 'HDFC Bank', primaryColor: '#004b87', logoUrl: null },
  },
  {
    slug: 'icici',
    name: 'ICICI Bank',
    tier: 'professional' as const,
    whiteLabel: { companyName: 'ICICI Bank', primaryColor: '#f37021', logoUrl: null },
  },
  {
    slug: 'sbi',
    name: 'State Bank of India',
    tier: 'enterprise' as const,
    customDomain: 'payments.sbibank.com',
    whiteLabel: { companyName: 'SBI', primaryColor: '#00539b', logoUrl: null },
  },
];

const SAMPLE_PAYMENTS = [
  { amount: 50000, currency: 'INR', senderName: 'Rahul Sharma', senderAccount: 'ACC001', receiverName: 'Priya Singh', receiverAccount: 'ACC002', description: 'Invoice payment' },
  { amount: 125000, currency: 'INR', senderName: 'Amit Kumar', senderAccount: 'ACC003', receiverName: 'Deepa Iyer', receiverAccount: 'ACC004', description: 'Salary transfer' },
  { amount: 8500, currency: 'INR', senderName: 'Vikram Patel', senderAccount: 'ACC005', receiverName: 'Neha Gupta', receiverAccount: 'ACC006', description: 'Utility bill' },
];

async function seed() {
  // Create NestJS app context (no HTTP server, just DI container)
  const app = await NestFactory.createApplicationContext(AppModule);

  const config = app.get(ConfigService);
  const jwtSecret = config.get<string>('jwt.secret') || 'default-secret-change-me';

  const tenantModel = app.get<Model<TenantDocument>>(getModelToken(Tenant.name));
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const paymentModel = app.get<Model<PaymentDocument>>(getModelToken(Payment.name));

  // Drop entire database to guarantee clean slate (no stale indexes)
  await tenantModel.db.dropDatabase();
  // Recreate indexes from schema definitions
  await tenantModel.createIndexes();
  await userModel.createIndexes();
  await paymentModel.createIndexes();
  console.log('Database reset and indexes created.\n');

  const tokens: Record<string, string> = {};

  for (const tenantData of TENANTS) {
    // Create tenant (tenants collection has no plugin — direct insert)
    const tenant = await tenantModel.create({
      ...tenantData,
      settings: TIER_DEFAULTS[tenantData.tier],
      status: 'active',
    });
    console.log(`Created tenant: ${tenant.name} (${tenant.tier})`);

    const tenantInfo = {
      _id: tenant._id.toString(),
      slug: tenant.slug,
      name: tenant.name,
      tier: tenant.tier as 'starter' | 'professional' | 'enterprise',
      settings: tenant.settings,
      whiteLabel: tenant.whiteLabel,
      status: tenant.status,
    };

    // Wrap user and payment creation in tenant context so the plugin
    // auto-injects the correct tenantId — same as a real HTTP request
    await new Promise<void>((resolve, reject) => {
      TenantContext.run({ tenant: tenantInfo }, async () => {
        try {
          const passwordHash = await bcrypt.hash('password123', 10);
          const user = await userModel.create({
            email: `admin@${tenantData.slug}.com`,
            name: `${tenantData.name} Admin`,
            passwordHash,
            role: 'admin',
          });
          console.log(`  User: ${user.email} / password123`);

          // Generate JWT token for testing
          tokens[tenantData.slug] = jwt.sign(
            {
              sub: user._id.toString(),
              tenantId: tenant._id.toString(),
              tenantSlug: tenant.slug,
              role: 'admin',
            },
            jwtSecret,
            { expiresIn: '30d' },
          );

          // Create sample payments
          for (let i = 0; i < SAMPLE_PAYMENTS.length; i++) {
            await paymentModel.create({
              ...SAMPLE_PAYMENTS[i],
              reference: `PAY-${tenantData.slug.toUpperCase()}-SEED-${String(i + 1).padStart(3, '0')}`,
              status: 'completed',
            });
          }
          console.log(`  Created ${SAMPLE_PAYMENTS.length} sample payments\n`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // Print tokens for Postman testing
  console.log('═══════════════════════════════════════════════════');
  console.log('  TEST JWT TOKENS (valid for 30 days)');
  console.log('═══════════════════════════════════════════════════\n');

  for (const [slug, token] of Object.entries(tokens)) {
    console.log(`${slug.toUpperCase()} token:`);
    console.log(`  ${token}\n`);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('  QUICK TEST COMMANDS');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('# List HDFC payments (via X-Tenant-ID header + JWT):');
  console.log(
    `curl -H "Authorization: Bearer ${tokens['hdfc']}" ` +
      `-H "X-Tenant-ID: hdfc" http://localhost:3000/api/payments\n`,
  );
  console.log('# List ICICI payments (different tenant, different data):');
  console.log(
    `curl -H "Authorization: Bearer ${tokens['icici']}" ` +
      `-H "X-Tenant-ID: icici" http://localhost:3000/api/payments\n`,
  );

  await app.close();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
