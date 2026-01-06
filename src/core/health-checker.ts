import { setTimeout } from 'node:timers/promises';
import pThrottle from 'p-throttle';
import type { DomainRegistry } from './registry';
import type { HealthCheckResult } from '@/types/results';

/**
 * HTTPS health check with retry (3 attempts, exponential backoff)
 * Follows within-scope redirects (max 3 per attempt)
 * Success = HTTP 200 only. Out-of-scope redirects fail immediately.
 */

interface TraceStep {
  url: string;
  status: number;
  error?: string;
}

function isWithinBaseDomain(hostname: string, baseDomain: string): boolean {
  return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
}

function formatTrace(trace: TraceStep[]): string {
  if (trace.length === 0) {
    return 'Unknown error (empty trace)';
  }

  if (trace.length === 1) {
    const step = trace[0];
    if (step.error) {
      return `${step.url}: ${step.error}`;
    }
    return `HTTP ${step.status}`;
  }

  // Multiple steps: show full redirect chain
  const chain = trace.map((step) => {
    if (step.error) {
      return `${step.url} (${step.status || 'error'}: ${step.error})`;
    }
    return `${step.url} (${step.status})`;
  }).join(' → ');

  return chain;
}

function formatAllAttempts(attempts: { attemptNumber: number; trace: TraceStep[] }[]): string {
  if (attempts.length === 0) {
    return 'Unknown error (no attempts recorded)';
  }

  // Single attempt: use simple format (no attempt number)
  if (attempts.length === 1) {
    return formatTrace(attempts[0].trace);
  }

  // Multiple attempts: show all of them
  return attempts.map((attempt) => {
    const attemptLabel = `[Attempt ${attempt.attemptNumber}/3] `;
    return attemptLabel + formatTrace(attempt.trace);
  }).join('\n      ');  // Indent continuation lines
}

