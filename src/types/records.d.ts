export interface CloudflareDNSRecord {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

export interface DNSRecordInput {
  name: string;
  type: string;
  [key: string]: unknown;
}

export interface DNSRecordWithId extends DNSRecordInput {
  id: string;
}
