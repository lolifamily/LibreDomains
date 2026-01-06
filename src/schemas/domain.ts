import { z } from 'zod';
import config from '@/config';
import type { DomainRecord, RootLevelRecord, DomainConfig, ExpandedDNSRecord } from '@/types/schema';

export const OwnerSchema = z.strictObject({
  github: z.string()
    .regex(/^[a-zA-Z0-9-]+$/, 'GitHub 用户名只能包含大小写字母、数字、连字符')
    .min(1, 'GitHub 用户名不能为空'),

  name: z.string().min(1, '所有者姓名不能为空'),

  email: z.email('无效的邮箱地址'),
});

const BaseRecordFields = {
  name: z.union([
    z.literal('@'),
    z.string().min(1, '记录名不能为空')
      .regex(/^[a-z0-9._-]+$/, '记录名只能包含小写字母、数字、点、下划线、连字符'),
  ]),

  ttl: z.union([
    z.literal(1), // Cloudflare 特殊值：自动 TTL
    z.number().int('TTL 必须是整数')
      .min(60, 'TTL 最小 60 秒')
      .max(86400, 'TTL 最大 86400 秒'),
  ]).default(1),
};

const SubdomainContent = z.string()
  .min(1, '子域名不能为空')
  .max(63, '子域名最长 63 字符')
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, '子域名只能包含小写字母、数字、连字符，且不能以连字符开头或结尾');

const IPv4Content = z.ipv4('必须是有效的 IPv4 地址 (例如: 192.168.1.1)');
const IPv6Content = z.ipv6('必须是有效的 IPv6 地址 (例如: 2606:50c0:8000::153)');
const HostnameContent = z.hostname('必须是有效的域名 (例如: example.com 或 mail.example.com)');

// FQDN for DNS record targets (auto-append trailing dot)
const FQDNContent = z.hostname('必须是有效的 FQDN (例如: example.com 或 mail.example.com)')
  .transform((val) => {
    // DNS standard: hostnames in record targets must be FQDN (with trailing dot)
    // Auto-append if user didn't provide it
    if (val.endsWith('.')) {
      return val;
    }
    return `${val}.`;
  });

const TXTContent = z.string()
  .min(1, 'TXT 记录内容不能为空')
  .max(1000, 'TXT 记录内容不能超过 1000 字符')
  .transform((val) => {
    // RFC-1035: TXT record content must be quoted
    // Auto-wrap if user didn't provide quotes
    if (val.startsWith('"') && val.endsWith('"')) {
      return val;
    }
    return `"${val}"`;
  });

const ConfigFileContent = z.string().endsWith('.json', '配置文件必须以 .json 结尾');

const settingsContentRaw = z.strictObject({
  ipv4_only: z.boolean().optional(),
  ipv6_only: z.boolean().optional(),
});
const settingsContent = settingsContentRaw.default({});

const settingsWithFlattening = settingsContentRaw.extend({
  flatten_cname: z.boolean().default(false),
}).default({ flatten_cname: false });

function isSubdomainOf(child: string, parent: string): boolean {
  if (parent === '@') return true;
  return child.endsWith(`.${parent}`);
}

const ARecordSchema = z.strictObject({
  type: z.literal('A'),
  ...BaseRecordFields,
  content: IPv4Content,
  proxied: z.boolean().default(false),
  settings: settingsContent,
});

const AAAARecordSchema = z.strictObject({
  type: z.literal('AAAA'),
  ...BaseRecordFields,
  content: IPv6Content,
  proxied: z.boolean().default(false),
  settings: settingsContent,
});

const CAARecordSchema = z.strictObject({
  type: z.literal('CAA'),
  ...BaseRecordFields,
  content: z.strictObject({
    flags: z.number()
      .int('Flags 必须是整数')
      .min(0, 'Flags 最小为 0')
      .max(255, 'Flags 最大为 255'),
    tag: z.enum(['issue', 'issuewild', 'issuemail', 'iodef']),
    value: z.string().min(1, 'Value 不能为空'),
  }),
  proxied: z.literal(false).default(false),
  settings: settingsContent,
});

const CNAMERecordSchema = z.strictObject({
  type: z.literal('CNAME'),
  ...BaseRecordFields,
  content: FQDNContent,
  proxied: z.boolean().default(false),
  settings: settingsWithFlattening,
});

const TXTRecordSchema = z.strictObject({
  type: z.literal('TXT'),
  ...BaseRecordFields,
  content: TXTContent,
  proxied: z.literal(false).default(false),
  settings: settingsContent,
});

const MXRecordSchema = z.strictObject({
  type: z.literal('MX'),
  ...BaseRecordFields,
  content: FQDNContent,
  priority: z.number()
    .int('优先级必须是整数')
    .min(0, '优先级最小为 0')
    .max(65535, '优先级最大为 65535'),
  proxied: z.literal(false).default(false),
  settings: settingsContent,
});

