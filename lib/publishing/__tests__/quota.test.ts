import { describe, it, expect } from 'vitest';
import { checkDeploymentQuota } from '../quota';

describe('checkDeploymentQuota', () => {
  it('allows publishing when under the limit', () => {
    const result = checkDeploymentQuota({
      isAlreadyRegistered: false,
      maxDeployments: 3,
      actualDeploymentCount: 1,
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks publishing when at the limit', () => {
    const result = checkDeploymentQuota({
      isAlreadyRegistered: false,
      maxDeployments: 3,
      actualDeploymentCount: 3,
    });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('3');
  });

  it('allows re-publishing an already registered deployment at the limit', () => {
    const result = checkDeploymentQuota({
      isAlreadyRegistered: true,
      maxDeployments: 3,
      actualDeploymentCount: 3,
    });
    expect(result.allowed).toBe(true);
  });
});
