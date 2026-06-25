/**
 * Workspace-Scoped Model Templates Sync API Route
 *
 * GET: Pull model templates from server
 * POST: Push model templates to server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext } from '@/lib/api/workspace-context';
import type { ModelTemplate } from '@/lib/llm/models/assignment';
import { logger } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { adapter } = await getWorkspaceContext(params, 'viewer');

    const templates = await adapter.getAllModelTemplates() || [];

    return NextResponse.json({
      success: true,
      modelTemplates: templates,
    });
  } catch (error) {
    logger.error('[API /api/w/[workspaceId]/sync/model-templates GET] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message === 'Workspace access denied' || error.message === 'Insufficient workspace permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch model templates' },
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
    const { modelTemplates } = body as { modelTemplates: ModelTemplate[] };

    if (!modelTemplates || !Array.isArray(modelTemplates)) {
      return NextResponse.json(
        { error: 'Invalid modelTemplates data - expected array' },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const t of modelTemplates) {
      if (t.builtin) continue; // never sync read-only built-ins

      try {
        const existing = await adapter.getModelTemplate(t.id);
        const record: ModelTemplate = {
          id: t.id,
          name: t.name,
          description: t.description,
          assignment: t.assignment,
          updatedAt: new Date(),
        };
        if (existing) {
          await adapter.updateModelTemplate(record);
          updated++;
        } else {
          await adapter.createModelTemplate(record);
          created++;
        }
      } catch (tErr) {
        errors.push(`Failed to sync template "${t.name}": ${tErr instanceof Error ? tErr.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('[API /api/w/[workspaceId]/sync/model-templates POST] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message === 'Workspace access denied' || error.message === 'Insufficient workspace permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync model templates' },
      { status: 500 }
    );
  }
}
