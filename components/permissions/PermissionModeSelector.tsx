'use client';

import { useState } from 'react';
import { Shield, Cog, ChevronDown, ChevronUp } from 'lucide-react';
import { configManager } from '@/lib/config/storage';
import type { PermissionMode } from '@/lib/llm/permissions';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { PermissionMatrixModal } from './PermissionMatrixModal';

const MODE_LABELS: Record<PermissionMode, string> = {
  auto: 'Auto',
  ask: 'Ask',
  custom: 'Custom',
};

export function PermissionModeSelector() {
  const [mode, setMode] = useState<PermissionMode>(() =>
    configManager.getPermissionMode()
  );
  const [open, setOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);

  const selectMode = (m: PermissionMode) => {
    configManager.setPermissionMode(m);
    setMode(m);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 p-0 gap-0 overflow-hidden text-xs rounded-t-lg rounded-b-none"
              >
                <span className="flex items-center gap-1 h-full px-2">
                  <Shield className="h-3 w-3" />
                  {MODE_LABELS[mode]}
                </span>
                <span className="flex items-center h-full px-1.5 bg-muted border-l border-border">
                  {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px]">
            <p className="font-semibold">Command permissions</p>
            <p className="mt-1 opacity-90">
              When the agent should ask before running a consequential command.
            </p>
            <ul className="mt-1.5 space-y-0.5">
              <li><span className="font-semibold">Auto</span><span className="opacity-90">: run everything without asking.</span></li>
              <li><span className="font-semibold">Ask</span><span className="opacity-90">: confirm web access, image generation, and deletion.</span></li>
              <li><span className="font-semibold">Custom</span><span className="opacity-90">: choose per command.</span></li>
            </ul>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-40 p-1" align="end" side="top">
          {(['auto', 'ask', 'custom'] as PermissionMode[]).map((m) => (
            <button
              key={m}
              onClick={() => selectMode(m)}
              className={`flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted ${
                m === mode ? 'font-semibold bg-muted/50' : ''
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            onClick={() => {
              setOpen(false);
              setMatrixOpen(true);
            }}
            className="flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
          >
            <Cog className="h-3 w-3" />
            Customize...
          </button>
        </PopoverContent>
      </Popover>

      <PermissionMatrixModal
        open={matrixOpen}
        onOpenChange={setMatrixOpen}
        onModeChange={() => setMode(configManager.getPermissionMode())}
      />
    </>
  );
}
