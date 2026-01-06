// WHOIS 查询页面专用 JavaScript 文件
document.addEventListener('DOMContentLoaded', function () {
  // 初始化查询页面功能
  initQuerySystem();
  initHistory();
  updateStats();
  loadRegisteredExamples();
  loadDomainData();
});

let currentTab = 'whois';
let queryHistory = JSON.parse(localStorage.getItem('queryHistory') || '[]');
let domainData = {}; // 缓存从仓库加载的域名数据

// 初始化查询系统
function initQuerySystem() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const subdomainInput = document.getElementById('subdomainInput');
  const domainSelect = document.getElementById('domainSelect');
  const queryBtn = document.getElementById('queryBtn');
  const queryResults = document.getElementById('queryResults');

  // 标签页切换
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentTab = this.getAttribute('data-tab');

      // 更新占位符文本
      updatePlaceholder();
    });
  });

  // 输入验证
  if (subdomainInput) {
    subdomainInput.addEventListener('input', function () {
      const value = this.value.toLowerCase();
      this.value = value;

      // 实时验证
      validateSubdomainInput(this, value);
    });

    subdomainInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        performQuery();
      }
    });
  }

  // 查询按钮
  if (queryBtn) {
    queryBtn.addEventListener('click', performQuery);
  }

  // 执行查询
  async function performQuery() {
    const subdomain = subdomainInput.value.trim().toLowerCase();
    const domain = domainSelect.value;

    if (!subdomain) {
      showError('请输入子域名');
      return;
    }

    if (subdomain.length < 1 || subdomain.length > 63) {
      showError('子域名长度应在1-63个字符之间');
      return;
    }

    const fullDomain = subdomain + '.' + domain;

    // 显示加载状态
    showLoading();

    // 添加到历史记录
    addToHistory(fullDomain, currentTab);

    // 执行WHOIS查询
    await performWhoisQuery(fullDomain, subdomain, domain);

    // 更新统计
    updateQueryCount();
  }

  // 更新占位符
  function updatePlaceholder() {
    if (!subdomainInput) return;
    subdomainInput.placeholder = '输入已注册的子域名';
  }
}

// 验证子域名输入
function validateSubdomainInput(input, value) {
  const inputWrapper = input.closest('.input-wrapper');

  // 移除之前的状态
  input.classList.remove('error', 'success');

  if (!value) {
    return;
  }

  if (LibreDomains.validateSubdomain(value)) {
    input.classList.add('success');
  } else {
    input.classList.add('error');
  }
}

// 显示加载状态
function showLoading() {
  const queryResults = document.getElementById('queryResults');
  queryResults.innerHTML = `
        <div class="result-loading">
            <div class="loading-animation">
                <div class="loading-spinner"></div>
                <div class="loading-waves">
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                </div>
            </div>
            <h3>正在查询中...</h3>
            <p>请稍候，正在获取域名信息</p>
        </div>
    `;
}

// 显示错误
function showError(message) {
  const queryResults = document.getElementById('queryResults');
  queryResults.innerHTML = `
        <div class="result-error">
            <div class="result-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>查询失败</h3>
            <p>${message}</p>
        </div>
    `;
}

// 检查可用性
function checkAvailability(fullDomain, subdomain, domain) {
  // 模拟API调用
  setTimeout(() => {
    const isAvailable = !checkIfDomainExists(subdomain, domain);

    if (isAvailable) {
      showAvailabilityResult(fullDomain, true);
    } else {
      showAvailabilityResult(fullDomain, false, getDomainInfo(subdomain, domain));
      updateRegisteredCount();
    }
  }, 1500);
}

// WHOIS查询
async function performWhoisQuery(fullDomain, subdomain, domain) {
  try {
    const domainInfo = await getRealDomainInfo(subdomain, domain);
    showWhoisResult(fullDomain, domainInfo);
    if (domainInfo) {
      updateRegisteredCount();
    }
  } catch (error) {
    console.error('WHOIS查询失败:', error);
    showWhoisResult(fullDomain, null);
  }
}

// DNS查询
function performDnsQuery(fullDomain) {
  setTimeout(() => {
    const dnsRecords = getDnsRecords(fullDomain.split('.')[0], fullDomain.split('.').slice(1).join('.'));
    showDnsResult(fullDomain, dnsRecords);
  }, 1800);
}

