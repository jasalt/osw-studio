import { useState, useMemo } from 'react';
import { Search, ClipboardList, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { filterInterviewTemplates } from '@/lib/interview/templates';
import type { InterviewTemplate } from '@/lib/interview/types';

interface InterviewPickerProps {
  templates: InterviewTemplate[];
  onStart: (template: InterviewTemplate) => void;
  disabled?: boolean;
}

export function InterviewPicker({ templates, onStart, disabled }: InterviewPickerProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => filterInterviewTemplates(templates, query), [templates, query]);
  const selected = selectedId ? filtered.find(t => t.id === selectedId) ?? null : null;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-blue-500">
        <ClipboardList className="h-4 w-4" />
        <span>Start an interview</span>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No templates match “{query}”.</div>
        ) : (
          filtered.map((t) => {
            const isSelected = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                onDoubleClick={() => !disabled && onStart(t)}
                className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div className="text-xs font-medium text-foreground">{t.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                {t.artifacts[0] && (
                  <div className="text-[11px] text-blue-500/80 mt-1 font-mono truncate">→ {t.artifacts[0].path}</div>
                )}
              </button>
            );
          })
        )}
      </div>

      <Button
        size="sm"
        disabled={!selected || disabled}
        onClick={() => selected && onStart(selected)}
        className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        Start interview
      </Button>
    </div>
  );
}
