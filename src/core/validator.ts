import type { DomainRegistry } from './registry';
import type { ExpandedDNSRecord } from '@/types/schema';
import type { GlobalConfig } from '@/config';
import type { ValidationIssue, ValidationReport } from '@/types/results';

/**
 * Domain Validator - Single-domain validation
 * For cross-domain quota checks, use GlobalQuotaChecker directly
 */

export default function validate(
  registry: DomainRegistry,
  config: GlobalConfig,
): ValidationReport {
  const issues: ValidationIssue[] = [
    ...collectZodErrors(registry),
    ...validateRootRecords(registry),
    ...validateTXTWhitelist(registry),
    ...validateFileQuotas(registry, config),
    ...validateSubdomainLength(registry),
    ...validateSubSubdomainProxied(registry),
    ...validateNocheck(registry),
  ];

  return {
    errors: issues.filter(i => i.level === 'error'),
    warnings: issues.filter(i => i.level === 'warning'),
  };
}

function collectZodErrors(registry: DomainRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [subdomain, zodError] of registry.getValidationErrors()) {
    const configFile = registry.getConfigFilePath(subdomain);
    for (const issue of zodError.issues) {
      const path = issue.path.length > 0 ? `(${issue.path.join('.')}) ` : '';
      issues.push({
        scope: 'file',
        level: 'error',
        file: configFile,
        message: `${path}${issue.message}`,
      });
    }
  }

  return issues;
}

function validateRootRecords(registry: DomainRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const domain = registry.getDomain();

  // 按配置文件分组记录
  const recordsByFile = new Map<string, ExpandedDNSRecord[]>();
  for (const record of registry.getAll()) {
    // 只检查来自 records 数组的记录（不检查 rootLevelRecords）
    if (record.customData.source !== 'records') continue;

    const file = record.customData.configFile;
    if (!recordsByFile.has(file)) {
      recordsByFile.set(file, []);
    }
    recordsByFile.get(file)?.push(record);
  }

  // 检查每个文件
  for (const [subdomain, cfg] of Object.entries(registry.getConfigFiles())) {
    const configFile = registry.getConfigFilePath(subdomain);
    const records = recordsByFile.get(configFile) ?? [];

    // 检查 1: 是否有可访问的根记录
    const hasAccessibleRoot = cfg.records.some(
      r => r.name === '@' && ['A', 'AAAA', 'CNAME', 'NS'].includes(r.type),
    );

    if (!hasAccessibleRoot) {
      issues.push({
        scope: 'file',
        level: 'warning',
        file: configFile,
        message: '建议至少有一条 name 为 \'@\' 且类型为 A/AAAA/CNAME/NS 的记录，否则根域名可能无法访问',
      });
    }

    // 检查 2: records 的 name 最后一段是否等于 subdomain（导致连续重复）
    for (const record of records) {
      const lastSegment = record.customData.originalName.split('.').pop();
      if (lastSegment === subdomain) {
        issues.push({
          scope: 'record',
          level: 'warning',
          file: configFile,
          fqdn: record.name,
          message: `记录的 name "${record.customData.originalName}" 的最后一段与子域名相同，如果想表示根域名 ${subdomain}.${domain}，请使用 "name": "@"`,
        });
      }
    }
  }

  return issues;
}

function validateTXTWhitelist(registry: DomainRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const record of registry.getAll()) {
    if (record.customData.source === 'rootLevelRecords') {
      issues.push({
        scope: 'record',
        level: 'warning',
        file: record.customData.configFile,
        fqdn: record.name,
        message: `根域名级记录 "${record.customData.originalName}" (${record.type}) 需要管理员审核`,
      });
    }
  }

  return issues;
}

function validateFileQuotas(
  registry: DomainRegistry,
  config: GlobalConfig,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // File level: 检查每个文件的总记录数
  for (const [subdomain, cfg] of Object.entries(registry.getConfigFiles())) {
    const configFile = registry.getConfigFilePath(subdomain);
    const recordCount = cfg.records.length + cfg.rootLevelRecords.length;

    if (recordCount > config.max_records_per_file) {
      issues.push({
        scope: 'file',
        level: 'warning',
        file: configFile,
        message: `文件包含 ${recordCount} 条记录（建议最多 ${config.max_records_per_file} 条），需要管理员审核是否合理`,
      });
    }
  }

  // User-level quota moved to GlobalQuotaChecker (cross-domain)

  return issues;
}

function validateSubdomainLength(registry: DomainRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [subdomain, _cfg] of Object.entries(registry.getConfigFiles())) {
    if (subdomain.length < 3) {
      const configFile = registry.getConfigFilePath(subdomain);
      issues.push({
        scope: 'file',
        level: 'warning',
        file: configFile,
        message: `子域名 "${subdomain}" 长度为 ${subdomain.length} 个字符（建议至少 3 个字符），需要管理员审核并说明使用理由`,
      });
    }
  }

  return issues;
}

/**
 * Cloudflare proxy on sub-subdomains requires ACM (not included in free plan)
 * Exception: *.pages.dev CNAME works without ACM
 */
function validateSubSubdomainProxied(registry: DomainRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const record of registry.getAll()) {
    if (record.customData.originalName !== '@' && record.proxied) {
      // Cloudflare Pages CNAME - 跳过警告（常见且正常的场景）
      if (record.type === 'CNAME' && record.content.endsWith('.pages.dev')) {
        continue;
      }

      issues.push({
        scope: 'record',
        level: 'warning',
        file: record.customData.configFile,
        fqdn: record.name,
        message: `二级子域名使用了 proxied，Cloudflare 默认不支持多级子域名代理（需要 ACM 或特殊配置如 SaaS 回源）。建议改为 "proxied": false`,
      });
    }
  }

  return issues;
}

function validateNocheck(registry: DomainRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const domain = registry.getDomain();

  for (const [subdomain, cfg] of Object.entries(registry.getConfigFiles())) {
    if (cfg.nocheck) {
      const configFile = registry.getConfigFilePath(subdomain);
      const fqdn = `${subdomain}.${domain}`;
      issues.push({
        scope: 'file',
        level: 'warning',
        file: configFile,
        message: `域名 ${fqdn} 配置了 "nocheck": true（绕过健康检查），需要管理员审核使用理由`,
      });
    }
  }

  return issues;
}