// 显示可用性结果
function showAvailabilityResult(domain, isAvailable, domainInfo = null) {
  const queryResults = document.getElementById('queryResults');

  if (isAvailable) {
    queryResults.innerHTML = `
            <div class="result-success">
                <div class="result-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>域名可用！</h3>
                <div class="domain-name">${domain}</div>
                <p>恭喜！这个域名可以申请。</p>
                <div class="result-actions">
                    <a href="generator-simple.html?domain=${encodeURIComponent(domain)}" class="btn btn-primary">
                        <i class="fas fa-magic"></i>
                        <span>立即申请</span>
                    </a>
                    <button onclick="copyToClipboard('${domain}')" class="btn btn-outline">
                        <i class="fas fa-copy"></i>
                        <span>复制域名</span>
                    </button>
                </div>
            </div>
        `;
  } else {
    queryResults.innerHTML = `
            <div class="result-unavailable">
                <div class="result-icon">
                    <i class="fas fa-times-circle"></i>
                </div>
                <h3>域名已被占用</h3>
                <div class="domain-name">${domain}</div>
                <p>这个域名已经被其他用户注册。</p>
                ${domainInfo ? generateDomainInfoHtml(domainInfo) : ''}
                <div class="result-actions">
                    <button onclick="suggestAlternatives('${domain}')" class="btn btn-outline">
                        <i class="fas fa-lightbulb"></i>
                        <span>建议替代方案</span>
                    </button>
                </div>
            </div>
        `;
  }
}

