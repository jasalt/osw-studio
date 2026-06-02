/**
 * Deployment quota enforcement.
 *
 * Quota limits are set by the gateway via workspace settings.
 * Enforcement counts actual deployments from the workspace database —
 * never from the routing table, which can have stale entries.
 */

export interface QuotaCheckInput {
  isAlreadyRegistered: boolean;
  maxDeployments: number;
  actualDeploymentCount: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  error?: string;
}

export function checkDeploymentQuota(input: QuotaCheckInput): QuotaCheckResult {
  if (input.isAlreadyRegistered) {
    return { allowed: true };
  }

  if (input.actualDeploymentCount >= input.maxDeployments) {
    return { allowed: false, error: `Deployment limit reached (${input.maxDeployments}).` };
  }

  return { allowed: true };
}
