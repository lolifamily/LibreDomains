import { DomainRegistry } from '@/core/registry';
import checkAll from '@/core/health-checker';
import config from '@/config';

export async function healthCheck(): Promise<void> {
  console.log('🔍 Starting health check...');

  // Rate limiting configuration (can be overridden by env var)
  const requestInterval = Number(process.env.HEALTH_CHECK_INTERVAL) || 200;
  console.log(`   Request interval: ${requestInterval}ms (max concurrency: ~${Math.floor(5000 / requestInterval)})`);

  for (const domainConfig of config.domains) {
    if (!domainConfig.enabled) {
      console.log(`\n⏸️ Skipping disabled domain: ${domainConfig.name}`);
      continue;
    }

    console.log(`\n🌐 Health check: ${domainConfig.name}`);

    // Load domain records
    const registry = new DomainRegistry();
    await registry.load(domainConfig.name);

    const stats = registry.getStats();
    console.log(`   Checking ${stats.totalFQDNs} domains from ${stats.totalConfigs} config files\n`);

    // Run health check with streaming output (output=true)
    const results = await checkAll(registry, domainConfig.name, requestInterval, true);

    // Summary
    const skippedCount = results.filter(r => r.skipped).length;
    const healthyCount = results.filter(r => r.accessible && !r.skipped).length;
    const errorCount = results.length - healthyCount - skippedCount;

    console.log(`\n   Summary:`);
    console.log(`     ✅ Healthy: ${healthyCount}`);
    console.log(`     ❌ Errors: ${errorCount}`);
    if (skippedCount > 0) {
      console.log(`     ⏭️ Skipped: ${skippedCount}`);
    }
  }

  console.log('\n✅ Health check complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  healthCheck().catch((error: unknown) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
