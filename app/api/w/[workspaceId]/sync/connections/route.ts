/**
 * Workspace-Scoped Connections Sync API Route
 *
 * GET: Pull all custom connections from server
 * POST: Push bulk custom connections to server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext } from '@/lib/api/workspace-context';
import type { CustomConnection } from '@/lib/llm/providers/connection-record';
import { assertPublicHttpUrl } from '@/lib/llm/providers/url-safety';
import { logger } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { adapter } = await getWorkspaceContext(params, 'viewer');
    const connections = await adapter.getAllConnections() || [];
    return NextResponse.json({ success: true, connections });
  } catch (error) {
    logger.error('[API .../sync/connections GET] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message === 'Workspace access denied' || error.message === 'Insufficient workspace permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { adapter } = await getWorkspaceContext(params);
    const body = await request.json();
    const { connections } = body as { connections: CustomConnection[] };

    if (!connections || !Array.isArray(connections)) {
      return NextResponse.json({ error: 'Invalid connections data - expected array' }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const c of connections) {
      if (!c?.id || !c?.name || !c?.baseUrl) {
        errors.push('Skipped a connection missing id, name, or baseUrl');
        continue;
      }
      try {
        // Build record explicitly — never spread the request object so no stray apiKey reaches the DB
        const rec: CustomConnection = {
          id: c.id,
          name: c.name,
          baseUrl: c.baseUrl,
          format: 'openai',
          apiKeyRequired: !!c.apiKeyRequired,
          updatedAt: new Date().toISOString(),
        };
        assertPublicHttpUrl(rec.baseUrl); // reject internal/loopback endpoints at write time
        const existing = await adapter.getConnection(rec.id);
        if (existing) {
          await adapter.updateConnection(rec);
          updated++;
        } else {
          await adapter.createConnection(rec);
          created++;
        }
      } catch (cErr) {
        errors.push(`Failed to sync connection "${c.name}": ${cErr instanceof Error ? cErr.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('[API .../sync/connections POST] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message === 'Workspace access denied' || error.message === 'Insufficient workspace permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync connections' },
      { status: 500 }
    );
  }
}
