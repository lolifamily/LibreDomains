// 配置生成器页面专用 JavaScript 文件
document.addEventListener('DOMContentLoaded', function () {
  // 初始化生成器功能
  initGenerator();
  initDnsRecords();
  initTemplates();
  initNavigation();
});

let currentStep = 1;
let totalSteps = 3;
let dnsRecordCounter = 1;
let configData = {
  subdomain: '',
  domain: '',
  description: '',
  owner: {
    name: '',
    github: '',
    email: '',
  },
  records: [],
};

// 初始化生成器
function initGenerator() {
  // 更新进度条
  updateProgress();

  // 显示第一步
  showStep(1);

  // 表单验证
  initFormValidation();
}

// 初始化表单验证
function initFormValidation() {
  const form = document.getElementById('configForm');
  if (!form) return;

  // 子域名验证
  const subdomainInput = document.getElementById('subdomain');
  if (subdomainInput) {
    subdomainInput.addEventListener('input', function () {
      const value = this.value.toLowerCase();
      this.value = value;
      validateSubdomain(this, value);
    });
  }

  // 邮箱验证
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('input', function () {
      validateEmail(this, this.value);
    });
  }

  // GitHub用户名验证
  const githubInput = document.getElementById('github');
  if (githubInput) {
    githubInput.addEventListener('input', function () {
      validateGithub(this, this.value);
    });
  }

  // 实时更新配置数据
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    input.addEventListener('input', updateConfigData);
  });
}

// 验证子域名
function validateSubdomain(input, value) {
  clearValidation(input);

  if (!value) return;

  if (LibreDomains.validateSubdomain(value)) {
    showSuccess(input, '子域名格式正确');
    configData.subdomain = value;
  } else {
    showError(input, '子域名格式不正确，只能包含字母、数字和连字符');
  }
}

// 验证邮箱
function validateEmail(input, value) {
  clearValidation(input);

  if (!value) return;

  if (LibreDomains.validateEmail(value)) {
    showSuccess(input, '邮箱格式正确');
    configData.owner.email = value;
  } else {
    showError(input, '请输入有效的邮箱地址');
  }
}

// 验证GitHub用户名
function validateGithub(input, value) {
  clearValidation(input);

  if (!value) return;

  const githubPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  if (githubPattern.test(value)) {
    showSuccess(input, 'GitHub用户名格式正确');
    configData.owner.github = value;
  } else {
    showError(input, 'GitHub用户名格式不正确');
  }
}

// 显示验证成功
function showSuccess(input, message) {
  input.classList.remove('error');
  input.classList.add('success');

  // 移除之前的提示
  const existingHint = input.parentNode.querySelector('.form-error, .form-success');
  if (existingHint) {
    existingHint.remove();
  }

  // 添加成功提示
  const successHint = document.createElement('div');
  successHint.className = 'form-success';
  successHint.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  input.parentNode.appendChild(successHint);
}

// 显示验证错误
function showError(input, message) {
  input.classList.remove('success');
  input.classList.add('error');

  // 移除之前的提示
  const existingHint = input.parentNode.querySelector('.form-error, .form-success');
  if (existingHint) {
    existingHint.remove();
  }

  // 添加错误提示
  const errorHint = document.createElement('div');
  errorHint.className = 'form-error';
  errorHint.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  input.parentNode.appendChild(errorHint);
}

// 清除验证状态
function clearValidation(input) {
  input.classList.remove('error', 'success');
  const existingHint = input.parentNode.querySelector('.form-error, .form-success');
  if (existingHint) {
    existingHint.remove();
  }
}

// 更新配置数据
function updateConfigData() {
  const form = document.getElementById('configForm');
  if (!form) return;

  // 基本信息
  configData.subdomain = form.subdomain?.value || '';
  configData.domain = form.domain?.value || '';
  configData.description = form.description?.value || '';
  configData.owner.name = form.ownerName?.value || '';
  configData.owner.github = form.github?.value || '';
  configData.owner.email = form.email?.value || '';

  // 更新文件名显示
  updateFileNameDisplay();
}

