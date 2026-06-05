/**
 * Admin Workspace Repair API
 * POST /api/admin/workspaces/[id]/repair — detect and fix data issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, verifyInstanceApiKey } from '@/lib/auth/session';
import { getWorkspaceById, verifyWorkspaceAccess } from '@/lib/auth/system-database';
import { repairWorkspace } from '@/lib/auth/default-workspace';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiSession = verifyInstanceApiKey(request);
    const session = apiSession || await requireAuth();
    const { id } = await params;

    // Allow instance API keys, admins, or workspace owners
    if (!session.isAdmin) {
      try {
        verifyWorkspaceAccess(session.userId, id, 'owner');
      } catch {
        return NextResponse.json({ error: 'Admin or workspace owner access required' }, { status: 403 });
      }
    }

    const workspace = getWorkspaceById(id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const result = repairWorkspace(id);

    return NextResponse.json({
      success: true,
      repaired: result,
      summary: [
        result.legacyDbMigrated ? 'Migrated legacy database to workspace' : null,
        result.legacyProjectsMigrated > 0 ? `Migrated ${result.legacyProjectsMigrated} project database(s)` : null,
        result.deploymentRoutesCreated > 0 ? `Created ${result.deploymentRoutesCreated} deployment route(s)` : null,
        result.errors.length > 0 ? `${result.errors.length} error(s) occurred` : null,
      ].filter(Boolean),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to repair workspace' }, { status: 500 });
  }
}
