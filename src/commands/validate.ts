import { DomainRegistry } from '@/core/registry';
import { GlobalQuotaChecker } from '@/core/quota-checker';
import validate from '@/core/validator';
import config from '@/config';

/**
 * Static validation (JSON, DNS records, quotas, reserved names)
 * For HTTP/HTTPS checks, use health-check command
 */
export async function validateDomains(): Promise<void> {
  console.log('🔍 Starting validation...');

  const globalChecker = new GlobalQuotaChecker();
  let hasErrors = false;

  // Phase 1: Validate each domain (single-domain checks)
  for (const domainConfig of config.domains) {
    if (!domainConfig.enabled) {
      console.log(`\n⏸️ Skipping disabled domain: ${domainConfig.name}`);
      continue;
    }

    console.log(`\n📋 Validating domain: ${domainConfig.name}`);

    // Load domain records
    const registry = new DomainRegistry();
    await registry.load(domainConfig.name);

    const stats = registry.getStats();
    console.log(`   Loaded ${stats.totalRecords} records from ${stats.totalConfigs} config files`);

    // Single-domain validation
    const report = validate(registry, config);

    // Display results
    if (report.errors.length > 0) {
      hasErrors = true;
      console.log(`\n❌ Errors (${report.errors.length}):`);
      for (const error of report.errors) {
        const location = error.scope === 'record'
          ? `${error.file} (${error.fqdn})`
          : error.scope === 'file'
            ? error.file
            : 'global';
        console.log(`   ${location}: ${error.message}`);
      }
    }

    if (report.warnings.length > 0) {
      console.log(`\n⚠️ Warnings (${report.warnings.length}):`);
      for (const warning of report.warnings) {
        const location = warning.scope === 'record'
          ? `${warning.file} (${warning.fqdn})`
          : warning.scope === 'file'
            ? warning.file
            : 'global';
        console.log(`   ${location}: ${warning.message}`);
      }
    }

    if (report.errors.length === 0 && report.warnings.length === 0) {
      console.log('✅ All checks passed!');
    }

    // Collect global quota data
    globalChecker.addDomain(registry, domainConfig.name);
  }

  // Phase 2: Global quota validation (cross-domain)
  console.log('\n📊 Global quota check...');
  const globalIssues = globalChecker.validateQuotas(config);

  if (globalIssues.length > 0) {
    console.log(`\n⚠️ Global Warnings (${globalIssues.length}):`);
    for (const issue of globalIssues) {
      console.log(`   ${issue.message}`);
    }
  }

  const globalStats = globalChecker.getStats();
  console.log(`\n   Total owners: ${globalStats.totalOwners}`);
  console.log(`   Total subdomains: ${globalStats.totalSubdomains}`);

  if (hasErrors) {
    console.log('\n❌ Validation failed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ All domains validated successfully');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateDomains().catch((error: unknown) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
