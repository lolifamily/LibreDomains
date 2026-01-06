// 优化的配置生成器 JavaScript
document.addEventListener('DOMContentLoaded', function () {
  initGenerator();
});

let configData = {
  subdomain: '',
  domain: 'ciao.su',
  description: '',
  owner: {
    name: '',
    github: '',
    email: '',
  },
  records: [
    { type: 'A', name: '@', content: '', ttl: 3600, proxied: false },
  ],
};

let recordCounter = 1;
let currentStep = 1;

function initGenerator() {
  // 绑定表单事件
  bindFormEvents();

  // 绑定导入功能
  bindImportFeatures();

  // 绑定操作按钮
  bindActionButtons();

  // 绑定步骤导航
  bindStepNavigation();

  // 初始化DNS记录
  renderDnsRecords();

  // 初始化URL参数
  initFromUrl();

  // 初始化预览
  updatePreview();

  // 显示第一步
  showStep(1);
}

function bindFormEvents() {
  const form = document.getElementById('generatorForm');
  const inputs = form.querySelectorAll('input, select');

  inputs.forEach((input) => {
    input.addEventListener('input', updateConfig);
    input.addEventListener('change', updateConfig);
  });
}

function bindImportFeatures() {
  const importBtn = document.getElementById('importBtn');
  const clearBtn = document.getElementById('clearBtn');

  // 从剪贴板导入
  importBtn.addEventListener('click', async function () {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        parseImportedConfig(text);
      } else {
        LibreDomains.showNotification('剪贴板为空', 'warning');
      }
    } catch (error) {
      LibreDomains.showNotification('无法访问剪贴板，请检查浏览器权限', 'error');
    }
  });

  // 清空重置
  clearBtn.addEventListener('click', function () {
    if (confirm('确定要重置所有配置吗？')) {
      resetConfig();
      LibreDomains.showNotification('配置已重置', 'success');
    }
  });
}

function bindActionButtons() {
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const addRecordBtn = document.getElementById('addRecordBtn');

  copyBtn.addEventListener('click', copyConfig);
  downloadBtn.addEventListener('click', downloadConfig);
  addRecordBtn.addEventListener('click', addDnsRecord);
}

function bindStepNavigation() {
  const nextStep1 = document.getElementById('nextStep1');
  const prevStep2 = document.getElementById('prevStep2');
  const generateBtn = document.getElementById('generateBtn');

  nextStep1.addEventListener('click', function () {
    if (validateStep1()) {
      goToStep(2);
    }
  });

  prevStep2.addEventListener('click', function () {
    goToStep(1);
  });

  generateBtn.addEventListener('click', function () {
    if (validateStep2()) {
      generateConfig();
    }
  });
}

// 解析导入的配置
function parseImportedConfig(text) {
  try {
    const config = JSON.parse(text);

    // 验证配置格式
    if (!config.subdomain || !config.owner || !config.records) {
      throw new Error('配置格式不正确');
    }

    // 更新配置数据
    configData = {
      subdomain: config.subdomain || '',
      domain: config.domain || 'ciao.su',
      description: config.description || '',
      owner: {
        name: config.owner.name || '',
        github: config.owner.github || '',
        email: config.owner.email || '',
      },
      records: config.records || [],
    };

    // 更新表单
    updateFormFromConfig();

    // 重新渲染DNS记录
    renderDnsRecords();

    // 更新预览
    updatePreview();

    LibreDomains.showNotification('配置导入成功', 'success');
  } catch (error) {
    LibreDomains.showNotification('配置格式错误：' + error.message, 'error');
  }
}

// 重置配置
function resetConfig() {
  configData = {
    subdomain: '',
    domain: 'ciao.su',
    description: '',
    owner: {
      name: '',
      github: '',
      email: '',
    },
    records: [
      { type: 'A', name: '@', content: '', ttl: 3600, proxied: false },
    ],
  };

  recordCounter = 1;
  updateFormFromConfig();
  renderDnsRecords();
  updatePreview();
}

