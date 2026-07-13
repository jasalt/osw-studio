import { describe, it, expect } from 'vitest';
import { PreviewLifecycle } from '../preview-lifecycle';

describe('PreviewLifecycle', () => {
  it('goes loading → ready on a matching ack', () => {
    const lc = new PreviewLifecycle();
    lc.beginLoad(1);
    expect(lc.state).toBe('loading');
    expect(lc.onAck(1)).toBe(true);
    expect(lc.state).toBe('ready');
  });

  it('ignores a stale ack (superseded load) — not an escape', () => {
    const lc = new PreviewLifecycle();
    lc.beginLoad(1);
    lc.beginLoad(2); // load 1 superseded before it acked
    expect(lc.onAck(1)).toBe(false); // stale
    expect(lc.state).toBe('loading'); // still waiting on load 2
    expect(lc.onAck(2)).toBe(true);
    expect(lc.state).toBe('ready');
  });

  it('escape signal: auto-reloads once, then escapes', () => {
    const lc = new PreviewLifecycle();
    lc.beginLoad(1);
    expect(lc.onEscapeSignal(1)).toBe('auto-reload'); // first miss → one reload
    // the auto-reload writes a new document as a recovery load (budget stays spent)
    lc.beginLoad(2, true);
    expect(lc.onEscapeSignal(2)).toBe('escaped'); // still no ack → overlay
    expect(lc.state).toBe('escaped');
  });

  it('a successful ack after an auto-reload clears the budget', () => {
    const lc = new PreviewLifecycle();
    lc.beginLoad(1);
    expect(lc.onEscapeSignal(1)).toBe('auto-reload');
    lc.beginLoad(2, true);
    expect(lc.onAck(2)).toBe(true); // recovery load succeeded
    expect(lc.state).toBe('ready');
    // a later, unrelated escape gets its own fresh auto-reload
    lc.beginLoad(3); // normal navigation resets the budget
    expect(lc.onEscapeSignal(3)).toBe('auto-reload');
  });

  it('detects an escape after ready (e.g. a form submit navigated the frame away)', () => {
    const lc = new PreviewLifecycle();
    lc.beginLoad(1);
    lc.onAck(1); // ready
    expect(lc.state).toBe('ready');
    // the load-event marker check finds the frame is no longer ours
    expect(lc.onEscapeSignal(1)).toBe('auto-reload');
  });

  it('ignores escape signals for a superseded load', () => {
    const lc = new PreviewLifecycle();
    lc.beginLoad(1);
    lc.beginLoad(2);
    expect(lc.onEscapeSignal(1)).toBe('ignore'); // stale timer from load 1
    expect(lc.state).toBe('loading');
  });

  it('normal navigation resets the auto-reload budget between loads', () => {
    const lc = new PreviewLifecycle();
    lc.beginLoad(1);
    expect(lc.onEscapeSignal(1)).toBe('auto-reload');
    lc.beginLoad(2); // NOT a recovery — user navigated
    expect(lc.onEscapeSignal(2)).toBe('auto-reload'); // fresh budget
  });
});