const NSRecordSchema = z.strictObject({
  type: z.literal('NS'),
  ...BaseRecordFields,
  content: FQDNContent,
  proxied: z.literal(false).default(false),
  settings: settingsContent.optional(),
});

const DSRecordSchema = z.strictObject({
  type: z.literal('DS'),
  ...BaseRecordFields,
  data: z.strictObject({
    key_tag: z.number()
      .int('Key Tag 必须是整数')
      .min(0, 'Key Tag 最小为 0')
      .max(65535, 'Key Tag 最大为 65535'),
    algorithm: z.number()
      .int('Algorithm 必须是整数')
      .min(0, 'Algorithm 最小为 0')
      .max(255, 'Algorithm 最大为 255'),
    digest_type: z.number()
      .int('Digest Type 必须是整数')
      .min(0, 'Digest Type 最小为 0')
      .max(255, 'Digest Type 最大为 255'),
    digest: z.hex('必须是有效的十六进制字符串 (例如: 0123456789abcdef)'),
  }),
  proxied: z.literal(false).default(false),
  settings: settingsContent,
});

const SRVRecordSchema = z.strictObject({
  type: z.literal('SRV'),
  ...BaseRecordFields,
  data: z.strictObject({
    priority: z.number()
      .int('优先级必须是整数')
      .min(0, '优先级最小为 0')
      .max(65535, '优先级最大为 65535'),
    weight: z.number()
      .int('权重必须是整数')
      .min(0, '权重最小为 0')
      .max(65535, '权重最大为 65535'),
    port: z.number()
      .int('端口必须是整数')
      .min(0, '端口最小为 0')
      .max(65535, '端口最大为 65535'),
    target: FQDNContent,
  }),
  proxied: z.literal(false).default(false),
  settings: settingsContent,
});

export const DomainRecordSchema = z.discriminatedUnion('type', [
  ARecordSchema,
  AAAARecordSchema,
  CAARecordSchema,
  CNAMERecordSchema,
  TXTRecordSchema,
  MXRecordSchema,
  NSRecordSchema,
  DSRecordSchema,
  SRVRecordSchema,
]);

export const LooseDomainRecordSchema = z.discriminatedUnion('type', [
  z.object(ARecordSchema.shape),
  z.object(AAAARecordSchema.shape),
  z.object(CAARecordSchema.shape),
  z.object(CNAMERecordSchema.shape),
  z.object(TXTRecordSchema.shape),
  z.object(MXRecordSchema.shape),
  z.object(NSRecordSchema.shape),
  z.object(DSRecordSchema.shape),
  z.object(SRVRecordSchema.shape),
]);

const RootLevelNameSchema = z.string()
  .regex(/^[a-z0-9_-]+$/, '记录名只能包含小写字母、数字、下划线、连字符')
  .min(1, '记录名不能为空')
  .refine(
    name => !config.reserved_subdomains.some(reserved => reserved === name),
    { error: `记录名是系统保留子域名，不能使用` },
  );

const RootLevelCNAMENameSchema = RootLevelNameSchema
  .refine(
    name => !config.root_txt_reserved_names.some(reserved => reserved === name),
    { error: `记录名是 TXT 保留名称，不能用于 CNAME` },
  );

const RootLevelTXTSchema = TXTRecordSchema
  .omit({ name: true })
  .extend({
    name: RootLevelNameSchema,
  });

const RootLevelCNAMESchema = CNAMERecordSchema
  .omit({ name: true, proxied: true })
  .extend({
    name: RootLevelCNAMENameSchema,
    proxied: z.literal(false).optional(),
  });

export const RootLevelRecordSchema = z.discriminatedUnion('type', [
  RootLevelTXTSchema,
  RootLevelCNAMESchema,
]);

