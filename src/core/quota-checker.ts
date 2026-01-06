import type { DomainRegistry } from './registry';
import type { GlobalConfig } from '@/config';
import type { ValidationIssue } from '@/types/results';

/**
 * Global Quota Checker - Cross-domain user quota validation
 *
 * Why separate from DomainRegistry?
 * - Registry: Single-domain data loading (for deployment)
 * - QuotaChecker: Cross-domain aggregation (for validation)
 *
 * This separation ensures validate + deploy can work in same workflow.
 */
export class GlobalQuotaChecker {
  // owner -> set of FQDNs (e.g., "test.ciao.su", "blog.ciallo.de")
  private ownerSubdomains = new Map<string, Set<string>>();

  /**
   * Add a domain's registry data to global statistics
   */
  addDomain(registry: DomainRegistry, domain: string): void {
    for (const [subdomain, cfg] of Object.entries(registry.getConfigFiles())) {
      const owner = cfg.owner.github;
      const fqdn = `${subdomain}.${domain}`;

      if (!this.ownerSubdomains.has(owner)) {
        this.ownerSubdomains.set(owner, new Set());
      }
      this.ownerSubdomains.get(owner)?.add(fqdn);
    }
  }

  /**
   * Check global quotas (cross-domain)
   */
  validateQuotas(config: GlobalConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [owner, fqdns] of this.ownerSubdomains) {
      const count = fqdns.size;

      if (count > config.max_subdomains_per_user) {
        const list = [...fqdns].sort().join(', ');

        issues.push({
          scope: 'global',
          level: 'warning',
          message: `用户 @${owner} 在所有域名中共申请了 ${count} 个子域名（建议最多 ${config.max_subdomains_per_user} 个）[${list}]，需要管理员审核是否合理`,
        });
      }
    }

    return issues;
  }

  getStats() {
    return {
      totalOwners: this.ownerSubdomains.size,
      totalSubdomains: [...this.ownerSubdomains.values()].reduce((acc, set) => acc + set.size, 0),
    };
  }
}