// 从配置更新表单
function updateFormFromConfig() {
  const form = document.getElementById('generatorForm');

  form.subdomain.value = configData.subdomain;
  form.domain.value = configData.domain;
  form.description.value = configData.description;
  form.ownerName.value = configData.owner.name;
  form.github.value = configData.owner.github;
  form.email.value = configData.owner.email;
}

// 渲染DNS记录
function renderDnsRecords() {
  const container = document.getElementById('dnsRecords');

  if (configData.records.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fas fa-plus-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>暂无DNS记录，点击上方"添加"按钮开始配置</p>
            </div>
        `;
    return;
  }

  const html = configData.records.map((record, index) => `
        <div class="record-row" data-index="${index}">
            <input type="text" class="form-input" data-index="${index}" data-field="type"
                   value="${record.type}" placeholder="A" title="记录类型 (A, AAAA, CNAME, TXT, MX)">

            <input type="text" class="form-input" data-index="${index}" data-field="name"
                   value="${record.name}" placeholder="@" title="记录名称 (@, www, *, 或自定义)">

            <input type="text" class="form-input" data-index="${index}" data-field="content"
                   value="${record.content}" placeholder="${getPlaceholder(record.type)}"
                   title="记录值">

            <input type="text" class="form-input" data-index="${index}" data-field="ttl"
                   value="${record.ttl}" placeholder="3600" title="TTL (秒)">

            <button type="button" class="btn btn-outline" onclick="removeDnsRecord(${index})"
                    title="删除记录" ${configData.records.length <= 1 ? 'disabled' : ''}>
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

  container.innerHTML = html;

  // 绑定事件
  container.querySelectorAll('input, select').forEach((input) => {
    input.addEventListener('input', updateDnsRecord);
    input.addEventListener('change', updateDnsRecord);
  });

  // 添加输入验证样式
  configData.records.forEach((record, index) => {
    validateRecordInline(index, record);
  });
}

// 获取占位符文本
function getPlaceholder(type) {
  const placeholders = {
    A: '192.168.1.1',
    AAAA: '2001:db8::1',
    CNAME: 'example.com',
    TXT: 'v=spf1 include:_spf.google.com ~all',
    MX: '10 mail.example.com',
  };
  return placeholders[type] || '输入记录值';
}

// 简化的内联验证
function validateRecordInline(index, record) {
  const contentInput = document.querySelector(`[data-index="${index}"][data-field="content"]`);
  if (!contentInput) return;

  const content = record.content.trim();
  let isValid = false;

  if (!content) {
    isValid = false;
  } else {
    switch (record.type) {
      case 'A':
        isValid = /^(\d{1,3}\.){3}\d{1,3}$/.test(content);
        break;
      case 'AAAA':
        isValid = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(content);
        break;
      case 'CNAME':
        isValid = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(content);
        break;
      case 'TXT':
        isValid = content.length > 0;
        break;
      case 'MX':
        isValid = /^\d+\s+[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(content);
        break;
      default:
        isValid = true;
    }
  }

  // 更新输入框样式
  contentInput.classList.remove('error', 'success');
  if (content) {
    contentInput.classList.add(isValid ? 'success' : 'error');
  }
}

function addDnsRecord() {
  configData.records.push({
    type: 'A',
    name: '@',
    content: '',
    ttl: 3600,
    proxied: false,
  });
  renderDnsRecords();
  updatePreview();
  LibreDomains.showNotification('已添加新的DNS记录', 'success');
}

function removeDnsRecord(index) {
  if (configData.records.length <= 1) {
    LibreDomains.showNotification('至少需要保留一条记录', 'warning');
    return;
  }

  configData.records.splice(index, 1);
  renderDnsRecords();
  updatePreview();
  LibreDomains.showNotification('DNS记录已删除', 'success');
}

function updateDnsRecord(event) {
  const index = parseInt(event.target.getAttribute('data-index'));
  const field = event.target.getAttribute('data-field');
  let value = event.target.value;

  if (configData.records[index]) {
    // 类型转换
    if (field === 'ttl') {
      value = parseInt(value) || 3600; // 默认3600秒
    } else if (field === 'proxied') {
      value = event.target.checked;
    }

    configData.records[index][field] = value;

    // 验证记录
    validateRecordInline(index, configData.records[index]);

    // 更新占位符
    if (field === 'type') {
      const contentInput = document.querySelector(`[data-index="${index}"][data-field="content"]`);
      if (contentInput) {
        contentInput.placeholder = getPlaceholder(value);
      }
    }

    updatePreview();
  }
}

function updateConfig() {
  const form = document.getElementById('generatorForm');

  configData.subdomain = form.subdomain.value.trim().toLowerCase();
  configData.domain = form.domain.value;
  configData.description = form.description.value.trim();
  configData.owner.name = form.ownerName.value.trim();
  configData.owner.github = form.github.value.trim();
  configData.owner.email = form.email.value.trim();

  updatePreview();
}

function updatePreview() {
  const preview = document.getElementById('configPreview');

  // 使用用户输入的描述，如果为空则生成默认描述
  let description = configData.description;
  if (!description && configData.subdomain && configData.domain) {
    description = `${configData.subdomain}.${configData.domain} - 由配置生成器创建`;
  } else if (!description) {
    description = '域名配置文件';
  }

  // 过滤有效记录
  const validRecords = configData.records.filter(record =>
    record.content && record.content.trim(),
  );

  const config = {
    description: description,
    subdomain: configData.subdomain,
    domain: configData.domain,
    owner: configData.owner,
    records: validRecords,
  };

  preview.textContent = JSON.stringify(config, null, 2);

  // 更新统计信息
  updateConfigStats();
}

function updateConfigStats() {
  // 创建统计信息显示
  const preview = document.getElementById('configPreview');
  const existingStats = document.querySelector('.config-stats');

  if (existingStats) {
    existingStats.remove();
  }

  const validRecords = configData.records.filter(record =>
    record.content && record.content.trim(),
  );

  const isComplete = configData.subdomain
    && configData.owner.name
    && configData.owner.github
    && configData.owner.email
    && validRecords.length > 0;

  const statsHtml = `
        <div class="config-stats">
            <div class="stat-item">
                <div class="stat-number">${validRecords.length}</div>
                <div class="stat-label">DNS记录</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${isComplete ? '✓' : '✗'}</div>
                <div class="stat-label">配置完整</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${JSON.stringify({
                  subdomain: configData.subdomain,
                  domain: configData.domain,
                  owner: configData.owner,
                  records: validRecords,
                }).length}</div>
                <div class="stat-label">字符数</div>
            </div>
        </div>
    `;

  preview.insertAdjacentHTML('beforebegin', statsHtml);
}

function copyConfig() {
  const preview = document.getElementById('configPreview');
  const content = preview.textContent;

  // 验证配置完整性
  if (!validateConfig()) {
    return;
  }

  LibreDomains.copyToClipboard(content).then(() => {
    LibreDomains.showNotification('配置已复制到剪贴板', 'success');
  }).catch(() => {
    LibreDomains.showNotification('复制失败', 'error');
  });
}

function downloadConfig() {
  const preview = document.getElementById('configPreview');
  const content = preview.textContent;

  // 验证配置完整性
  if (!validateConfig()) {
    return;
  }

  const filename = `${configData.subdomain || 'subdomain'}.json`;
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
  LibreDomains.showNotification(`配置文件 ${filename} 已下载`, 'success');
}

function validateConfig() {
  const errors = [];

  // 验证基本信息
  if (!configData.subdomain) {
    errors.push('请输入子域名');
  } else if (!LibreDomains.validateSubdomain(configData.subdomain)) {
    errors.push('子域名格式不正确');
  }

  if (!configData.owner.name) {
    errors.push('请输入姓名');
  }

  if (!configData.owner.github) {
    errors.push('请输入GitHub用户名');
  }

  if (!configData.owner.email) {
    errors.push('请输入邮箱地址');
  } else if (!LibreDomains.validateEmail(configData.owner.email)) {
    errors.push('邮箱格式不正确');
  }

  // 验证DNS记录
  const validRecords = configData.records.filter(record =>
    record.content && record.content.trim(),
  );

  if (validRecords.length === 0) {
    errors.push('请至少添加一条有效的DNS记录');
  }

  // 显示错误信息
  if (errors.length > 0) {
    LibreDomains.showNotification('配置不完整：' + errors[0], 'warning');
    return false;
  }

  return true;
}

function initFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain');

  if (domain) {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      const subdomain = parts[0];
      const domainPart = parts.slice(1).join('.');

      configData.subdomain = subdomain;
      configData.domain = domainPart;

      updateFormFromConfig();
      updatePreview();

      LibreDomains.showNotification('已从查询页面导入域名信息', 'success');
    }
  }
}