export const DomainConfigSchema = z.strictObject({
  description: z.string().min(1, '描述不能为空'),
  owner: OwnerSchema,
  nocheck: z.boolean().default(false),
  records: z.array(DomainRecordSchema)
    .min(1, '至少需要一条记录')
    .superRefine((records, ctx) => {
      const byName = new Map<string, typeof records>();

      for (const record of records) {
        const existing = byName.get(record.name);
        if (existing) {
          existing.push(record);
        } else {
          byName.set(record.name, [record]);
        }
      }

      for (const [name, recs] of byName) {
        const addrRecords = recs.filter(r => ['A', 'AAAA', 'CNAME'].includes(r.type));

        if (addrRecords.length > 1) {
          const hasCNAME = addrRecords.some(r => r.type === 'CNAME');
          const hasAorAAAA = addrRecords.some(r => r.type === 'A' || r.type === 'AAAA');

          if (hasCNAME && hasAorAAAA) {
            ctx.addIssue({
              code: 'custom',
              message: `name="${name}" 下同时存在 CNAME 和 A/AAAA 记录，冲突（即使 Cloudflare 支持 CNAME flattening，这仍然是配置错误）`,
            });
          }

          const proxiedStates = addrRecords.map(r => r.proxied);
          const allProxied = proxiedStates.every(p => p);
          const allUnproxied = proxiedStates.every(p => !p);

          if (!allProxied && !allUnproxied) {
            ctx.addIssue({
              code: 'custom',
              message: `name="${name}" 下的 A/AAAA/CNAME 记录的 proxied 状态不一致（${proxiedStates.filter(p => p).length} 条代理，${proxiedStates.filter(p => !p).length} 条未代理），请统一设置`,
            });
          }
        }

        const nsRecords = recs.filter(r => r.type === 'NS');
        const dsRecords = recs.filter(r => r.type === 'DS');
        const otherRecords = recs.filter(r => r.type !== 'NS' && r.type !== 'DS');

        if (nsRecords.length > 0 && otherRecords.length > 0) {
          const otherTypes = [...new Set(otherRecords.map(r => r.type))].join(', ');
          ctx.addIssue({
            code: 'custom',
            message: `name="${name}" 有 NS 记录（域名委托），不能同时存在其他类型记录 (${otherTypes})。根据 RFC 规范，NS 只能与 DS 记录共存`,
          });
        }

        if (dsRecords.length > 0 && nsRecords.length === 0) {
          ctx.addIssue({
            code: 'custom',
            message: `name="${name}" 有 DS 记录但缺少对应的 NS 记录。DS 用于 DNSSEC 签名验证，必须与 NS 记录配合使用`,
          });
        }

        if (nsRecords.length > 0) {
          const conflictingNames: string[] = [];

          for (const [otherName] of byName) {
            if (isSubdomainOf(otherName, name)) {
              conflictingNames.push(otherName);
            }
          }

          if (conflictingNames.length > 0) {
            ctx.addIssue({
              code: 'custom',
              message: `name="${name}" 有 NS 记录（域名委托），不能同时配置其子域名 (${conflictingNames.join(', ')})。根据 DNS 规范，子域名应由委托的 NS 服务器管理`,
            });
          }
        }
      }
    }),

  rootLevelRecords: z.array(RootLevelRecordSchema).default([]),
});

const customDataSchema = z.strictObject({
  originalName: BaseRecordFields.name,
  owner: OwnerSchema.shape.github,
  source: z.enum(['records', 'rootLevelRecords']),
  configFile: z.string().min(1, '配置文件路径不能为空'),
  display: z.string().min(1, '显示字符串不能为空'),
});

const expandDNSRecordSchema = {
  name: z.string().min(1, 'FQDN 不能为空'),
  customData: customDataSchema,
};

export const ExpandedDNSRecordSchema = z.discriminatedUnion('type', [
  ARecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
  AAAARecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
  CAARecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
  CNAMERecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
  TXTRecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
  MXRecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
  NSRecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
  DSRecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
  SRVRecordSchema.omit({ name: true }).extend(expandDNSRecordSchema),
]);

function expandName(name: string, subdomain: string, domain: string): string {
  if (name === '@') {
    return subdomain ? `${subdomain}.${domain}` : domain;
  }
  return subdomain ? `${name}.${subdomain}.${domain}` : `${name}.${domain}`;
}

function generateDisplayString(record: DomainRecord | RootLevelRecord, fqdn: string, owner?: string): string {
  const { name, type, ...fields } = record;
  void name;
  const fieldsJson = JSON.stringify(fields, Object.keys(fields).sort());
  return owner ? `${fqdn} ${type} ${fieldsJson} (@${owner})` : `${fqdn} ${type} ${fieldsJson}`;
}

/**
 * Expand records from relative names to FQDNs with customData
 * Returns flat array of ExpandedDNSRecord (both records and rootLevelRecords)
 */
export function expandRecords(
  config: DomainConfig,
  subdomain: string,
  domain: string,
  configFile: string,
): ExpandedDNSRecord[] {
  const records = config.records.map((r): ExpandedDNSRecord => {
    const fqdn = expandName(r.name, subdomain, domain);
    const { name, ...dnsFields } = r;

    return {
      ...dnsFields,
      name: fqdn,
      customData: {
        originalName: name,
        owner: config.owner.github,
        source: 'records' as const,
        configFile,
        display: generateDisplayString(r, fqdn, config.owner.github),
      },
    };
  });

  const rootLevelRecords = config.rootLevelRecords.map((r): ExpandedDNSRecord => {
    const fqdn = expandName(r.name, '', domain);
    const { name, ...dnsFields } = r;

    return {
      ...dnsFields,
      name: fqdn,
      customData: {
        originalName: name,
        owner: config.owner.github,
        source: 'rootLevelRecords' as const,
        configFile,
        display: generateDisplayString(r, fqdn, config.owner.github),
      },
    };
  });

  return [...records, ...rootLevelRecords];
}