// 显示WHOIS结果
function showWhoisResult(domain, domainInfo) {
  const queryResults = document.getElementById('queryResults');

  if (domainInfo) {
    const dnsRecordsHtml = domainInfo.records
      ? domainInfo.records.map(record => `
            <div class="dns-record">
                <div class="record-type ${record.type.toLowerCase()}">${record.type}</div>
                <div class="record-details">
                    <div class="record-name">${record.name === '@' ? domain : record.name + '.' + domain}</div>
                    <div class="record-content">${record.content}</div>
                    <div class="record-meta">
                        TTL: ${record.ttl}s
                        ${record.proxied ? '<span class="proxied">• 已代理</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('')
      : '';

    queryResults.innerHTML = `
            <div class="result-info">
                <div class="result-header">
                    <div class="result-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="result-title">
                        <h3>WHOIS 信息</h3>
                        <div class="domain-name">${domain}</div>
                    </div>
                </div>

                <div class="domain-details">
                    <div class="detail-section">
                        <h4>注册信息</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">注册者</span>
                                <span class="info-value">${domainInfo.owner?.name || '未知'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">注册时间</span>
                                <span class="info-value">${formatDate(domainInfo.created)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">状态</span>
                                <span class="info-value status-active">${domainInfo.status || '活跃'}</span>
                            </div>
                            ${domainInfo.owner?.github
                              ? `
                            <div class="info-item">
                                <span class="info-label">GitHub</span>
                                <span class="info-value">
                                    <a href="https://github.com/${domainInfo.owner.github}" target="_blank" rel="noopener">
                                        <i class="fab fa-github"></i>
                                        ${domainInfo.owner.github}
                                    </a>
                                </span>
                            </div>
                            `
                              : ''}
                            ${domainInfo.owner?.email
                              ? `
                            <div class="info-item">
                                <span class="info-label">邮箱</span>
                                <span class="info-value">${domainInfo.owner.email}</span>
                            </div>
                            `
                              : ''}
                            ${domainInfo.description
                              ? `
                            <div class="info-item full-width">
                                <span class="info-label">描述</span>
                                <span class="info-value">${domainInfo.description}</span>
                            </div>
                            `
                              : ''}
                        </div>
                    </div>

                    ${dnsRecordsHtml
                      ? `
                    <div class="detail-section">
                        <h4>DNS 记录</h4>
                        <div class="dns-records">
                            ${dnsRecordsHtml}
                        </div>
                    </div>
                    `
                      : ''}
                </div>

                <div class="result-actions">
                    <button onclick="copyToClipboard('${domain}')" class="btn btn-outline">
                        <i class="fas fa-copy"></i>
                        <span>复制域名</span>
                    </button>
                    ${domainInfo.owner?.github
                      ? `
                    <a href="https://github.com/${domainInfo.owner.github}" target="_blank" class="btn btn-outline">
                        <i class="fab fa-github"></i>
                        <span>访问 GitHub</span>
                    </a>
                    `
                      : ''}
                    <a href="http://${domain}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i>
                        <span>访问网站</span>
                    </a>
                </div>
            </div>
        `;
  } else {
    queryResults.innerHTML = `
            <div class="result-not-found">
                <div class="result-icon">
                    <i class="fas fa-question-circle"></i>
                </div>
                <h3>域名未注册</h3>
                <div class="domain-name">${domain}</div>
                <p>该域名尚未在 LibreDomains 注册或信息不可用</p>
                <div class="result-actions">
                    <a href="generator-simple.html?domain=${encodeURIComponent(domain)}" class="btn btn-primary">
                        <i class="fas fa-magic"></i>
                        <span>立即申请</span>
                    </a>
                    <a href="https://github.com/bestzwei/LibreDomains" target="_blank" class="btn btn-outline">
                        <i class="fab fa-github"></i>
                        <span>查看仓库</span>
                    </a>
                </div>
            </div>
        `;
  }
}

// 显示DNS结果
function showDnsResult(domain, dnsRecords) {
  const queryResults = document.getElementById('queryResults');

  if (dnsRecords && dnsRecords.length > 0) {
    const recordsHtml = dnsRecords.map(record => `
            <div class="dns-record">
                <div class="record-type ${record.type.toLowerCase()}">${record.type}</div>
                <div class="record-details">
                    <div class="record-name">${record.name}</div>
                    <div class="record-content">${record.content}</div>
                    <div class="record-meta">
                        TTL: ${record.ttl}s
                        ${record.proxied ? '<span class="proxied">• 已代理</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

    queryResults.innerHTML = `
            <div class="result-dns">
                <div class="result-icon">
                    <i class="fas fa-server"></i>
                </div>
                <h3>DNS 记录</h3>
                <div class="domain-name">${domain}</div>
                <div class="dns-records">
                    ${recordsHtml}
                </div>
                <div class="dns-summary">
                    找到 ${dnsRecords.length} 条DNS记录
                </div>
                <div class="result-actions">
                    <button onclick="copyDnsRecords('${domain}', ${JSON.stringify(dnsRecords).replace(/"/g, '&quot;')})" class="btn btn-outline">
                        <i class="fas fa-copy"></i>
                        <span>复制记录</span>
                    </button>
                </div>
            </div>
        `;
  } else {
    queryResults.innerHTML = `
            <div class="result-not-found">
                <div class="result-icon">
                    <i class="fas fa-question-circle"></i>
                </div>
                <h3>未找到DNS记录</h3>
                <div class="domain-name">${domain}</div>
                <p>该域名没有配置DNS记录或无法访问。</p>
            </div>
        `;
  }
}

// 生成域名信息HTML
function generateDomainInfoHtml(domainInfo) {
  return `
        <div class="domain-details">
            <div class="detail-section">
                <h4>注册信息</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">注册者</span>
                        <span class="info-value">${domainInfo.owner || '未知'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">注册时间</span>
                        <span class="info-value">${domainInfo.created || '未知'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">状态</span>
                        <span class="info-value status-active">${domainInfo.status || '活跃'}</span>
                    </div>
                    ${domainInfo.github
                      ? `
                    <div class="info-item">
                        <span class="info-label">GitHub</span>
                        <span class="info-value">
                            <a href="https://github.com/${domainInfo.github}" target="_blank">${domainInfo.github}</a>
                        </span>
                    </div>
                    `
                      : ''}
                </div>
            </div>
        </div>
    `;
}

// 检查域名是否存在
function checkIfDomainExists(subdomain, domain) {
  // 使用真实的域名数据检查
  return domainData[domain] && domainData[domain][subdomain];
}

// 获取真实域名信息
async function getRealDomainInfo(subdomain, domain) {
  // 首先检查缓存
  if (domainData[domain] && domainData[domain][subdomain]) {
    return domainData[domain][subdomain];
  }

  // 如果API可用，尝试从API获取
  if (window.domainAPI) {
    try {
      const info = await domainAPI.getDomainInfo(subdomain, domain);
      if (info) {
        // 缓存结果
        if (!domainData[domain]) domainData[domain] = {};
        domainData[domain][subdomain] = info;
        return info;
      }
    } catch (error) {
      console.error(`Failed to fetch ${subdomain}.${domain}:`, error);
    }
  }

  return null;
}

// 获取域名信息（保留兼容性）
function getDomainInfo(subdomain, domain) {
  return getRealDomainInfo(subdomain, domain) || {
    owner: { name: 'LibreDomains用户', github: 'example-user', email: 'user@example.com' },
    created: '2024-01-15',
    status: '活跃',
    description: '这是一个示例域名配置',
  };
}

// 获取DNS记录
function getDnsRecords(subdomain, domain) {
  // 模拟DNS记录
  if (checkIfDomainExists(subdomain, domain)) {
    return [
      {
        type: 'A',
        name: `${subdomain}.${domain}`,
        content: '192.168.1.1',
        ttl: 3600,
        proxied: true,
      },
      {
        type: 'CNAME',
        name: `www.${subdomain}.${domain}`,
        content: `${subdomain}.${domain}`,
        ttl: 3600,
        proxied: false,
      },
      {
        type: 'TXT',
        name: `${subdomain}.${domain}`,
        content: 'v=spf1 include:_spf.google.com ~all',
        ttl: 3600,
        proxied: false,
      },
    ];
  }
  return [];
}

// 初始化建议功能
function initSuggestions() {
  const suggestionBtns = document.querySelectorAll('.suggestion-btn');

  suggestionBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const suggestion = this.getAttribute('data-suggestion');
      const subdomainInput = document.getElementById('subdomainInput');

      if (subdomainInput && suggestion) {
        subdomainInput.value = suggestion;
        subdomainInput.focus();

        // 触发验证
        validateSubdomainInput(subdomainInput, suggestion);
      }
    });
  });
}

