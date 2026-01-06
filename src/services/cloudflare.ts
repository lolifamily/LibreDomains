import type { CloudflareDNSRecord, DNSRecordInput, DNSRecordWithId } from '@/types/records';
import type { DeploymentResult } from '@/types/results';

/**
 * Cloudflare API standard response format
 * @see https://developers.cloudflare.com/api/operations/
 */
interface CloudflareAPIResponse<T = unknown> {
  success: boolean;
  errors: { code: number; message: string }[];
  messages: { code: number; message: string }[];
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
  };
}

/**
 * Cloudflare API Manager
 */
export class CloudflareManager {
  private baseURL = 'https://api.cloudflare.com/client/v4';
  private apiToken: string;

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error('Cloudflare API token is required');
    }
    this.apiToken = apiToken;
  }

  async listDNSRecords(zoneId: string): Promise<CloudflareDNSRecord[]> {
    const response = await this.request<CloudflareDNSRecord[]>(
      `/zones/${zoneId}/dns_records?per_page=5000`,
    );

    // If we hit the pagination limit, the system design has failed
    if (response.result_info && response.result_info.total_count > 5000) {
      throw new Error(`DNS records exceed design limit: ${response.result_info.total_count} records. Architecture review required.`);
    }

    return response.result;
  }

  /**
   * Atomic batch update (deletes → patches → posts)
   * All operations succeed or all fail (rollback on error)
   */
  async batchUpdate(
    zoneId: string,
    operations: {
      deletes?: { id: string }[];
      patches?: DNSRecordWithId[];
      posts?: DNSRecordInput[];
    },
  ): Promise<DeploymentResult> {
    const response = await this.request<{
      deletes?: CloudflareDNSRecord[];
      patches?: CloudflareDNSRecord[];
      posts?: CloudflareDNSRecord[];
    }>(`/zones/${zoneId}/dns_records/batch`, {
      method: 'POST',
      body: JSON.stringify(operations),
    });

    return {
      created: response.result.posts?.length ?? 0,
      updated: response.result.patches?.length ?? 0,
      deleted: response.result.deletes?.length ?? 0,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<CloudflareAPIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.apiToken}`);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse as Cloudflare API response structure
    const data = await response.json() as CloudflareAPIResponse<T>;

    // Check both HTTP status and Cloudflare's success flag
    if (!response.ok || !data.success) {
      const errors = data.errors.map(e => e.message).join(', ');
      throw new Error(`Cloudflare API error: ${errors}`);
    }

    return data;
  }
}
