'use client';

import { useState } from 'react';
import { configManager } from '@/lib/config/storage';
import {
  GATE_COMMANDS,
  ASK_DEFAULT_KEYS,
  ALWAYS_ALLOWED_NOTES,
  type GateDecision,
} from '@/lib/llm/permissions';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

function effectiveDecision(
  key: string,
  overrides: Record<string, GateDecision>
): GateDecision {
  return overrides[key] ?? (ASK_DEFAULT_KEYS.has(key) ? 'ask' : 'allow');
}

function facetLabel(key: string): string | null {
  const idx = key.indexOf(':');
  return idx === -1 ? null : key.slice(idx + 1);
}

interface PermissionMatrixProps {
  onModeChange?: () => void;
}

export function PermissionMatrix({ onModeChange }: PermissionMatrixProps) {
  const [overrides, setOverrides] = useState<Record<string, GateDecision>>(() =>
    configManager.getPermissionOverrides()
  );

  const setDecision = (key: string, decision: GateDecision) => {
    configManager.setPermissionMode('custom');
    configManager.setPermissionOverride(key, decision);
    setOverrides(configManager.getPermissionOverrides());
    onModeChange?.();
  };

  const resetToAskDefaults = () => {
    configManager.setPermissionOverrides({});
    configManager.setPermissionMode('ask');
    setOverrides(configManager.getPermissionOverrides());
    onModeChange?.();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/50 p-3 text-xs space-y-1">
        <p className="font-medium text-foreground">This configures Custom mode</p>
        <p className="text-muted-foreground">
          These toggles define the Custom permission mode. Changing any of them
          switches the active mode to Custom (it does not affect Auto or Ask).
          Web access, image generation, and deletion ask by default.
        </p>
      </div>

      <div className="space-y-2">
        {GATE_COMMANDS.map((cmd) => (
          <div
            key={cmd.command}
            className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-b-0"
          >
            <span className="font-mono text-xs text-foreground truncate">
              {cmd.label}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              {cmd.keys.map((key) => {
                const facet = facetLabel(key);
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    {facet && (
                      <span className="text-[10px] text-muted-foreground w-12 text-right">
                        {facet}
                      </span>
                    )}
                    <ToggleGroup
                      type="single"
                      value={effectiveDecision(key, overrides)}
                      onValueChange={(value: string) => {
                        if (value === 'ask' || value === 'allow') {
                          setDecision(key, value);
                        }
                      }}
                    >
                      <ToggleGroupItem value="ask" size="sm" className="text-xs px-2">
                        Ask
                      </ToggleGroupItem>
                      <ToggleGroupItem value="allow" size="sm" className="text-xs px-2">
                        Allow
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Always allowed
        </p>
        {ALWAYS_ALLOWED_NOTES.map((note) => (
          <p key={note.command} className="text-xs text-muted-foreground">
            <span className="font-mono text-foreground">{note.command}</span>: {note.reason}
          </p>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={resetToAskDefaults}>
          Reset to Ask defaults
        </Button>
      </div>
    </div>
  );
}
