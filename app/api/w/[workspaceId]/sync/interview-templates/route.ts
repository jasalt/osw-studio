/**
 * Workspace-Scoped Interview Templates Sync API Route
 *
 * GET: Pull interview templates from server
 * POST: Push interview templates to server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext } from '@/lib/api/workspace-context';
import type { InterviewTemplate } from '@/lib/interview/types';
import { isBuiltInInterviewTemplateId } from '@/lib/interview/templates';
import { logger } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { adapter } = await getWorkspaceContext(params, 'viewer');

    const templates = await adapter.getAllInterviewTemplates() || [];

    return NextResponse.json({
      success: true,
      interviewTemplates: templates,
    });
  } catch (error) {
    logger.error('[API /api/w/[workspaceId]/sync/interview-templates GET] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message === 'Workspace access denied' || error.message === 'Insufficient workspace permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch interview templates' },
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
    const { interviewTemplates } = body as { interviewTemplates: InterviewTemplate[] };

    if (!interviewTemplates || !Array.isArray(interviewTemplates)) {
      return NextResponse.json(
        { error: 'Invalid interviewTemplates data - expected array' },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const t of interviewTemplates) {
      if (isBuiltInInterviewTemplateId(t.id)) continue; // never sync read-only built-ins

      try {
        const existing = await adapter.getInterviewTemplate(t.id);
        const record: InterviewTemplate = { ...t, updatedAt: new Date() };
        if (existing) {
          await adapter.updateInterviewTemplate(record);
          updated++;
        } else {
          await adapter.createInterviewTemplate(record);
          created++;
        }
      } catch (tErr) {
        errors.push(`Failed to sync interview template "${t.title}": ${tErr instanceof Error ? tErr.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('[API /api/w/[workspaceId]/sync/interview-templates POST] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message === 'Workspace access denied' || error.message === 'Insufficient workspace permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync interview templates' },
      { status: 500 }
    );
  }
}