// 更新文件名显示
function updateFileNameDisplay() {
  const fileName = document.getElementById('fileName');
  const fileNamePath = document.getElementById('fileNamePath');
  const domainPath = document.getElementById('domainPath');

  if (configData.subdomain && configData.domain) {
    const filename = `${configData.subdomain}.json`;
    if (fileName) fileName.textContent = filename;
    if (fileNamePath) fileNamePath.textContent = filename;
    if (domainPath) domainPath.textContent = configData.domain;
  }
}

// 初始化DNS记录管理
function initDnsRecords() {
  const addRecordBtn = document.getElementById('addRecordBtn');
  if (addRecordBtn) {
    addRecordBtn.addEventListener('click', addDnsRecord);
  }

  // 初始化第一个DNS记录的事件
  initRecordEvents(document.querySelector('.dns-record-item'));

  // 更新删除按钮状态
  updateRemoveButtons();
}

// 添加DNS记录
function addDnsRecord() {
  dnsRecordCounter++;
  const container = document.getElementById('dnsRecordsContainer');

  const recordHtml = `
        <div class="dns-record-item">
            <div class="record-header">
                <h4>DNS 记录 #${dnsRecordCounter}</h4>
                <button type="button" class="remove-record-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>

            <div class="record-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-tag"></i>
                            <span>记录类型</span>
                        </label>
                        <select name="recordType" class="form-select record-type-select" required>
                            <option value="A">A - IPv4 地址</option>
                            <option value="AAAA">AAAA - IPv6 地址</option>
                            <option value="CNAME">CNAME - 别名记录</option>
                            <option value="TXT">TXT - 文本记录</option>
                            <option value="MX">MX - 邮件记录</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-at"></i>
                            <span>记录名称</span>
                        </label>
                        <select name="recordName" class="form-select record-name-select" required>
                            <option value="@">@ (根域名)</option>
                            <option value="www">www</option>
                            <option value="*">* (通配符)</option>
                            <option value="custom">自定义...</option>
                        </select>
                        <input type="text"
                               name="customRecordName"
                               class="form-input custom-name-input"
                               placeholder="输入自定义名称"
                               style="display: none;">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-link"></i>
                        <span class="record-content-label">记录值</span>
                    </label>
                    <input type="text"
                           name="recordContent"
                           class="form-input record-content-input"
                           placeholder="输入记录值"
                           required>
                    <div class="form-hint record-hint">
                        <i class="fas fa-info-circle"></i>
                        <span class="record-hint-text">输入IPv4地址，例如：192.168.1.1</span>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-clock"></i>
                            <span>TTL (秒)</span>
                        </label>
                        <select name="recordTtl" class="form-select" required>
                            <option value="300">300 (5分钟)</option>
                            <option value="1800">1800 (30分钟)</option>
                            <option value="3600" selected>3600 (1小时)</option>
                            <option value="14400">14400 (4小时)</option>
                            <option value="86400">86400 (1天)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-shield-alt"></i>
                            <span>Cloudflare 代理</span>
                        </label>
                        <div class="toggle-switch">
                            <input type="checkbox"
                                   name="recordProxied"
                                   class="toggle-input"
                                   id="proxied${dnsRecordCounter}">
                            <label for="proxied${dnsRecordCounter}" class="toggle-label">
                                <span class="toggle-slider"></span>
                            </label>
                            <span class="toggle-text">启用代理</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  container.insertAdjacentHTML('beforeend', recordHtml);

  // 初始化新记录的事件
  const newRecord = container.lastElementChild;
  initRecordEvents(newRecord);

  // 更新删除按钮状态
  updateRemoveButtons();

  // 滚动到新记录
  newRecord.scrollIntoView({ behavior: 'smooth', block: 'center' });

  LibreDomains.showNotification('已添加新的DNS记录', 'success');
}

// 初始化记录事件
function initRecordEvents(recordElement) {
  if (!recordElement) return;

  // 删除按钮
  const removeBtn = recordElement.querySelector('.remove-record-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      removeDnsRecord(recordElement);
    });
  }

  // 记录类型变化
  const typeSelect = recordElement.querySelector('.record-type-select');
  if (typeSelect) {
    typeSelect.addEventListener('change', function () {
      updateRecordHints(recordElement, this.value);
    });

    // 初始化提示
    updateRecordHints(recordElement, typeSelect.value);
  }

  // 记录名称变化
  const nameSelect = recordElement.querySelector('.record-name-select');
  const customInput = recordElement.querySelector('.custom-name-input');

  if (nameSelect && customInput) {
    nameSelect.addEventListener('change', function () {
      if (this.value === 'custom') {
        customInput.style.display = 'block';
        customInput.required = true;
        customInput.focus();
      } else {
        customInput.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
      }
    });
  }

  // 表单变化时更新配置
  const inputs = recordElement.querySelectorAll('input, select');
  inputs.forEach((input) => {
    input.addEventListener('input', updateDnsRecords);
    input.addEventListener('change', updateDnsRecords);
  });
}

// 删除DNS记录
function removeDnsRecord(recordElement) {
  const container = document.getElementById('dnsRecordsContainer');
  const records = container.querySelectorAll('.dns-record-item');

  if (records.length <= 1) {
    LibreDomains.showNotification('至少需要保留一条DNS记录', 'warning');
    return;
  }

  recordElement.remove();
  updateRemoveButtons();
  updateDnsRecords();

  LibreDomains.showNotification('DNS记录已删除', 'success');
}

// 更新删除按钮状态
function updateRemoveButtons() {
  const container = document.getElementById('dnsRecordsContainer');
  const records = container.querySelectorAll('.dns-record-item');
  const removeButtons = container.querySelectorAll('.remove-record-btn');

  removeButtons.forEach((btn) => {
    btn.style.display = records.length > 1 ? 'flex' : 'none';
  });
}

// 更新记录提示
function updateRecordHints(recordElement, recordType) {
  const contentLabel = recordElement.querySelector('.record-content-label');
  const hintText = recordElement.querySelector('.record-hint-text');
  const contentInput = recordElement.querySelector('.record-content-input');

  const hints = {
    A: {
      label: '记录值 (IPv4地址)',
      hint: '输入IPv4地址，例如：192.168.1.1',
      placeholder: '192.168.1.1',
    },
    AAAA: {
      label: '记录值 (IPv6地址)',
      hint: '输入IPv6地址，例如：2001:db8::1',
      placeholder: '2001:db8::1',
    },
    CNAME: {
      label: '记录值 (目标域名)',
      hint: '输入目标域名，例如：example.com',
      placeholder: 'example.com',
    },
    TXT: {
      label: '记录值 (文本内容)',
      hint: '输入文本内容，例如：v=spf1 include:_spf.google.com ~all',
      placeholder: '文本内容',
    },
    MX: {
      label: '记录值 (邮件服务器)',
      hint: '输入邮件服务器，例如：10 mail.example.com',
      placeholder: '10 mail.example.com',
    },
  };

  const hint = hints[recordType] || hints['A'];

  if (contentLabel) contentLabel.textContent = hint.label;
  if (hintText) hintText.textContent = hint.hint;
  if (contentInput) contentInput.placeholder = hint.placeholder;
}

// 更新DNS记录配置
function updateDnsRecords() {
  const container = document.getElementById('dnsRecordsContainer');
  const records = container.querySelectorAll('.dns-record-item');

  configData.records = [];

  records.forEach((record) => {
    const typeSelect = record.querySelector('.record-type-select');
    const nameSelect = record.querySelector('.record-name-select');
    const customInput = record.querySelector('.custom-name-input');
    const contentInput = record.querySelector('.record-content-input');
    const ttlSelect = record.querySelector('[name="recordTtl"]');
    const proxiedInput = record.querySelector('[name="recordProxied"]');

    if (typeSelect && nameSelect && contentInput && ttlSelect) {
      let recordName = nameSelect.value;
      if (recordName === 'custom' && customInput && customInput.value) {
        recordName = customInput.value;
      }

      const recordData = {
        type: typeSelect.value,
        name: recordName,
        content: contentInput.value,
        ttl: parseInt(ttlSelect.value),
        proxied: proxiedInput ? proxiedInput.checked : false,
      };

      // 只添加有内容的记录
      if (recordData.content.trim()) {
        configData.records.push(recordData);
      }
    }
  });

  // 更新配置预览
  updateConfigPreview();
}

// 初始化模板功能
function initTemplates() {
  const templateBtns = document.querySelectorAll('.template-btn');

  templateBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const template = this.getAttribute('data-template');
      applyTemplate(template);
    });
  });
}

// 应用模板
function applyTemplate(templateName) {
  const templates = {
    'github-pages': {
      name: 'GitHub Pages',
      records: [
        {
          type: 'CNAME',
          name: '@',
          content: 'username.github.io',
          ttl: 3600,
          proxied: true,
        },
        {
          type: 'CNAME',
          name: 'www',
          content: 'username.github.io',
          ttl: 3600,
          proxied: true,
        },
      ],
    },
    vercel: {
      name: 'Vercel',
      records: [
        {
          type: 'CNAME',
          name: '@',
          content: 'cname.vercel-dns.com',
          ttl: 3600,
          proxied: true,
        },
      ],
    },
    netlify: {
      name: 'Netlify',
      records: [
        {
          type: 'CNAME',
          name: '@',
          content: 'your-site.netlify.app',
          ttl: 3600,
          proxied: true,
        },
      ],
    },
    'custom-server': {
      name: '自定义服务器',
      records: [
        {
          type: 'A',
          name: '@',
          content: '192.168.1.1',
          ttl: 3600,
          proxied: false,
        },
        {
          type: 'CNAME',
          name: 'www',
          content: '@',
          ttl: 3600,
          proxied: false,
        },
      ],
    },
  };

  const template = templates[templateName];
  if (!template) return;

  // 清除现有记录
  const container = document.getElementById('dnsRecordsContainer');
  container.innerHTML = '';
  dnsRecordCounter = 0;

  // 添加模板记录
  template.records.forEach((record, index) => {
    if (index === 0) {
      // 重新创建第一个记录
      addFirstRecord();
    } else {
      addDnsRecord();
    }

    const recordElement = container.children[index];
    fillRecordData(recordElement, record);
  });

  updateDnsRecords();
  LibreDomains.showNotification(`已应用 ${template.name} 模板`, 'success');
}

// 添加第一个记录
function addFirstRecord() {
  dnsRecordCounter = 1;
  const container = document.getElementById('dnsRecordsContainer');

  const recordHtml = `
        <div class="dns-record-item">
            <div class="record-header">
                <h4>DNS 记录 #1</h4>
                <button type="button" class="remove-record-btn" style="display: none;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>

            <div class="record-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-tag"></i>
                            <span>记录类型</span>
                        </label>
                        <select name="recordType" class="form-select record-type-select" required>
                            <option value="A">A - IPv4 地址</option>
                            <option value="AAAA">AAAA - IPv6 地址</option>
                            <option value="CNAME">CNAME - 别名记录</option>
                            <option value="TXT">TXT - 文本记录</option>
                            <option value="MX">MX - 邮件记录</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-at"></i>
                            <span>记录名称</span>
                        </label>
                        <select name="recordName" class="form-select record-name-select" required>
                            <option value="@">@ (根域名)</option>
                            <option value="www">www</option>
                            <option value="*">* (通配符)</option>
                            <option value="custom">自定义...</option>
                        </select>
                        <input type="text"
                               name="customRecordName"
                               class="form-input custom-name-input"
                               placeholder="输入自定义名称"
                               style="display: none;">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-link"></i>
                        <span class="record-content-label">记录值</span>
                    </label>
                    <input type="text"
                           name="recordContent"
                           class="form-input record-content-input"
                           placeholder="输入记录值"
                           required>
                    <div class="form-hint record-hint">
                        <i class="fas fa-info-circle"></i>
                        <span class="record-hint-text">输入IPv4地址，例如：192.168.1.1</span>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-clock"></i>
                            <span>TTL (秒)</span>
                        </label>
                        <select name="recordTtl" class="form-select" required>
                            <option value="300">300 (5分钟)</option>
                            <option value="1800">1800 (30分钟)</option>
                            <option value="3600" selected>3600 (1小时)</option>
                            <option value="14400">14400 (4小时)</option>
                            <option value="86400">86400 (1天)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-shield-alt"></i>
                            <span>Cloudflare 代理</span>
                        </label>
                        <div class="toggle-switch">
                            <input type="checkbox"
                                   name="recordProxied"
                                   class="toggle-input"
                                   id="proxied1">
                            <label for="proxied1" class="toggle-label">
                                <span class="toggle-slider"></span>
                            </label>
                            <span class="toggle-text">启用代理</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = recordHtml;
  initRecordEvents(container.firstElementChild);
}

