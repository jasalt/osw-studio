'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Mic, Brain, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { configManager } from '@/lib/config/storage';
import { resolveAssignment } from '@/lib/llm/models/assignment';
import type { ProjectModelConfig, ModelRef, ModelAssignment } from '@/lib/llm/models/assignment';
import { setProjectTemplate, setProjectSlotOverride, clearProjectOverrides } from '@/lib/llm/models/project-overrides';
import { loadProviderModels } from '@/lib/llm/models/model-catalog';
import { useWorkspaceStore } from '@/lib/stores/workspace';
import { ModelPicker } from './model-picker';
import type { ModelPickValue } from './model-picker';
import { modelRefLabel } from './format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrawerSlot = 'agent' | 'imageGen' | 'voiceInput';

interface ProjectModelsPanelProps {
  projectId: string;
  onManageSettings: () => void;
  /** When set (mobile dialog), the panel renders a footer "Done" row alongside Save. */
  onDone?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Hook: enrich a ModelRef with a friendly display name (best-effort async)
// ---------------------------------------------------------------------------

function useEnrichedName(ref: ModelRef | null): string {
  const [name, setName] = useState<string>(() => (ref ? modelRefLabel(ref) : ''));

  useEffect(() => {
    if (!ref) { setName(''); return; }
    // Immediately show the short id while we wait
    setName(modelRefLabel(ref));
    let cancelled = false;
    loadProviderModels(ref.provider).then((models) => {
      if (cancelled) return;
      const found = models.find((m) => m.id === ref.model);
      if (found) setName(found.name);
    }).catch(() => { /* best-effort */ });
    return () => { cancelled = true; };
  }, [ref?.provider, ref?.model]); // eslint-disable-line react-hooks/exhaustive-deps

  return name;
}

// ---------------------------------------------------------------------------
// "Changed for this project" chip
// ---------------------------------------------------------------------------

function ChangedChip() {
  return (
    <span className="inline-flex items-center gap-[3px] px-[6px] py-[1px] rounded-sm text-[10px] font-semibold border text-amber-400 bg-amber-400/10 border-amber-400/30">
      changed for this project
    </span>
  );
}

// ---------------------------------------------------------------------------
// Model display value for a row (agent / imageGen / voiceInput)
// ---------------------------------------------------------------------------

interface SlotValueDisplayProps {
  slot: DrawerSlot;
  value: ModelRef | 'agent' | 'browser' | null;
  agentRef: ModelRef;
}

function SlotValueDisplay({ slot, value, agentRef }: SlotValueDisplayProps) {
  // For agent slot the value is always a ModelRef
  const directRef: ModelRef | null =
    slot === 'agent'
      ? (value as ModelRef)
      : value !== null && value !== 'agent' && value !== 'browser'
        ? (value as ModelRef)
        : null;

  const enrichedName = useEnrichedName(directRef);
  const agentEnrichedName = useEnrichedName(
    slot !== 'agent' && value === 'agent' ? agentRef : null,
  );

  if (slot === 'agent') {
    const ref = value as ModelRef;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm tracking-[-0.01em] text-foreground">
          {enrichedName || modelRefLabel(ref)}
        </span>
        <span className="text-xs font-mono text-muted-foreground">{ref.provider}</span>
      </div>
    );
  }

  if (value === null) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span className="w-[7px] h-[7px] rounded-full bg-muted-foreground/40 flex-shrink-0" />
        {slot === 'voiceInput' ? 'Off — no mic' : 'Off'}
      </div>
    );
  }

  if (value === 'agent') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm tracking-[-0.01em] text-foreground">
          {agentEnrichedName || modelRefLabel(agentRef)}
        </span>
        <span className="text-xs text-muted-foreground">— same as agent</span>
      </div>
    );
  }

  if (value === 'browser') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm tracking-[-0.01em] text-foreground">
          Browser / on-device
        </span>
      </div>
    );
  }

  // Regular ModelRef
  const ref = value as ModelRef;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold text-sm tracking-[-0.01em] text-foreground">
        {enrichedName || modelRefLabel(ref)}
      </span>
      <span className="text-xs font-mono text-muted-foreground">{ref.provider}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline collapsible section
// ---------------------------------------------------------------------------

interface SectionProps {
  icon: React.ReactNode;
  label: string;
  isChanged: boolean;
  expanded: boolean;
  onToggle: () => void;
  slot: DrawerSlot;
  value: ModelRef | 'agent' | 'browser' | null;
  agentRef: ModelRef;
  pickerValue: ModelPickValue;
  onPick: (v: ModelPickValue) => void;
}