// 步骤导航
function goToStep(step) {
  currentStep = step;
  showStep(step);
  updateStepIndicator();
}

function showStep(step) {
  // 隐藏所有步骤
  document.querySelectorAll('.wizard-step').forEach((s) => {
    s.classList.remove('active');
  });

  // 显示当前步骤
  const stepElement = document.getElementById(`step${step}`);
  if (stepElement) {
    stepElement.classList.add('active');
  }
}

function updateStepIndicator() {
  document.querySelectorAll('.step-item').forEach((item, index) => {
    const stepNumber = index + 1;
    item.classList.remove('active', 'completed');

    if (stepNumber < currentStep) {
      item.classList.add('completed');
    } else if (stepNumber === currentStep) {
      item.classList.add('active');
    }
  });
}

// 步骤验证
function validateStep1() {
  const errors = [];

  if (!configData.subdomain) {
    errors.push('请输入子域名');
  } else if (!LibreDomains.validateSubdomain(configData.subdomain)) {
    errors.push('子域名格式不正确');
  }

  if (!configData.owner.name) {
    errors.push('请输入姓名');
  }

  if (!configData.owner.github) {
    errors.push('请输入GitHub用户名');
  }

  if (!configData.owner.email) {
    errors.push('请输入邮箱地址');
  } else if (!LibreDomains.validateEmail(configData.owner.email)) {
    errors.push('邮箱格式不正确');
  }

  if (errors.length > 0) {
    LibreDomains.showNotification('请完善基本信息：' + errors[0], 'warning');
    return false;
  }

  return true;
}

function validateStep2() {
  const validRecords = configData.records.filter(record =>
    record.content && record.content.trim(),
  );

  if (validRecords.length === 0) {
    LibreDomains.showNotification('请至少添加一条有效的DNS记录', 'warning');
    return false;
  }

  return true;
}

// 生成配置
function generateConfig() {
  updateConfig();

  // 使用用户输入的描述，如果为空则生成默认描述
  let description = configData.description;
  if (!description && configData.subdomain && configData.domain) {
    description = `${configData.subdomain}.${configData.domain} - 由配置生成器创建`;
  } else if (!description) {
    description = '域名配置文件';
  }

  const config = {
    description: description,
    subdomain: configData.subdomain,
    domain: configData.domain,
    owner: configData.owner,
    records: configData.records.filter(record => record.content && record.content.trim()),
  };

  updateConfigPreview(config);
  LibreDomains.showNotification('配置文件已生成完成！', 'success');
}

function updateConfigPreview(config) {
  const preview = document.getElementById('configPreview');
  if (preview) {
    preview.textContent = JSON.stringify(config, null, 2);
  }
  updateConfigStats();
}

// 全局函数（供HTML调用）
window.addDnsRecord = addDnsRecord;
window.removeDnsRecord = removeDnsRecord;
