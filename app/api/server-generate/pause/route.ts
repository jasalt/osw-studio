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
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  if (task.sessionId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (task.orchestrator && task.status === 'running') {
    task.orchestrator.stop();
    task.status = 'paused';
  }

  return NextResponse.json({ ok: true });
}