// 初始化历史记录
function initHistory() {
  displayHistory();

  // 清除历史记录按钮
  const clearHistoryBtn = document.getElementById('clearHistory');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', function () {
      if (confirm('确定要清除所有查询历史吗？')) {
        queryHistory = [];
        localStorage.setItem('queryHistory', JSON.stringify(queryHistory));
        displayHistory();
        LibreDomains.showNotification('查询历史已清除', 'success');
      }
    });
  }
}

// 显示历史记录
function displayHistory() {
  const historyContainer = document.getElementById('historyContainer');
  if (!historyContainer) return;

  if (queryHistory.length === 0) {
    historyContainer.innerHTML = `
            <div class="history-placeholder">
                <i class="fas fa-history"></i>
                <h3>暂无查询历史</h3>
                <p>开始查询域名后，历史记录将显示在这里</p>
            </div>
        `;
    return;
  }

  const historyHtml = queryHistory.slice(-10).reverse().map(item => `
        <div class="history-item" onclick="repeatQuery('${item.domain}', '${item.type}')">
            <div class="history-info">
                <div class="history-type ${item.type}">${getTypeLabel(item.type)}</div>
                <div class="history-domain">${item.domain}</div>
                <div class="history-time">${formatTime(item.timestamp)}</div>
            </div>
            <div class="history-result ${item.result}">
                <i class="fas fa-${getResultIcon(item.result)}"></i>
                <span>${getResultLabel(item.result)}</span>
            </div>
        </div>
    `).join('');

  historyContainer.innerHTML = historyHtml;
}

// 添加到历史记录
function addToHistory(domain, type, result = 'unknown') {
  const historyItem = {
    domain: domain,
    type: type,
    result: result,
    timestamp: Date.now(),
  };

  queryHistory.push(historyItem);

  // 限制历史记录数量
  if (queryHistory.length > 50) {
    queryHistory = queryHistory.slice(-50);
  }

  localStorage.setItem('queryHistory', JSON.stringify(queryHistory));
  displayHistory();
}

// 重复查询
function repeatQuery(domain, type) {
  const parts = domain.split('.');
  const subdomain = parts[0];
  const domainPart = parts.slice(1).join('.');

  // 设置输入值
  const subdomainInput = document.getElementById('subdomainInput');
  const domainSelect = document.getElementById('domainSelect');

  if (subdomainInput) subdomainInput.value = subdomain;
  if (domainSelect) domainSelect.value = domainPart;

  // 切换到对应标签页
  const tabBtn = document.querySelector(`[data-tab="${type}"]`);
  if (tabBtn) {
    tabBtn.click();
  }

  // 执行查询
  setTimeout(() => {
    const queryBtn = document.getElementById('queryBtn');
    if (queryBtn) queryBtn.click();
  }, 100);
}

// 辅助函数
function getTypeLabel(type) {
  const labels = {
    availability: '可用性',
    whois: 'WHOIS',
    dns: 'DNS',
  };
  return labels[type] || type;
}

function getResultIcon(result) {
  const icons = {
    available: 'check-circle',
    unavailable: 'times-circle',
    found: 'info-circle',
    unknown: 'question-circle',
  };
  return icons[result] || 'question-circle';
}

