// 域名数据API - 从GitHub仓库获取真实域名数据
class DomainAPI {
  constructor() {
    this.baseUrl = 'https://api.github.com/repos/bestzwei/LibreDomains/contents/domains';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
  }

  // 获取所有可用域名
  async getAvailableDomains() {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) throw new Error('Failed to fetch domains');

      const data = await response.json();
      return data
        .filter(item => item.type === 'dir')
        .map(item => item.name);
    } catch (error) {
      console.error('获取可用域名失败:', error);
      return ['ciao.su', 'ciallo.de']; // 回退到默认值
    }
  }

  // 获取指定域名下的所有子域名
  async getSubdomains(domain) {
    const cacheKey = `subdomains_${domain}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/${domain}`);
      if (!response.ok) throw new Error(`Failed to fetch subdomains for ${domain}`);

      const data = await response.json();
      const subdomains = data
        .filter(item => item.type === 'file' && item.name.endsWith('.json'))
        .map(item => item.name.replace('.json', ''));

      this.setCache(cacheKey, subdomains);
      return subdomains;
    } catch (error) {
      console.error(`获取 ${domain} 子域名失败:`, error);
      return [];
    }
  }

  // 获取指定子域名的详细信息
  async getDomainInfo(subdomain, domain) {
    const cacheKey = `domain_${subdomain}_${domain}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/${domain}/${subdomain}.json`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch domain info for ${subdomain}.${domain}`);
      }

      const data = await response.json();
      const content = JSON.parse(atob(data.content));

      // 添加一些额外的元数据
      const domainInfo = {
        ...content,
        created: this.extractDateFromCommit(data) || content.created || '未知',
        lastModified: data.sha ? new Date().toISOString().split('T')[0] : '未知',
      };

      this.setCache(cacheKey, domainInfo);
      return domainInfo;
    } catch (error) {
      console.error(`获取 ${subdomain}.${domain} 信息失败:`, error);
      return null;
    }
  }

  // 获取随机的已注册域名示例
  async getRandomExamples(count = 6) {
    try {
      const domains = await this.getAvailableDomains();
      const examples = [];

      for (const domain of domains.slice(0, 2)) { // 只检查前两个域名
        const subdomains = await this.getSubdomains(domain);
        const randomSubdomains = this.shuffleArray(subdomains).slice(0, Math.ceil(count / 2));

        for (const subdomain of randomSubdomains) {
          examples.push({
            subdomain,
            domain,
            icon: this.getIconForSubdomain(subdomain),
          });
        }
      }

      return this.shuffleArray(examples).slice(0, count);
    } catch (error) {
      console.error('获取示例域名失败:', error);
      return [
        { subdomain: 'meeting', domain: 'ciao.su', icon: 'fas fa-video' },
        { subdomain: 'comi', domain: 'ciao.su', icon: 'fas fa-blog' },
        { subdomain: 'ju', domain: 'ciao.su', icon: 'fas fa-tv' },
        { subdomain: 'xx', domain: 'ciao.su', icon: 'fas fa-user' },
      ];
    }
  }

  // 缓存管理
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // 工具函数
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getIconForSubdomain(subdomain) {
    const iconMap = {
      blog: 'fas fa-blog',
      api: 'fas fa-code',
      app: 'fas fa-mobile-alt',
      dev: 'fas fa-laptop-code',
      docs: 'fas fa-book',
      cdn: 'fas fa-cloud',
      mail: 'fas fa-envelope',
      www: 'fas fa-globe',
      admin: 'fas fa-cog',
      test: 'fas fa-flask',
      demo: 'fas fa-play',
      tv: 'fas fa-tv',
      meeting: 'fas fa-video',
      chat: 'fas fa-comments',
      forum: 'fas fa-users',
      wiki: 'fas fa-book-open',
    };

    return iconMap[subdomain.toLowerCase()] || 'fas fa-globe';
  }

  extractDateFromCommit(data) {
    // 这里可以通过GitHub API获取更准确的创建时间
    // 目前返回null，使用配置文件中的时间
    return null;
  }
}

// 创建全局实例
window.domainAPI = new DomainAPI();
