export interface DomainInfo {
  name: string;
  enabled: boolean;
  description: string;
  cloudflare_zone_id: string;
}

export interface GlobalConfig {
  domains: DomainInfo[];
  max_records_per_file: number;
  max_subdomains_per_user: number;
  cloudflare_timeout: number;
  root_txt_reserved_names: string[];
  reserved_subdomains: string[];
}

export default {
  domains: [
    {
      name: 'ciao.su',
      enabled: true,
      description: '基本二级域名',
      cloudflare_zone_id: 'fe810c0a3352cd3c33e3f27c5be38a3c',
    },
    {
      name: 'ciallo.de',
      enabled: false,
      description: '备用二级域名',
      cloudflare_zone_id: 'cf22f56a4dbdab9fd81a7f2048ffa457',
    },
  ],

  max_records_per_file: 10,
  max_subdomains_per_user: 3,
  cloudflare_timeout: 30,

  root_txt_reserved_names: ['_vercel'],

  reserved_subdomains: [
    'www', '_dmarc', 'edgeonereclaim',
    'mail', 'email', 'webmail', 'ns', 'dns',
    'api', 'cdn', 'ftp', 'sftp',
    'admin', 'panel', 'dashboard', 'control',
    'dev', 'test', 'staging', 'demo',
    'blog', 'forum', 'wiki', 'docs',
    'app', 'mobile', 'static', 'assets',
  ],
} as const satisfies GlobalConfig;