function getResultLabel(result) {
  const labels = {
    available: '可用',
    unavailable: '已占用',
    found: '已找到',
    unknown: '未知',
  };
  return labels[result] || '未知';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) { // 1分钟内
    return '刚刚';
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) { // 1天内
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString();
  }
}

// 更新统计数据
function updateStats() {
  // 更新查询统计
  const queryCountElement = document.getElementById('queryCount');
  const registeredCountElement = document.getElementById('registeredCount');

  if (queryCountElement) {
    const totalQueries = queryHistory.length;
    queryCountElement.textContent = totalQueries;
  }

  if (registeredCountElement) {
    const registeredCount = parseInt(localStorage.getItem('registeredCount') || '0');
    registeredCountElement.textContent = registeredCount;
  }
}

function updateQueryCount() {
  updateStats();
}

function updateRegisteredCount() {
  const registeredCountElement = document.getElementById('registeredCount');
  if (registeredCountElement) {
    let count = parseInt(localStorage.getItem('registeredCount') || '0');
    count++;
    localStorage.setItem('registeredCount', count.toString());
    LibreDomains.animateNumber(registeredCountElement, count);
  }
}

// 复制功能
function copyToClipboard(text) {
  LibreDomains.copyToClipboard(text).then(() => {
    LibreDomains.showNotification('已复制到剪贴板', 'success');
  }).catch(() => {
    LibreDomains.showNotification('复制失败', 'error');
  });
}

function copyWhoisInfo(domain, domainInfo) {
  const text = `域名: ${domain}\n注册者: ${domainInfo.owner}\n注册时间: ${domainInfo.created}\n状态: ${domainInfo.status}`;
  copyToClipboard(text);
}

function copyDnsRecords(domain, records) {
  const text = `${domain} DNS记录:\n` + records.map(record =>
    `${record.type} ${record.name} ${record.content} (TTL: ${record.ttl})`,
  ).join('\n');
  copyToClipboard(text);
}

// 建议替代方案
function suggestAlternatives(domain) {
  const parts = domain.split('.');
  const subdomain = parts[0];
  const domainPart = parts.slice(1).join('.');

  const suggestions = [
    `${subdomain}1`,
    `${subdomain}2`,
    `my${subdomain}`,
    `${subdomain}app`,
    `${subdomain}site`,
    `${subdomain}web`,
  ];

  const suggestionHtml = suggestions.map(suggestion =>
    `<button class="suggestion-btn" onclick="tryAlternative('${suggestion}.${domainPart}')">
            <i class="fas fa-arrow-right"></i>
            <span>${suggestion}.${domainPart}</span>
        </button>`,
  ).join('');

  const queryResults = document.getElementById('queryResults');
  queryResults.innerHTML += `
        <div class="alternative-suggestions" style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-light);">
            <h4>建议的替代方案：</h4>
            <div class="suggestions-grid">
                ${suggestionHtml}
            </div>
        </div>
    `;
}

function tryAlternative(domain) {
  const parts = domain.split('.');
  const subdomain = parts[0];
  const domainPart = parts.slice(1).join('.');

  const subdomainInput = document.getElementById('subdomainInput');
  const domainSelect = document.getElementById('domainSelect');

  if (subdomainInput) subdomainInput.value = subdomain;
  if (domainSelect) domainSelect.value = domainPart;

  // 执行查询
  setTimeout(() => {
    const queryBtn = document.getElementById('queryBtn');
    if (queryBtn) queryBtn.click();
  }, 100);
}

// 加载域名数据
async function loadDomainData() {
  try {
    if (!window.domainAPI) {
      console.warn('Domain API not available, using mock data');
      await loadMockDomainData();
      return;
    }

    // 获取可用域名
    const domains = await domainAPI.getAvailableDomains();
    console.log('可用域名:', domains);

    // 更新域名选择器
    updateDomainSelector(domains);

    // 预加载一些域名数据用于示例
    for (const domain of domains.slice(0, 2)) { // 只预加载前两个域名
      const subdomains = await domainAPI.getSubdomains(domain);
      domainData[domain] = {};

      // 预加载前几个子域名的详细信息
      for (const subdomain of subdomains.slice(0, 5)) {
        try {
          const info = await domainAPI.getDomainInfo(subdomain, domain);
          if (info) {
            domainData[domain][subdomain] = info;
          }
        } catch (error) {
          console.warn(`Failed to load ${subdomain}.${domain}:`, error);
        }
      }
    }

    console.log('域名数据加载完成:', domainData);
  } catch (error) {
    console.error('加载域名数据失败:', error);
    await loadMockDomainData();
  }
}

