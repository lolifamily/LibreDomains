import type { z } from 'zod';
import type {
  OwnerSchema,
  DomainRecordSchema,
  RootLevelRecordSchema,
  DomainConfigSchema,
  ExpandedDNSRecordSchema,
} from '@/schemas/domain';

export type Owner = z.infer<typeof OwnerSchema>;
export type DomainRecord = z.infer<typeof DomainRecordSchema>;
export type RootLevelRecord = z.infer<typeof RootLevelRecordSchema>;
export type DomainConfig = z.infer<typeof DomainConfigSchema>;
export type ExpandedDNSRecord = z.infer<typeof ExpandedDNSRecordSchema>;
