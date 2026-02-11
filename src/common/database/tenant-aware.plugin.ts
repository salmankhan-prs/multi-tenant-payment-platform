import { Schema, Types } from 'mongoose';
import { TenantContext } from '../../modules/tenant/tenant.context';

/**
 * Mongoose plugin that enforces tenant data isolation at the database layer.
 *
 * Hooks into Mongoose lifecycle to auto-inject/filter tenantId on every operation.
 * Cross-tenant queries are impossible — any tenantId in user-provided filters is
 * overwritten with the current tenant's ID.
 *
 * For admin/system operations, pass { __skipTenantFilter: true } as a query option.
 */
export function tenantAwarePlugin(schema: Schema): void {
  schema.add({
    tenantId: { type: Types.ObjectId, required: true, index: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  });

  // ─── PRE VALIDATE ───
  // Runs before Mongoose validation so tenantId is set when `required: true` is checked.
  schema.pre('validate', function () {
    if (this.isNew) {
      if (!TenantContext.hasTenant()) {
        throw new Error(
          'Tenant context required for save. Wrap in TenantContext.run() for seed/admin operations.',
        );
      }
      this.set('tenantId', new Types.ObjectId(TenantContext.getTenantId()));
    }
  });

  // ─── PRE FIND / COUNT ───
  const addTenantFilter = function (this: any) {
    if (this.getOptions().__skipTenantFilter) return;

    if (!TenantContext.hasTenant()) {
      throw new Error(
        'Tenant context required for this query. Use { __skipTenantFilter: true } for admin operations.',
      );
    }

    const tenantId = new Types.ObjectId(TenantContext.getTenantId());
    this.where({ tenantId });

    if (!this.getOptions().__includeSoftDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
  };

  schema.pre('find', addTenantFilter);
  schema.pre('findOne', addTenantFilter);
  schema.pre('countDocuments', addTenantFilter);

  // ─── PRE UPDATE ───
  const addTenantFilterForUpdate = function (this: any) {
    if (this.getOptions().__skipTenantFilter) return;

    if (!TenantContext.hasTenant()) {
      throw new Error('Tenant context required for update operations.');
    }

    const tenantId = new Types.ObjectId(TenantContext.getTenantId());
    this.where({ tenantId });

    // Prevent tenantId reassignment via $set
    const update = this.getUpdate() as any;
    if (update?.$set?.tenantId) delete update.$set.tenantId;
    if (update?.tenantId) delete update.tenantId;
  };

  schema.pre('updateOne', addTenantFilterForUpdate);
  schema.pre('updateMany', addTenantFilterForUpdate);
  schema.pre('findOneAndUpdate', addTenantFilterForUpdate);

  // ─── PRE DELETE ───
  schema.pre('deleteOne', addTenantFilter);
  schema.pre('deleteMany', addTenantFilter);

  // ─── PRE AGGREGATE ───
  schema.pre('aggregate', function () {
    const options = (this as any).options || {};
    if (options.__skipTenantFilter) return;

    if (!TenantContext.hasTenant()) {
      throw new Error('Tenant context required for aggregation.');
    }

    const tenantId = new Types.ObjectId(TenantContext.getTenantId());
    this.pipeline().unshift({
      $match: { tenantId, isDeleted: { $ne: true } },
    });
  });
}