// 填充记录数据
function fillRecordData(recordElement, data) {
  const typeSelect = recordElement.querySelector('.record-type-select');
  const nameSelect = recordElement.querySelector('.record-name-select');
  const customInput = recordElement.querySelector('.custom-name-input');
  const contentInput = recordElement.querySelector('.record-content-input');
  const ttlSelect = recordElement.querySelector('[name="recordTtl"]');
  const proxiedInput = recordElement.querySelector('[name="recordProxied"]');

  if (typeSelect) typeSelect.value = data.type;
  if (contentInput) contentInput.value = data.content;
  if (ttlSelect) ttlSelect.value = data.ttl.toString();
  if (proxiedInput) proxiedInput.checked = data.proxied;

  // 处理记录名称
  if (nameSelect) {
    const standardNames = ['@', 'www', '*'];
    if (standardNames.includes(data.name)) {
      nameSelect.value = data.name;
    } else {
      nameSelect.value = 'custom';
      if (customInput) {
        customInput.style.display = 'block';
        customInput.required = true;
        customInput.value = data.name;
      }
    }
  }

  // 更新提示
  updateRecordHints(recordElement, data.type);
}

// 初始化导航
function initNavigation() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const generateBtn = document.getElementById('generateBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
          goToStep(currentStep + 1);
        }
      }
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', generateConfig);
  }

  // 复制和下载按钮
  const copyBtn = document.getElementById('copyConfigBtn');
  const downloadBtn = document.getElementById('downloadConfigBtn');

  if (copyBtn) {
    copyBtn.addEventListener('click', copyConfig);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadConfig);
  }
}

