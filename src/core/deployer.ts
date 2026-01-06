import type { DomainRegistry } from './registry';
import type { CloudflareManager } from '@/services/cloudflare';
import type { ExpandedDNSRecord } from '@/types/schema';
import type { GlobalConfig } from '@/config';
import type { CloudflareDNSRecord, DNSRecordInput, DNSRecordWithId } from '@/types/records';
import type { DeploymentResult } from '@/types/results';
import { LooseDomainRecordSchema } from '@/schemas/domain';

export interface DeploymentDiff {
  available: boolean;
  toCreate: DNSRecordInput[];
  toUpdate: DNSRecordWithId[];
  toDelete: DNSRecordWithId[];
}

/**
 * Domain Deployer - Calculate and apply DNS record diffs
 */
export class DomainDeployer {
  constructor(
    private registry: DomainRegistry,
    private cloudflare: CloudflareManager,
    private config: GlobalConfig,
    private domain: string,
  ) {}

  async calculateDiff(zoneId: string): Promise<DeploymentDiff> {
    const localRecords = this.registry.getAll();
    const remoteRecords = await this.cloudflare.listDNSRecords(zoneId);
    return this.diffRecords(localRecords, remoteRecords);
  }

  /**
   * Atomic batch update - caller must check diff.available first
   */
  async applyDiff(zoneId: string, diff: DeploymentDiff): Promise<DeploymentResult> {
    // Early return if no changes
    if (diff.toCreate.length === 0 && diff.toUpdate.length === 0 && diff.toDelete.length === 0) {
      return { created: 0, updated: 0, deleted: 0 };
    }

    // Atomic batch update
    return await this.cloudflare.batchUpdate(zoneId, {
      deletes: diff.toDelete.map(item => ({ id: item.id })),
      patches: diff.toUpdate,
      posts: diff.toCreate,
    });
  }

  private diffRecords(
    local: ExpandedDNSRecord[],
    remote: CloudflareDNSRecord[],
  ): DeploymentDiff {
    // 1. 过滤黑名单 + 清洗数据
    const filteredRemote = remote.filter(record => !this.isBlacklisted(record.name));

    const cleanedLocal = local.map(record =>
      LooseDomainRecordSchema.parse(record),
    );

    const cleanedRemote = filteredRemote.map(record => ({
      id: record.id,
      dns: LooseDomainRecordSchema.parse(record),
    }));

    // 2. 按 name:type 分组
    const localGroups = this.groupByIdentity(cleanedLocal);
    const remoteGroups = this.groupByIdentity(cleanedRemote);

    const allIdentities = new Set([
      ...localGroups.keys(),
      ...remoteGroups.keys(),
    ]);

    const toCreate: DNSRecordInput[] = [];
    const toUpdate: DNSRecordWithId[] = [];
    const toDelete: DNSRecordWithId[] = [];

    // 3. 对每个 name:type 组做 diff
    for (const identity of allIdentities) {
      const localRecords = localGroups.get(identity) ?? [];
      const remoteRecords = remoteGroups.get(identity) ?? [];

      const diff = this.diffRecordGroup(localRecords, remoteRecords);
      toCreate.push(...diff.toCreate);
      toUpdate.push(...diff.toUpdate);
      toDelete.push(...diff.toDelete);
    }

    const totalChanges = toCreate.length + toUpdate.length + toDelete.length;

    return {
      toCreate,
      toUpdate,
      toDelete,
      available: totalChanges <= 200,
    };
  }

  /**
   * 按 name:type 分组
   */
  private groupByIdentity<T extends { dns: DNSRecordInput } | DNSRecordInput>(
    records: T[],
  ): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    for (const record of records) {
      const dns = 'dns' in record ? record.dns : record;
      const identity = `${dns.name}:${dns.type}`;

      const group = groups.get(identity);
      if (group) {
        group.push(record);
      } else {
        groups.set(identity, [record]);
      }
    }

    return groups;
  }

  /**
   * 对单个 name:type 组内的记录做 diff
   *
   * 算法：
   * 1. 清理完全相同的记录
   * 2. 剩余的尽量配对成 update（减少总操作数）
   * 3. local 多的 → create，remote 多的 → delete
   */
  private diffRecordGroup(
    localRecords: DNSRecordInput[],
    remoteRecords: { id: string; dns: DNSRecordInput }[],
  ): {
    toCreate: DNSRecordInput[];
    toUpdate: DNSRecordWithId[];
    toDelete: DNSRecordWithId[];
  } {
    const localRemaining: DNSRecordInput[] = [];
    const remoteRemaining: { id: string; dns: DNSRecordInput }[] = [...remoteRecords];

    // 1. 清理完全相同的记录
    for (const local of localRecords) {
      const localHash = JSON.stringify(local);
      const matchIndex = remoteRemaining.findIndex(r => JSON.stringify(r.dns) === localHash);

      if (matchIndex >= 0) {
        // 找到相同的，从 remote 中移除
        remoteRemaining.splice(matchIndex, 1);
      } else {
        // 没找到，加入 localRemaining
        localRemaining.push(local);
      }
    }

    // 2. 配对剩余的记录（优先 update）
    const toCreate: DNSRecordInput[] = [];
    const toUpdate: DNSRecordWithId[] = [];
    const toDelete: DNSRecordWithId[] = [];

    const minLen = Math.min(localRemaining.length, remoteRemaining.length);

    for (let i = 0; i < minLen; i++) {
      toUpdate.push({ id: remoteRemaining[i].id, ...localRemaining[i] });
    }

    for (let i = minLen; i < localRemaining.length; i++) {
      toCreate.push(localRemaining[i]);
    }

    for (let i = minLen; i < remoteRemaining.length; i++) {
      toDelete.push({ id: remoteRemaining[i].id, ...remoteRemaining[i].dns });
    }

    return { toCreate, toUpdate, toDelete };
  }

  /**
   * Check if FQDN matches root domain or reserved subdomains
   */
  private isBlacklisted(fqdn: string): boolean {
    // Rule 1: Always protect root domain (hardcoded for safety)
    if (fqdn === this.domain) {
      return true;
    }

    // Rule 2: Check reserved subdomains (configurable)
    const reservedSubdomains = this.config.reserved_subdomains;

    for (const subdomain of reservedSubdomains) {
      const blacklistedFQDN = `${subdomain}.${this.domain}`;

      // Exact match or subdomain match
      if (fqdn === blacklistedFQDN || fqdn.endsWith(`.${blacklistedFQDN}`)) {
        return true;
      }
    }

    return false;
  }
}
