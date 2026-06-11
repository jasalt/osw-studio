'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronsDownUp, Copy, Trash2 } from 'lucide-react';
import { requestSnapshotStore } from '@/lib/llm/request-snapshot';
import { buildProviderView } from '@/lib/llm/provider-view';
import type { Message } from '@/lib/llm/core/types';
import { toast } from 'sonner';

const subscribe = (listener: () => void) => requestSnapshotStore.subscribe(listener);
const getSnapshot = () => requestSnapshotStore.getSnapshot();
const getEnabled = () => requestSnapshotStore.isEnabled();

/** Versioned expand/collapse-all override — rows stay individually toggleable after. */
export type ForceState = { open: boolean; v: number } | null;

function messagePreview(msg: Message): string {
  if (msg.tool_calls?.length) {
    const names = msg.tool_calls.map(tc => tc.function?.name || '?').join(', ');
    return `${msg.tool_calls.length} tool call(s): ${names}`;
  }
  if (typeof msg.content === 'string' && msg.content.trim()) {
    return msg.content.length > 100 ? msg.content.slice(0, 100) + '…' : msg.content;
  }
  if (Array.isArray(msg.content) && msg.content.length > 0) {
    return `[${msg.content.length} content block(s)]`;
  }
  if (msg.reasoning_details?.length) return '[reasoning only]';
  return '[empty]';
}

const ROLE_COLORS: Record<string, string> = {
  system: 'text-orange-500',
  user: 'text-primary',
  assistant: 'text-green-500',
  tool: 'text-blue-500',
};

function MessageRow({ msg, index, force }: { msg: Message; index: number; force?: ForceState }) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (force) setIsOpen(force.open);
  }, [force]);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full text-left">
        <div className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-xs">
          {isOpen ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
          <span className="text-muted-foreground font-mono shrink-0">{index}</span>
          <span className={`font-semibold shrink-0 ${ROLE_COLORS[msg.role] ?? 'text-foreground'}`}>{msg.role}</span>
          {msg.reasoning_details?.length ? (
            <span className="text-violet-500 shrink-0" title="has reasoning_details">R</span>
          ) : null}
          <span className="text-muted-foreground truncate">{messagePreview(msg)}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 p-2 bg-muted/30 rounded text-xs font-mono overflow-x-auto">
          <pre>{JSON.stringify(msg, null, 2)}</pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MessagesTab() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const enabled = useSyncExternalStore(subscribe, getEnabled, getEnabled);
  const [providerView, setProviderView] = useState(false);
  const [force, setForce] = useState<ForceState>(null);

  // Recomputes only when a new request is captured or the view toggles —
  // streaming deltas never reach this component.
  const messages = useMemo(() => {
    if (!snapshot) return null;
    return providerView ? buildProviderView(snapshot.messages, snapshot.model) : snapshot.messages;
  }, [snapshot, providerView]);

  const handleCopy = async () => {
    if (!messages) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(messages, null, 2));
      toast.success('Message history copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <>
      <div className="p-2 border-b border-border flex items-center gap-3 flex-wrap text-xs">
        <label className="flex items-center gap-1 cursor-pointer" title="Capture the exact message history of each outgoing LLM request (session-only, never persisted)">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => requestSnapshotStore.setEnabled(e.target.checked)}
            className="rounded"
          />
          Capture requests
        </label>
        <label className="flex items-center gap-1 cursor-pointer" title="Show the history as the API route sends it to the provider: reasoning replay policy applied, tool arguments sanitized">
          <input
            type="checkbox"
            checked={providerView}
            onChange={(e) => setProviderView(e.target.checked)}
            className="rounded"
            disabled={!snapshot}
          />
          Provider view
        </label>
        {messages && (
          <div className="ml-auto flex items-center">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" title="Expand all"
              onClick={() => setForce(v => ({ open: true, v: (v?.v ?? 0) + 1 }))}>
              <ChevronsUpDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" title="Collapse all"
              onClick={() => setForce(v => ({ open: false, v: (v?.v ?? 0) + 1 }))}>
              <ChevronsDownUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" title="Copy message history as JSON" onClick={handleCopy}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" title="Clear the captured message history" onClick={() => requestSnapshotStore.clear()}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {snapshot && (
        <div className="p-2 border-b border-border bg-muted/20 text-xs text-muted-foreground font-mono">
          {snapshot.provider} · {snapshot.model} · {snapshot.messages.length} messages · {new Date(snapshot.timestamp).toLocaleTimeString()}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!messages ? (
          <div className="text-xs text-muted-foreground text-center p-4">
            {enabled
              ? 'Waiting for the next LLM request — run a generation to capture its message history.'
              : 'Enable "Capture requests", then run a generation to inspect the exact message history sent to the provider. Local generations only (Server Mode requests are not forwarded).'}
          </div>
        ) : (
          messages.map((msg, i) => <MessageRow key={`${snapshot!.timestamp}-${i}`} msg={msg} index={i} force={force} />)
        )}
      </div>
    </>
  );
}