// 步骤导航
function goToStep(step) {
  if (step < 1 || step > totalSteps) return;

  currentStep = step;
  showStep(step);
  updateProgress();
  updateNavigation();
}

function showStep(step) {
  // 隐藏所有步骤
  const steps = document.querySelectorAll('.form-step');
  steps.forEach(s => s.classList.remove('active'));

  // 显示当前步骤
  const currentStepElement = document.getElementById(`step${step}`);
  if (currentStepElement) {
    currentStepElement.classList.add('active');
  }
}

function updateProgress() {
  // 更新进度条
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    const percentage = (currentStep / totalSteps) * 100;
    progressFill.style.width = `${percentage}%`;
  }

  // 更新进度步骤
  const progressSteps = document.querySelectorAll('.progress-step');
  progressSteps.forEach((step, index) => {
    const stepNumber = index + 1;
    step.classList.remove('active', 'completed');

    if (stepNumber < currentStep) {
      step.classList.add('completed');
    } else if (stepNumber === currentStep) {
      step.classList.add('active');
    }
  });
}

function updateNavigation() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const generateBtn = document.getElementById('generateBtn');

  // 上一步按钮
  if (prevBtn) {
    prevBtn.style.display = currentStep > 1 ? 'flex' : 'none';
  }

  // 下一步/生成按钮
  if (currentStep < totalSteps) {
    if (nextBtn) nextBtn.style.display = 'flex';
    if (generateBtn) generateBtn.style.display = 'none';
  } else {
    if (nextBtn) nextBtn.style.display = 'none';
    if (generateBtn) generateBtn.style.display = 'flex';
  }
}

