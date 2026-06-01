/**
 * Workspace-Scoped Publish Deployment API
 *
 * POST - Build and publish a deployment (with quota enforcement)
 */

import { logger } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import { buildStaticDeployment } from '@/lib/compiler/static-builder';
import { getWorkspaceContext } from '@/lib/api/workspace-context';
import { getWorkspaceById, getWorkspaceDeploymentCount, getDeploymentWorkspace, registerDeploymentRoute, getDeploymentRoute } from '@/lib/auth/system-database';
import { enqueueEvent } from '@/lib/webhooks/outbox';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const { adapter, workspaceId } = await getWorkspaceContext(params);
    const { id } = await params;

    // Quota enforcement (managed mode only — standalone has no limits)
    const isManagedMode = !!process.env.NEXT_PUBLIC_GATEWAY_URL;
    if (isManagedMode) {
      const alreadyRegistered = !!getDeploymentWorkspace(id);
      if (!alreadyRegistered) {
        const workspace = getWorkspaceById(workspaceId);
        if (workspace) {
          const deploymentCount = getWorkspaceDeploymentCount(workspaceId);
          if (deploymentCount >= workspace.max_deployments) {
            return NextResponse.json(
              { error: `Deployment limit reached (${workspace.max_deployments}).` },
              { status: 403 }
            );
          }
        }
      }
    }

    // Build the deployment using workspace adapter
    const result = await buildStaticDeployment(id, workspaceId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to build deployment' },
        { status: 500 }
      );
    }

    // Update deployment metadata after successful build
    const deployment = await adapter.getDeployment?.(id);
    if (deployment && adapter.updateDeployment) {
      deployment.lastPublishedVersion = deployment.settingsVersion;
      deployment.publishedAt = new Date();
      deployment.updatedAt = new Date();

      // Enable deployment database for analytics when publishing
      if (!deployment.databaseEnabled) {
        deployment.databaseEnabled = true;
        await adapter.enableDeploymentDatabase(id);
      }

      await adapter.updateDeployment(deployment);
    }

    // Register deployment route for subdomain routing
    const previousRoute = getDeploymentRoute(id);
    const oldDomain = previousRoute?.custom_domain || null;
    const newDomain = deployment?.customDomain || null;
    registerDeploymentRoute(id, workspaceId, deployment?.slug, deployment?.customDomain);

    // Notify gateway of domain changes
    if (oldDomain && oldDomain !== newDomain) {
      enqueueEvent('deployment.domain_removed', { deploymentId: id, customDomain: oldDomain });
    }
    if (newDomain && newDomain !== oldDomain) {
      enqueueEvent('deployment.domain_registered', { deploymentId: id, workspaceId, customDomain: newDomain });
    }

    return NextResponse.json({
      success: true,
      deploymentId: result.deploymentId,
      projectId: result.projectId,
      filesWritten: result.filesWritten,
      outputPath: result.outputPath,
      lastPublishedVersion: deployment?.settingsVersion ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message === 'Workspace access denied' || error.message === 'Insufficient workspace permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error('[Deployments API] Error publishing deployment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish deployment' },
      { status: 500 }
    );
  }
}
