import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { taskManager } from '@/lib/server-generate/singleton';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let taskId: string;
  try { ({ taskId } = await request.json()); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const task = taskManager.getTask(taskId);
  if (!task) {
    return NextResponse.json({ ok: true, alreadyDone: true });
  }

  if (task.sessionId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
    return NextResponse.json({ ok: true, alreadyDone: true });
  }

  const hasOrchestrator = !!task.orchestrator;
  if (task.orchestrator) {
    task.orchestrator.stop();
  }
  task.status = 'stopping';

  return NextResponse.json({ ok: true, hadOrchestrator: hasOrchestrator });
}