function Section({
  icon,
  label,
  isChanged,
  expanded,
  onToggle,
  slot,
  value,
  agentRef,
  pickerValue,
  onPick,
}: SectionProps) {
  return (
    <div className="rounded-lg border border-border bg-muted">
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          // Padding is constant in both states so toggling doesn't shift the header;
          // the bottom divider only appears when the picker is shown below.
          'w-full flex items-center gap-3 px-[10px] py-2 text-left cursor-pointer',
          expanded && 'border-b border-border',
        )}
      >
        <div className="flex-1 min-w-0">
          {/* Label row */}
          <div className="flex items-center gap-[7px]">
            <span className="text-[10px] font-semibold tracking-[0.07em] uppercase text-muted-foreground flex items-center gap-[5px]">
              <span className="text-muted-foreground">{icon}</span>
              {label}
            </span>
            {isChanged && <ChangedChip />}
          </div>
          {/* Current model value */}
          <SlotValueDisplay slot={slot} value={value} agentRef={agentRef} />
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'flex-shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {/* Inline picker — rendered only when expanded */}
      {expanded && (
        <ModelPicker
          slot={slot}
          currentValue={pickerValue}
          onPick={onPick}
          inline
          agentRef={agentRef}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function ProjectModelsPanel({ projectId, onManageSettings, onDone }: ProjectModelsPanelProps) {
  // ---- Read config from the store mirror (set in Part A) ----
  const storeConfig = useWorkspaceStore(s => s.projectModelConfig);

  const getConfig = useCallback((): ProjectModelConfig => {
    if (storeConfig) return storeConfig;
    return { templateId: configManager.getDefaultTemplateId(), overrides: {} };
  }, [storeConfig]);

  const config = getConfig();

  // ---- Resolve effective values synchronously ----
  const template =
    configManager.getModelTemplate(config.templateId) ??
    configManager.getModelTemplate(configManager.getDefaultTemplateId());

  // Guard: if template is still null (first-render before migration), show nothing meaningful
  const effective = template ? resolveAssignment(template, config) : null;

  // ---- Templates list for the selector ----
  const templates = configManager.getModelTemplates();
  const sortedTemplates = Object.values(templates).sort((a, b) => {
    if (a.builtin && !b.builtin) return -1;
    if (!a.builtin && b.builtin) return 1;
    return a.name.localeCompare(b.name);
  });

  const hasOverrides = Object.keys(config.overrides ?? {}).length > 0;

  // ---- Accordion: at most one section open (agent by default; all may be closed) ----
  const [openSlot, setOpenSlot] = useState<DrawerSlot | null>('agent');
  const toggleSlot = (s: DrawerSlot) => setOpenSlot((prev) => (prev === s ? null : s));

  // ---- Mirror helper ----
  function mirror(newConfig: ProjectModelConfig) {
    useWorkspaceStore.getState().updateProjectSettings({ models: newConfig });
  }

  // ---- Template selector ----
  async function handleTemplateSelect(id: string) {
    if (id === config.templateId && !hasOverrides) return;
    // Switching discards this project's per-slot overrides — confirm first.
    if (hasOverrides) {
      const name = configManager.getModelTemplate(id)?.name ?? 'this template';
      if (!window.confirm(`Switching to ${name} will discard this project's custom model selections. Continue?`)) return;
    }
    const newConfig = await setProjectTemplate(projectId, id);
    mirror(newConfig);
  }

  // ---- Reset ----
  async function handleReset() {
    const newConfig = await clearProjectOverrides(projectId);
    mirror(newConfig);
  }

  // ---- Save the project's effective selections back into its template ----
  // Promotes the per-project overrides into the (non-builtin) template shared by
  // any project using it, then clears the now-redundant overrides.
  async function handleSaveToTemplate() {
    if (!template || template.builtin || !effective || !hasOverrides) return;
    configManager.saveModelTemplate({ ...template, assignment: effective });
    const newConfig = await clearProjectOverrides(projectId);
    mirror(newConfig);
  }

  // ---- Picker onPick (takes slot explicitly) ----
  async function handlePick(slot: DrawerSlot, value: ModelPickValue) {
    let newConfig: ProjectModelConfig;
    if (slot === 'agent') {
      if (value && typeof value === 'object') {
        newConfig = await setProjectSlotOverride(projectId, 'agent', value);
        mirror(newConfig);
      }
    } else if (slot === 'imageGen') {
      const v = value === 'browser' ? null : (value as ModelAssignment['imageGen']);
      newConfig = await setProjectSlotOverride(projectId, 'imageGen', v);
      mirror(newConfig);
    } else if (slot === 'voiceInput') {
      const v = value as ModelAssignment['voiceInput'];
      newConfig = await setProjectSlotOverride(projectId, 'voiceInput', v);
      mirror(newConfig);
    }
  }

  // ---- Per-slot picker current value ----
  function pickerCurrentValue(slot: DrawerSlot): ModelPickValue {
    if (!effective) return null;
    if (slot === 'agent') return effective.agent;
    if (slot === 'imageGen') return effective.imageGen;
    if (slot === 'voiceInput') return effective.voiceInput;
    return null;
  }

  // Guard: if there are no templates yet (migration hasn't run), show loading state
  if (!template || !effective) {
    return (
      <div className="flex items-center justify-center py-8 text-[13px] text-muted-foreground">
        Loading…
      </div>
    );
  }

  // The selector always shows the active template. Per-project overrides are
  // surfaced by the per-slot "changed" chips and the Save / Reset buttons — no
  // separate "custom" pseudo-entry needed.
  return (
    <div className="flex flex-col min-h-0">
      {/* ---- Header: label + template selector + Reset ---- */}
      <div className="flex-shrink-0 p-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground shrink-0">
            Models
          </p>
          <Select value={template.id} onValueChange={handleTemplateSelect}>
            <SelectTrigger size="sm" className="rounded-full gap-1.5 text-[13px] font-medium text-foreground min-w-0 max-w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortedTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.id === configManager.getDefaultTemplateId() ? ' (your default)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            {/* On mobile the Save button moves to the footer, next to Done. */}
            {!onDone && hasOverrides && !template.builtin && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveToTemplate}
                title={`Save these selections into the "${template.name}" template`}
              >
                Save to &ldquo;{template.name}&rdquo;
              </Button>
            )}
            {(hasOverrides || config.templateId !== configManager.getDefaultTemplateId()) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground"
              >
                <RotateCcw className="size-3.5" strokeWidth={2} />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ---- Body: inline collapsible sections ---- */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="space-y-2">
          <Section
            icon={<Brain size={11} strokeWidth={2} />}
            label="Agent"
            isChanged={Object.prototype.hasOwnProperty.call(config.overrides ?? {}, 'agent')}
            expanded={openSlot === 'agent'}
            onToggle={() => toggleSlot('agent')}
            slot="agent"
            value={effective.agent}
            agentRef={effective.agent}
            pickerValue={pickerCurrentValue('agent')}
            onPick={(v) => handlePick('agent', v)}
          />
          <Section
            icon={<ImageIcon size={11} strokeWidth={2} />}
            label="Image generation"
            isChanged={Object.prototype.hasOwnProperty.call(config.overrides ?? {}, 'imageGen')}
            expanded={openSlot === 'imageGen'}
            onToggle={() => toggleSlot('imageGen')}
            slot="imageGen"
            value={effective.imageGen}
            agentRef={effective.agent}
            pickerValue={pickerCurrentValue('imageGen')}
            onPick={(v) => handlePick('imageGen', v)}
          />
          <Section
            icon={<Mic size={11} strokeWidth={2} />}
            label="Voice input"
            isChanged={Object.prototype.hasOwnProperty.call(config.overrides ?? {}, 'voiceInput')}
            expanded={openSlot === 'voiceInput'}
            onToggle={() => toggleSlot('voiceInput')}
            slot="voiceInput"
            value={effective.voiceInput}
            agentRef={effective.agent}
            pickerValue={pickerCurrentValue('voiceInput')}
            onPick={(v) => handlePick('voiceInput', v)}
          />
        </div>
      </div>

      {/* ---- Footer ---- */}
      <div className="flex-shrink-0 border-t border-border px-[18px] py-[10px] space-y-[6px]">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Changes apply to{' '}
          <strong className="text-muted-foreground font-semibold">this project only</strong>.
        </p>
        <button
          type="button"
          onClick={onManageSettings}
          className={cn(
            'inline-flex items-center gap-[6px]',
            'text-xs font-medium text-foreground',
            'bg-transparent border-none cursor-pointer transition-colors',
            'hover:text-primary',
          )}
        >
          Manage providers &amp; templates
          <ChevronRight size={13} strokeWidth={2} />
        </button>

        {/* Mobile action row: Save (when applicable) next to Done */}
        {onDone && (
          <div className="flex items-center gap-2 pt-1.5">
            {hasOverrides && !template.builtin && (
              <Button variant="outline" size="sm" className="flex-1" onClick={handleSaveToTemplate}>
                Save to &ldquo;{template.name}&rdquo;
              </Button>
            )}
            <Button variant="default" size="sm" className="flex-1" onClick={onDone}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