export default async function checkAll(
  registry: DomainRegistry,
  domain: string,
  requestInterval = 200,
  output = false,
): Promise<HealthCheckResult[]> {
  const baseDomain = domain;

  // Rate limiting: 每个请求之间至少间隔 requestInterval ms
  // 结合 5s 超时，天然限制最大并发 = 5000ms / requestInterval
  const throttle = pThrottle({
    limit: 1,
    interval: requestInterval,
  });

  // 固定 options，每次只需传 URL
  const rateLimitedFetch = throttle(async (url: string) =>
    fetch(url, {
      method: 'GET',
      redirect: 'manual',  // Manual redirect handling
      signal: AbortSignal.timeout(5000),  // 5s timeout per request
      headers: {
        'User-Agent': 'LibreDomains-HealthCheck/1.0',
      },
    }),
  );

  async function checkSubdomain(
    fqdn: string,
    owner: string,
    subdomain: string,
  ): Promise<HealthCheckResult> {
    const initialURL = `https://${fqdn}`;
    const baseResult = { subdomain, fqdn, owner };  // Extract common fields

    // Track ALL attempts' traces - show users everything, hide nothing
    const allAttempts: { attemptNumber: number; trace: TraceStep[] }[] = [];

    // Outer loop: Retry up to 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      let requestBudget = 3;  // Inner loop: Max 3 requests per attempt
      let currentURL = initialURL;
      const trace: TraceStep[] = [];  // Stack: record every request in this attempt

      try {
        // Inner loop: Follow redirects with request budget
        while (requestBudget > 0) {
          requestBudget--;

          const response = await rateLimitedFetch(currentURL);

          const status = response.status;

          // Early return: Success (ONLY 200)
          if (status === 200) {
            return {
              ...baseResult,
              accessible: true,
              finalURL: currentURL !== initialURL ? currentURL : undefined,
            };
          }

          // Not a redirect: failure
          if (status < 300 || status >= 400) {
            trace.push({ url: currentURL, status, error: 'Non-200 status' });
            allAttempts.push({ attemptNumber: attempt + 1, trace });
            break;
          }

          // It's a redirect (3xx) - early return on errors, continue on success
          const location = response.headers.get('Location');
          if (!location) {
            trace.push({ url: currentURL, status, error: 'No Location header' });
            allAttempts.push({ attemptNumber: attempt + 1, trace });
            break;
          }

          const targetURL = new URL(location, currentURL);
          if (!isWithinBaseDomain(targetURL.hostname, baseDomain)) {
            trace.push({ url: currentURL, status, error: `Out of scope: ${targetURL.hostname}` });
            allAttempts.push({ attemptNumber: attempt + 1, trace });
            return {
              ...baseResult,
              accessible: false,
              finalURL: targetURL.href,
              error: formatAllAttempts(allAttempts),
            };
          }

          // Within-scope redirect: record and follow it
          // Check if this is the last request we can make
          if (requestBudget === 0) {
            // Budget exhausted: this redirect caused it
            trace.push({ url: currentURL, status, error: 'Request budget exhausted (too many redirects)' });
            allAttempts.push({ attemptNumber: attempt + 1, trace });
            break;
          }

          // Still have budget: record and continue
          trace.push({ url: currentURL, status });
          currentURL = targetURL.href;
        }
      } catch (error) {
        trace.push({
          url: currentURL,
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        });
        allAttempts.push({ attemptNumber: attempt + 1, trace });
      }

      // Wait before retry (exponential backoff: 500ms, 1s, 2s)
      if (attempt < 2) {
        await setTimeout(500 * Math.pow(2, attempt));
      }
    }

    // All 3 attempts failed - show everything
    return {
      ...baseResult,
      accessible: false,
      error: formatAllAttempts(allAttempts),
    };
  }

  // Get all config files
  const configFiles = registry.getConfigFiles();
  const registryDomain = registry.getDomain();

  // Start all checks concurrently (rate limiting handled by rateLimitedFetch)
  const promises = Object.entries(configFiles).map(async ([subdomain, cfg]) => {
    const fqdn = `${subdomain}.${registryDomain}`;
    const owner = cfg.owner.github;

    // Skip health check if nocheck is true
    if (cfg.nocheck) {
      if (output) {
        console.log(`   ⏭️ ${fqdn} (${owner}) - Skipped (nocheck: true)`);
      }
      return {
        subdomain: fqdn,
        fqdn,
        owner,
        accessible: true,  // Mark as accessible to avoid alerts
        skipped: true,  // New flag to indicate check was skipped
      };
    }

    // Skip health check if no accessible root record exists
    // 没有 @ 记录指向 A/AAAA/CNAME/NS 时，HTTPS 检查必然失败，跳过可节省时间
    const hasAccessibleRoot = cfg.records.some(
      r => r.name === '@' && ['A', 'AAAA', 'CNAME', 'NS'].includes(r.type),
    );

    if (!hasAccessibleRoot) {
      if (output) {
        console.log(`   ⏭️ ${fqdn} (${owner}) - Skipped (no accessible root record)`);
      }
      return {
        subdomain: fqdn,
        fqdn,
        owner,
        accessible: false,  // Mark as not accessible (expected)
        skipped: true,
        error: 'No accessible root record (@ → A/AAAA/CNAME/NS)',
      };
    }

    const result = await checkSubdomain(fqdn, owner, fqdn);

    // Streaming output: print immediately when done
    if (output) {
      if (result.accessible) {
        console.log(`   ✅ ${result.fqdn} (${result.owner})`);
        if (result.finalURL && result.finalURL !== `https://${result.fqdn}`) {
          console.log(`      Redirects to: ${result.finalURL}`);
        }
      } else {
        console.log(`   ❌ ${result.fqdn} (${result.owner})`);
        console.log(`      ${result.error}`);
      }
    }

    return result;
  });

  // Use allSettled to ensure all checks complete even if some fail
  const settledResults = await Promise.allSettled(promises);

  // Extract successful results (reject should never happen if checkSubdomain catches all errors)
  const results: HealthCheckResult[] = [];
  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      // This should never happen, but log it for debugging
      console.error('Unexpected rejection in checkSubdomain:', result.reason);
    }
  }

  return results;
}
