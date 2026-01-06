import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { DomainConfigSchema, expandRecords } from '@/schemas/domain';
import type { ExpandedDNSRecord, DomainConfig } from '@/types/schema';
import globalConfig from '@/config';

/**
 * Domain Registry - Load and index domain configurations
 *
 * Data structure:
 * - configFiles: Record<subdomain, DomainConfig> - 原始配置，key 是 subdomain
 * - records: ExpandedDNSRecord[] - 展开后的记录（FQDN + customData）
 * - byFQDN: Map<fqdn, ExpandedDNSRecord[]> - 按 FQDN 索引
 */
export class DomainRegistry {
  private domain: string = '';
  private records: ExpandedDNSRecord[] = [];
  private configFiles: Record<string, DomainConfig> = {};
  private byFQDN = new Map<string, ExpandedDNSRecord[]>();
  private validationErrors = new Map<string, z.core.$ZodError>();

  async load(domain: string): Promise<void> {
    this.domain = domain;
    this.records = [];
    this.configFiles = {};
    this.byFQDN.clear();
    this.validationErrors.clear();

    const domainDir = path.join(process.cwd(), 'domains', domain);
    const entries = await fs.readdir(domainDir);
    const files = entries
      .filter(f => f.endsWith('.json'))
      .map(f => path.join('domains', domain, f));

    for (const configPath of files) {
      await this.loadConfigFile(configPath);
    }
  }

  private async loadConfigFile(configPath: string): Promise<void> {
    const subdomain = path.basename(configPath, '.json');

    try {
      if (globalConfig.reserved_subdomains.some(reserved => reserved === subdomain)) {
        throw new z.core.$ZodError([{
          code: 'custom',
          message: `记录名是系统保留子域名，不能使用`,
          path: [],
        }]);
      }

      const rawData: unknown = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      // Step 1: 验证并解析配置
      const config = DomainConfigSchema.parse(rawData);

      // Step 2: 存储原始配置（key = subdomain）
      this.configFiles[subdomain] = config;

      // Step 3: 展开记录并索引
      const expandedRecords = expandRecords(config, subdomain, this.domain, configPath);
      for (const record of expandedRecords) {
        this.records.push(record);

        // Index by FQDN
        if (!this.byFQDN.has(record.name)) {
          this.byFQDN.set(record.name, []);
        }
        this.byFQDN.get(record.name)?.push(record);
      }
    } catch (error: unknown) {
      if (error instanceof z.core.$ZodError) {
        this.validationErrors.set(subdomain, error);
      } else if (error instanceof SyntaxError) {
        this.validationErrors.set(subdomain, new z.core.$ZodError([{
          code: 'custom',
          message: error.message,
          path: [],
        }]));
      } else {
        console.error(`Failed to load ${configPath}:`, error);
      }
    }
  }

  getDomain(): string {
    return this.domain;
  }

  getConfigFilePath(subdomain: string): string {
    return `domains/${this.domain}/${subdomain}.json`;
  }

  getAll(): ExpandedDNSRecord[] {
    return this.records;
  }

  getByFQDN(fqdn: string): ExpandedDNSRecord[] {
    return this.byFQDN.get(fqdn) ?? [];
  }

  getAllFQDNs(): string[] {
    return [...this.byFQDN.keys()].sort();
  }

  getConfigFiles(): Record<string, DomainConfig> {
    return this.configFiles;
  }

  getValidationErrors(): Map<string, z.core.$ZodError> {
    return this.validationErrors;
  }

  hasErrors(): boolean {
    return this.validationErrors.size > 0;
  }

  getStats() {
    return {
      totalRecords: this.records.length,
      totalFQDNs: this.byFQDN.size,
      totalConfigs: Object.keys(this.configFiles).length,
      validationErrors: this.validationErrors.size,
    };
  }
}
