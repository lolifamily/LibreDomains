/**
 * Operation Result types - 系统操作的结果
 *
 * 这些类型表示各种操作的输出：
 * - Validation - 验证结果
 * - Health Check - 健康检查结果
 * - Deployment - 部署结果
 */

// ============ Validation Results ============

/**
 * Validation issue severity
 */
export type ValidationLevel = 'error' | 'warning';

/**
 * Validation issue - Discriminated Union by scope
 *
 * 三种明确的作用域：
 * - record: 记录级别（有 file 和 fqdn）
 * - file: 文件级别（只有 file）
 * - global: 全局级别（无 file 和 fqdn）
 */
export type ValidationIssue
  = {
    scope: 'record';
    level: ValidationLevel;
    file: string;
    fqdn: string;
    message: string;
  } | {
    scope: 'file';
    level: ValidationLevel;
    file: string;
    message: string;
  } | {
    scope: 'global';
    level: ValidationLevel;
    message: string;
  };

/**
 * Validation report
 */
export interface ValidationReport {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// ============ Health Check Results ============

/**
 * NOTE: HTTPS only (HTTP is irrelevant in 2025)
 */
export interface HealthCheckResult {
  subdomain: string;
  fqdn: string;
  owner: string;
  accessible: boolean;
  finalURL?: string;
  error?: string;
  skipped?: boolean;
}

// ============ Deployment Results ============

/**
 * Atomic deployment result (all succeed or all fail)
 */
export interface DeploymentResult {
  created: number;
  updated: number;
  deleted: number;
}