// 更新域名选择器
function updateDomainSelector(domains) {
  const domainSelect = document.getElementById('domainSelect');
  if (!domainSelect || !domains) return;

  domainSelect.innerHTML = '';
  domains.forEach((domain) => {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
    domainSelect.appendChild(option);
  });
}

// 模拟加载域名数据（回退方案）
async function loadMockDomainData() {
  // 模拟一些已注册的域名数据
  domainData['ciao.su'] = {
    meeting: {
      owner: { name: 'tsengvee', github: 'tsengvee', email: 'tsengvee@gmail.com' },
      records: [{ type: 'CNAME', name: '@', content: '2784b4c190d9b763.vercel-dns-017.com', ttl: 3600, proxied: false }],
      created: '2024-01-15',
      status: '活跃',
    },
    comi: {
      owner: { name: 'Comi', github: 'Comi-xf', email: 'comi@disroot.org' },
      records: [
        { type: 'CNAME', name: '@', content: 'comi.pages.dev', ttl: 3600, proxied: false },
        { type: 'CNAME', name: 'www', content: 'comi.pages.dev', ttl: 3600, proxied: false },
      ],
      created: '2024-02-10',
      status: '活跃',
      description: '个人博客网站',
    },
    ju: {
      owner: { name: 'JUJU', github: 'justn-gpt', email: 'gjustn@gmail.com' },
      records: [{ type: 'CNAME', name: 'hk', content: 'libretv-a9l.pages.dev', ttl: 3600, proxied: false }],
      created: '2024-01-20',
      status: '活跃',
    },
    xx: {
      owner: { name: 'oyz', github: 'boosoyz', email: 'boosoyz@gmail.com' },
      records: [{ type: 'CNAME', name: 'www', content: 'koyeb-16u.pages.dev', ttl: 3600, proxied: true }],
      created: '2024-01-25',
      status: '活跃',
    },
  };

  domainData['ciallo.de'] = {
    example: {
      owner: { name: 'Example User', github: 'example', email: 'example@example.com' },
      records: [{ type: 'A', name: '@', content: '192.168.1.1', ttl: 3600, proxied: true }],
      created: '2024-01-01',
      status: '活跃',
    },
  };
}

// 加载已注册域名示例
async function loadRegisteredExamples() {
  const container = document.getElementById('registeredExamples');
  if (!container) return;

  try {
    let examples;

    if (window.domainAPI) {
      // 使用API获取真实示例
      examples = await domainAPI.getRandomExamples(6);
    } else {
      // 回退到静态示例
      examples = [
        { subdomain: 'meeting', domain: 'ciao.su', icon: 'fas fa-video' },
        { subdomain: 'comi', domain: 'ciao.su', icon: 'fas fa-blog' },
        { subdomain: 'ju', domain: 'ciao.su', icon: 'fas fa-tv' },
        { subdomain: 'xx', domain: 'ciao.su', icon: 'fas fa-user' },
      ];
    }

    container.innerHTML = examples.map(example => `
            <button class="suggestion-btn" data-subdomain="${example.subdomain}" data-domain="${example.domain}">
                <i class="${example.icon}"></i>
                <span>${example.subdomain}.${example.domain}</span>
            </button>
        `).join('');

    // 绑定点击事件
    container.querySelectorAll('.suggestion-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        const subdomain = this.getAttribute('data-subdomain');
        const domain = this.getAttribute('data-domain');
        const subdomainInput = document.getElementById('subdomainInput');
        const domainSelect = document.getElementById('domainSelect');

        if (subdomainInput && subdomain) {
          subdomainInput.value = subdomain;
        }
        if (domainSelect && domain) {
          domainSelect.value = domain;
        }

        // 自动执行查询
        setTimeout(() => {
          const queryBtn = document.getElementById('queryBtn');
          if (queryBtn) queryBtn.click();
        }, 100);
      });
    });
  } catch (error) {
    console.error('加载示例域名失败:', error);
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">加载示例失败</p>';
  }
}

// 辅助函数
function formatDate(dateString) {
  if (!dateString) return '未知';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
}

function formatTime(dateString) {
  if (!dateString) return '未知';

  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  } catch (e) {
    return dateString;
  }
}