// 验证当前步骤
function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      return validateStep1();
    case 2:
      return validateStep2();
    case 3:
      return true; // 第三步只是预览，不需要验证
    default:
      return true;
  }
}

function validateStep1() {
  const form = document.getElementById('configForm');
  const subdomain = form.subdomain?.value?.trim();
  const domain = form.domain?.value;
  const ownerName = form.ownerName?.value?.trim();
  const github = form.github?.value?.trim();
  const email = form.email?.value?.trim();

  if (!subdomain) {
    LibreDomains.showNotification('请输入子域名', 'error');
    return false;
  }

  if (!LibreDomains.validateSubdomain(subdomain)) {
    LibreDomains.showNotification('子域名格式不正确', 'error');
    return false;
  }

  if (!ownerName) {
    LibreDomains.showNotification('请输入您的姓名', 'error');
    return false;
  }

  if (!github) {
    LibreDomains.showNotification('请输入GitHub用户名', 'error');
    return false;
  }

  if (!email || !LibreDomains.validateEmail(email)) {
    LibreDomains.showNotification('请输入有效的邮箱地址', 'error');
    return false;
  }

  return true;
}

function validateStep2() {
  if (configData.records.length === 0) {
    LibreDomains.showNotification('请至少添加一条DNS记录', 'error');
    return false;
  }

  // 检查每条记录是否完整
  for (let i = 0; i < configData.records.length; i++) {
    const record = configData.records[i];
    if (!record.content.trim()) {
      LibreDomains.showNotification(`第${i + 1}条DNS记录的内容不能为空`, 'error');
      return false;
    }
  }

  return true;
}

