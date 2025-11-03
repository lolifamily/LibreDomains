# LibreDomains 完整指南

欢迎使用 LibreDomains！本指南涵盖用户和管理员需要的所有信息。

---

## 📖 用户部分

### 重要提醒

使用本服务前，请务必阅读并同意我们的[服务条款](TERMS_OF_SERVICE.md)。

### 前提条件

- GitHub 账户
- 基本的 Git 和 GitHub 知识
- 了解 DNS 记录的基本概念

---

## 申请域名

### 详细步骤

#### 1. Fork 仓库

1. 访问 [LibreDomains 仓库](https://github.com/bestzwei/LibreDomains)
2. 点击右上角的 "Fork" 按钮
3. 等待仓库克隆到您的 GitHub 账户

#### 2. 创建配置文件

1. 在您 Fork 的仓库中，导航到 `domains/[域名]/` 目录
   - 例如: 如果您想申请 `myapp.ciao.su`，请导航到 `domains/ciao.su/`
2. 点击 "Add file" > "Create new file"
3. 将文件命名为您想要的子域名，如 `myapp.json`
   - **注意**: 请确保您的子域名不在保留列表中
4. 填写文件内容，格式如下:

```json
{
  "description": "个人博客网站",
  "owner": {
    "name": "您的姓名",
    "github": "您的GitHub用户名",
    "email": "您的邮箱"
  },
  "records": [
    {
      "type": "A",
      "name": "@",
      "content": "您的IP地址",
      "ttl": 3600,
      "proxied": false
    }
  ]
}
```

**字段说明：**

- `description`: 必填，对子域名用途的简要描述（5-200个字符）
- `owner.name`: 必填，用于标识域名所有者
- `owner.github`: 必填，用于权限验证和联系
- `owner.email`: 必填，联系邮箱

#### 3. 提交 Pull Request

1. 提交您的更改并填写提交信息
2. 返回到您的 Fork 仓库页面
3. 点击 "Contribute" > "Open pull request"
4. 填写 PR 描述，说明您申请的域名及用途
5. 提交 PR

#### 4. 后续流程

1. 自动检查将验证您的配置文件
2. 如有问题，机器人会留下评论指出问题所在
3. 修复问题后重新提交
4. 等待管理员审核并合并您的 PR
5. PR 合并后，域名将在几分钟内生效

---

## 保留子域名说明

以下子域名为系统保留，**不允许申请**（这些子域名通常用于系统功能、服务管理或特定用途）：

- **根域名**: `@` - 根域名由管理员控制，用于主域名的核心配置
- **系统功能**: `www`, `mail`, `email`, `webmail`, `ns`, `dns`
- **服务相关**: `api`, `cdn`, `ftp`, `sftp`
- **管理相关**: `admin`, `panel`, `dashboard`, `control`
- **开发相关**: `dev`, `test`, `staging`, `demo`
- **内容相关**: `blog`, `forum`, `wiki`, `docs`, `tv`
- **应用相关**: `app`, `mobile`, `static`, `assets`

**为什么这些子域名被保留？**

- **安全考虑**: 防止恶意用户冒充管理界面或系统服务
- **功能保留**: 为将来可能的官方功能预留空间
- **标准实践**: 遵循互联网域名管理的最佳实践

如果您需要申请类似功能的子域名，建议使用变体，如：
- `myblog` 而不是 `blog`
- `myapi` 而不是 `api`
- `myapp` 而不是 `app`

---

## 更新域名记录

1. 访问您 Fork 的仓库
2. 如果已过时，先同步更新（点击"Sync fork"按钮）
3. 导航到您的域名配置文件
4. 点击编辑按钮（铅笔图标）
5. 更新 JSON 内容
6. 提交更改并创建新的 Pull Request
7. 等待审核和部署

---

## DNS 记录类型说明

### A 记录

指向服务器的 IPv4 地址。

```json
{
  "type": "A",
  "name": "@",       // @ 表示域名本身，其他值如 "www" 表示子域名
  "content": "185.199.108.153",   // IP 地址
  "ttl": 3600,       // 缓存时间（秒）
  "proxied": false   // 是否经过 Cloudflare 代理
}
```

### AAAA 记录

指向服务器的 IPv6 地址。

```json
{
  "type": "AAAA",
  "name": "@",
  "content": "2606:4700:90:0:f22e:fbec:5bed:a9b9",
  "ttl": 3600,
  "proxied": false
}
```

### CNAME 记录

创建一个指向另一个域名的别名。

```json
{
  "type": "CNAME",
  "name": "www",
  "content": "username.github.io",
  "ttl": 3600,
  "proxied": false
}
```

### TXT 记录

存储文本信息，常用于验证域名所有权。

```json
{
  "type": "TXT",
  "name": "@",
  "content": "v=spf1 include:_spf.google.com ~all",
  "ttl": 3600,
  "proxied": false
}
```

### MX 记录

指定处理域名邮件的服务器。

```json
{
  "type": "MX",
  "name": "@",
  "content": "mail.example.com",
  "priority": 10,    // 邮件服务器优先级
  "ttl": 3600,
  "proxied": false
}
```

---

## 常见问题

### 我提交的 PR 显示检查失败

请查看自动检查的评论，修复指出的问题，然后更新您的 PR。常见问题包括：

#### JSON 格式错误

使用 [JSONLint](https://jsonlint.com/) 验证你的 JSON 格式。常见错误包括缺少逗号、多余逗号、引号不匹配等。

#### 其他常见问题

- 子域名已被占用
- 记录类型不支持
- 超过了每个子域名的记录数限制
- 无效的域名格式
- 无效的 IP 地址或邮箱格式

#### 推荐工具

- 使用 [JSONLint](https://jsonlint.com/) 在线验证 JSON 格式
- 使用支持语法高亮的编辑器（如 VS Code、Sublime Text）
- 复制示例文件并修改，避免格式错误

### 我的域名多久能生效？

PR 合并后，DNS 记录通常会在 5-15 分钟内生效。但由于 DNS 缓存的特性，全球范围内可能需要 24-48 小时才能完全生效。

### 我可以申请多少个子域名？

每个 GitHub 用户最多可申请 3 个子域名。

### 我可以删除我的域名吗？

可以。创建一个删除您的域名配置文件的 PR，审核通过后您的域名将被移除。

---

## 技术支持

如遇问题，请通过以下方式获取帮助:

1. 在仓库中创建 Issue
2. 联系项目维护者
3. 查阅项目 Wiki

---
---

## 👥 管理员部分

### 初始设置

#### 1. 环境变量设置

在 GitHub 仓库中，设置以下密钥：

1. `CLOUDFLARE_API_TOKEN` - Cloudflare API 令牌，需具有 DNS 编辑权限
2. `GITHUB_TOKEN` - 用于机器人评论 PR 的 GitHub 令牌

添加方法：
- 仓库设置 > Secrets and variables > Actions > New repository secret

#### 2. 添加新域名

1. 在 Cloudflare 中添加域名并获取 Zone ID
2. 修改 `config/domains.json` 文件：

```json
{
  "domains": [
    {
      "name": "新域名.com",
      "enabled": true,
      "description": "域名描述",
      "cloudflare_zone_id": "Cloudflare_区域_ID"
    },
    // 其他现有域名...
  ],
  // 其他配置...
}
```

3. 创建域名目录：
```bash
mkdir -p domains/新域名.com
```

---

## 日常管理

### 审核 Pull Request

1. 检查自动验证结果
2. 验证申请者的身份和域名用途是否合理
3. 检查记录是否遵循最佳实践
4. 合并合规的 PR

### 处理特殊请求

某些用户可能有特殊需求（如更多记录、保留子域名等）：

1. 在 PR 中讨论需求
2. 如批准特例，可临时调整验证脚本的限制
3. 记录特例决定

### 监控系统健康

定期检查：

1. 查看健康检查报告（每日自动运行）
2. 监控 Cloudflare 配额使用情况
3. 检查失败的工作流运行

---

## 管理保留子域名

保留子域名配置在 `config/domains.json` 文件的 `reserved_subdomains` 数组中。完整的保留子域名列表请参见本文档的[保留子域名说明](#保留子域名说明)。

### 添加新的保留子域名

1. 编辑 `config/domains.json`
2. 在 `reserved_subdomains` 数组中添加新的子域名
3. 提交更改并推送到主分支
4. 更新相关文档

### 移除保留子域名

1. 从 `reserved_subdomains` 数组中移除子域名
2. 确保该子域名未被系统关键功能使用
3. 更新文档说明变更

### 批准保留子域名的特例申请

在特殊情况下，管理员可以批准保留子域名的申请：

1. 在 PR 中讨论申请理由
2. 临时修改验证脚本跳过该检查
3. 合并 PR 后恢复验证脚本
4. 记录特例决定和原因

---

## 违规处理

根据[服务条款](TERMS_OF_SERVICE.md)，违规行为包括但不限于：

- 传播非法内容、恶意软件、钓鱼网站
- 侵犯知识产权
- 超出申请限制或提供虚假信息
- 滥用资源影响服务稳定性

**处理流程：**

1. **轻微违规**: 在 PR 中留言警告，要求修正
2. **严重违规**: 立即关闭 PR，暂停域名解析（通过 Cloudflare）
3. **重大违规**: 永久删除域名配置，将用户加入黑名单

详细的违规处理政策请参见[服务条款](TERMS_OF_SERVICE.md)。

---

## 故障排除

### DNS 部署失败

1. 检查 Cloudflare API 令牌是否有效
2. 验证 Zone ID 是否正确
3. 查看 Cloudflare API 限制是否已达到
4. 检查部署日志中的详细错误信息

### 验证脚本错误

1. 本地运行验证脚本进行调试：
```bash
python scripts/validation/domain_validator.py
```

2. 检查脚本依赖项是否完整
3. 验证配置文件格式

---

## 安全最佳实践

1. 定期轮换 Cloudflare API 令牌
2. 使用最小权限原则配置令牌权限
3. 监控异常活动
4. 定期审计域名配置

---

## 备份和恢复

GitHub 仓库本身提供了版本历史作为备份。此外：

1. 考虑定期导出所有域名配置
2. 保存 Cloudflare 区域设置的备份

---

**最后更新**: 2025-11-03
