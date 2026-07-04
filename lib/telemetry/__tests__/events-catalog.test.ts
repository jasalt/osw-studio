import { describe, it, expect } from 'vitest';
import { EVENT_CATALOG, DISCLOSURE_CATEGORIES, getDisclosureLines } from '../events';

describe('EVENT_CATALOG', () => {
  it('every event has a category and a non-empty disclosure line', () => {
    for (const [name, def] of Object.entries(EVENT_CATALOG)) {
      expect(def.category, name).toBeTruthy();
      expect(def.disclosure.length, name).toBeGreaterThan(10);
    }
  });

  it('every category used by an event exists in DISCLOSURE_CATEGORIES', () => {
    const known = new Set(DISCLOSURE_CATEGORIES.map(c => c.id));
    for (const [name, def] of Object.entries(EVENT_CATALOG)) {
      expect(known.has(def.category), `${name}: ${def.category}`).toBe(true);
    }
  });

  it('still contains every pre-existing event name', () => {
    for (const legacy of ['session_start','pageview','heartbeat','provider_selected','model_selected','task_started','task_complete','task_fail','tool_call','api_error','project_create','deployment_publish','compaction_fired','image_attached','telemetry_disabled','telemetry_accepted']) {
      expect(EVENT_CATALOG[legacy as keyof typeof EVENT_CATALOG], legacy).toBeTruthy();
    }
  });
});

describe('getDisclosureLines', () => {
  it('groups by category and dedupes repeated disclosure lines', () => {
    const groups = getDisclosureLines();
    // Every group has a label and at least one line.
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.label).toBeTruthy();
      expect(g.lines.length).toBeGreaterThan(0);
      // Lines within a group are deduped (several events share one disclosure line).
      expect(new Set(g.lines).size).toBe(g.lines.length);
    }
  });

  it('surfaces a line for every category that has events', () => {
    const groups = getDisclosureLines();
    const labels = new Set(groups.map(g => g.label));
    for (const cat of DISCLOSURE_CATEGORIES) {
      const hasEvent = Object.values(EVENT_CATALOG).some(d => d.category === cat.id);
      if (hasEvent) expect(labels.has(cat.label), cat.label).toBe(true);
    }
  });
});
