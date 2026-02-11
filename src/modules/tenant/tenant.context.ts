import { AsyncLocalStorage } from 'async_hooks';
import { ITenantInfo, ITenantStore } from './tenant.types';

/** Request-scoped tenant storage using Node.js AsyncLocalStorage. */
export class TenantContext {
  private static storage = new AsyncLocalStorage<ITenantStore>();

  static run(store: ITenantStore, callback: () => void): void {
    this.storage.run(store, callback);
  }

  static getCurrentTenant(): ITenantInfo {
    const store = this.storage.getStore();
    if (!store?.tenant) {
      throw new Error(
        'Tenant context not initialized — this operation requires tenant scope.',
      );
    }
    return store.tenant;
  }

  static getTenantId(): string {
    return this.getCurrentTenant()._id;
  }

  static hasTenant(): boolean {
    return !!this.storage.getStore()?.tenant;
  }
}