// 生成配置
function generateConfig() {
  updateConfigData();
  updateDnsRecords();

  const config = {
    description: configData.description || `${configData.subdomain}.${configData.domain} - 由LibreDomains配置生成器创建`,
    subdomain: configData.subdomain,
    domain: configData.domain,
    owner: {
      name: configData.owner.name,
      github: configData.owner.github,
      email: configData.owner.email,
    },
    records: configData.records,
  };

  updateConfigPreview(config);
  LibreDomains.showNotification('配置文件已生成', 'success');
}

// 更新配置预览
function updateConfigPreview(config = null) {
  const configOutput = document.getElementById('configOutput');
  if (!configOutput) return;

  const finalConfig = config || {
    description: configData.description || `${configData.subdomain}.${configData.domain} - 由LibreDomains配置生成器创建`,
    subdomain: configData.subdomain,
    domain: configData.domain,
    owner: configData.owner,
    records: configData.records,
  };

  configOutput.textContent = JSON.stringify(finalConfig, null, 2);
}

// 复制配置
function copyConfig() {
  const configOutput = document.getElementById('configOutput');
  if (!configOutput) return;

  LibreDomains.copyToClipboard(configOutput.textContent).then(() => {
    LibreDomains.showNotification('配置已复制到剪贴板', 'success');
  }).catch(() => {
    LibreDomains.showNotification('复制失败', 'error');
  });
}

// 下载配置
function downloadConfig() {
  const configOutput = document.getElementById('configOutput');
  if (!configOutput) return;

  const filename = `${configData.subdomain || 'subdomain'}.json`;
  const content = configOutput.textContent;

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

// 从URL参数初始化
function initFromUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain');

  if (domain) {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      const subdomain = parts[0];
      const domainPart = parts.slice(1).join('.');

      const subdomainInput = document.getElementById('subdomain');
      const domainSelect = document.getElementById('domain');

      if (subdomainInput) subdomainInput.value = subdomain;
      if (domainSelect) domainSelect.value = domainPart;

      updateConfigData();
    }
  }
}

// 页面加载完成后初始化URL参数
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(initFromUrlParams, 100);
});
