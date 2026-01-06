import 'dotenv/config';

import { setTimeout } from 'node:timers/promises';
import { DomainRegistry } from '@/core/registry';
import validate from '@/core/validator';
import { DomainDeployer } from '@/core/deployer';
import { CloudflareManager } from '@/services/cloudflare';
import config from '@/config';
import type { ValidationIssue } from '@/types/results';

function formatLocation(issue: ValidationIssue): string {
  if (issue.scope === 'record') return `${issue.file} (${issue.fqdn})`;
  if (issue.scope === 'file') return issue.file;
  return 'global';
}

export async function deployDomains(dryRun = true): Promise<void> {
  console.log('🔐 Initializing Cloudflare API...');
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    throw new Error('CLOUDFLARE_API_TOKEN environment variable is required');
  }
  const cloudflare = new CloudflareManager(apiToken);

  for (const domainConfig of config.domains) {
    if (!domainConfig.enabled) {
      console.log(`⏸️  Skipping disabled domain: ${domainConfig.name}`);
      continue;
    }

    console.log(`\n🌐 Processing domain: ${domainConfig.name}`);

    // Load domain records
    const registry = new DomainRegistry();
    await registry.load(domainConfig.name);

    const stats = registry.getStats();
    console.log(`   Loaded ${stats.totalRecords} records from ${stats.totalConfigs} config files`);

    // Validate first
    console.log('   Validating...');
    const report = validate(registry, config);

    if (report.errors.length > 0) {
      console.error(`\n❌ Validation failed for ${domainConfig.name}:`);
      for (const error of report.errors) {
        console.error(`   ${formatLocation(error)}: ${error.message}`);
      }
      console.error('\n⛔ Deployment aborted due to validation errors\n');
      process.exit(1);
    }

    if (report.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${report.warnings.length}):`);
      for (const warning of report.warnings) {
        console.log(`   ${formatLocation(warning)}: ${warning.message}`);
      }
    }

    // Calculate diff (fetch once)
    console.log('   Calculating deployment diff...');
    const deployer = new DomainDeployer(registry, cloudflare, config, domainConfig.name);
    const diff = await deployer.calculateDiff(domainConfig.cloudflare_zone_id);

    const totalChanges = diff.toCreate.length + diff.toUpdate.length + diff.toDelete.length;

    console.log(`
      Creates: ${diff.toCreate.length}
      Updates: ${diff.toUpdate.length}
      Deletes: ${diff.toDelete.length}
      Total:   ${totalChanges}`);

    // Show detailed diff (直接使用 DNS 字段)
    if (diff.toCreate.length > 0) {
      console.log('\n   📝 Records to CREATE:');
      for (const record of diff.toCreate) {
        console.log(`      + ${record.name} ${record.type}`);
      }
    }

    if (diff.toUpdate.length > 0) {
      console.log('\n   🔄 Records to UPDATE:');
      for (const record of diff.toUpdate) {
        console.log(`      ~ ${record.name} ${record.type}`);
      }
    }

    if (diff.toDelete.length > 0) {
      console.log('\n   🗑️  Records to DELETE:');
      for (const record of diff.toDelete) {
        console.log(`      - ${record.name} ${record.type}`);
      }
    }

    // Business rule: reject if too large
    if (!diff.available) {
      console.error(`
❌ Diff too large: ${totalChanges} records (limit: 200)

   Normal PR should change 1-10 records. This indicates:
     • Malicious PR attempting bulk domain registration
     • Bug in diff calculation algorithm
     • Manual changes to Cloudflare outside of Git workflow
     • Configuration bypass (quota limits not enforced)

   Manual investigation required before deployment.
`);
      process.exit(1);
    }

    // Early return if no changes
    if (totalChanges === 0) {
      console.log('   ✅ No changes to deploy');
      continue;
    }

    // Dry run: show what would be deployed
    if (dryRun) {
      console.log(`   🔍 DRY RUN: Would deploy ${totalChanges} changes`);
      console.log('   ℹ️  Use --run to actually deploy');
      continue;
    }

    // Deploy with retry
    console.log(`   🚀 Deploying ${totalChanges} changes...`);

    let lastError: Error | undefined;

    // Retry up to 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await deployer.applyDiff(domainConfig.cloudflare_zone_id, diff);

        // Success
        console.log(`\
   ✅ Deployment complete:
      Created: ${result.created}
      Updated: ${result.updated}
      Deleted: ${result.deleted}`);
        break;  // Exit retry loop on success
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.error(`   ⚠️  Attempt ${attempt + 1}/3 failed: ${lastError.message}`);

        // Wait before retry (exponential backoff: 1s, 2s)
        if (attempt < 2) {
          const delay = 1000 * Math.pow(2, attempt);
          console.log(`      Retrying in ${delay}ms...`);
          await setTimeout(delay);
        } else {
          // All retries failed
          console.error(`
❌ Deployment failed after 3 attempts for ${domainConfig.name}:
   Last error: ${lastError.message}

   Possible causes:
     • Cloudflare API down
     • Rate limit (429)
     • Network issues
     • Invalid API token

   Check Cloudflare status and retry later.
`);
          throw lastError;
        }
      }
    }
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN completed. Use --run to actually deploy.');
  } else {
    console.log('\n🎉 All domains deployed successfully!');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for --run flag
  const shouldRun = process.argv.includes('--run');

  if (!shouldRun) {
    console.log('ℹ️  Running in DRY RUN mode (default)');
    console.log('   Use --run to actually deploy to Cloudflare\n');
  }

  deployDomains(!shouldRun).catch((error: unknown) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
