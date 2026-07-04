'use client';

import React, { useState } from 'react';
import type { InterviewTemplate } from '@/lib/interview/types';
import {
  emptyForm,
  templateToForm,
  formToTemplate,
  validateTemplateForm,
  slugify,
  type TemplateForm,
} from '@/lib/interview/template-form';
import { interviewTemplatesService } from '@/lib/interview/templates-service';
import { track } from '@/lib/telemetry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

interface InterviewTemplateEditorProps {
  template: InterviewTemplate | null; // null = create
  onSaved: () => void;
  onCancel: () => void;
}

function derivedArtifactPath(title: string): string {
  return `/.interviews/${slugify(title) || 'untitled'}.md`;
}

export function InterviewTemplateEditor({ template, onSaved, onCancel }: InterviewTemplateEditorProps) {
  const isCreate = template === null;
  const readOnly = template?.isBuiltIn === true;

  const [form, setForm] = useState<TemplateForm>(() =>
    template ? templateToForm(template) : emptyForm()
  );
  const [saving, setSaving] = useState(false);

  const handleTitleChange = (title: string) => {
    setForm(prev => {
      const next: TemplateForm = { ...prev, title };
      // Only auto-derive the artifact path when creating and the user hasn't
      // manually edited it away from the previously-derived value.
      if (isCreate) {
        const prevDerived = derivedArtifactPath(prev.title);
        if (prev.artifactPath === prevDerived || prev.artifactPath === '/.interviews/untitled.md') {
          next.artifactPath = derivedArtifactPath(title);
        }
      }
      return next;
    });
  };

  const updateItem = (index: number, patch: Partial<TemplateForm['items'][number]>) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { question: '', criteria: '', required: true }],
    }));
  };

  const removeItem = (index: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handoffEnabled = form.handoff !== null;
  const setHandoffEnabled = (enabled: boolean) => {
    setForm(prev => ({
      ...prev,
      handoff: enabled ? (prev.handoff ?? { label: '', prompt: '', mode: 'code' }) : null,
    }));
  };
  const updateHandoff = (patch: Partial<NonNullable<TemplateForm['handoff']>>) => {
    setForm(prev => ({
      ...prev,
      handoff: prev.handoff ? { ...prev.handoff, ...patch } : prev.handoff,
    }));
  };

  const handleSave = async () => {
    const err = validateTemplateForm(form);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      if (isCreate) {
        const id = await interviewTemplatesService.generateId(form.title);
        await interviewTemplatesService.createTemplate(formToTemplate(form, id));
        track('interview_template_created');
        toast.success(`Created interview template: ${form.title.trim()}`);
      } else {
        await interviewTemplatesService.updateTemplate(template.id, formToTemplate(form, template.id));
        toast.success(`Updated interview template: ${form.title.trim()}`);
      }
      onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save interview template';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col bg-background h-[inherit]">
      {/* Header */}
      <div className="border-b px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">
                {readOnly ? 'View Interview Template' : isCreate ? 'Create Interview Template' : 'Edit Interview Template'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {readOnly
                  ? 'Built-in templates cannot be edited. Duplicate it to make your own version.'
                  : 'Define the questions and completion criteria for a guided interview.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && (
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6 max-w-3xl">
          {readOnly && (
            <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              This is a built-in template shown for reference. To customize it, use Duplicate from the list.
            </div>
          )}

          {!readOnly && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed space-y-2">
              <p>
                Interview mode is one of the workspace interaction modes, alongside Chat and Code, picked
                from the mode selector in the chat panel. In it you choose a template like this one, and
                the agent works through your items as a conversation, generally one at a time. It cannot
                finish until every required item is covered.
              </p>
              <p>
                It records what it learns into an <span className="font-medium text-foreground">artifact</span>:
                a Markdown notes file under <code className="font-mono">/.interviews/</code>. The interview
                agent reads the whole project freely but can only write inside that one folder, so an
                interview never changes your actual files. Turning those notes into real work is a
                separate step, which you can offer as a one-tap handoff (below).
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="template-title">Title *</Label>
            <Input
              id="template-title"
              placeholder="e.g. Plan a website"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              disabled={readOnly}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Name it by what it produces, like the built-ins: &quot;Understand a company&quot;, &quot;Plan a feature&quot;. Shown in the picker.
            </p>
          </div>

          <div>
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              placeholder="e.g. Turn an idea into a buildable plan for a site: its purpose, audience, pages, and the action it should drive."
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              disabled={readOnly}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              One sentence: what the interview gathers and what it is for.
            </p>
          </div>

          <div>
            <Label htmlFor="template-artifact">Artifact path *</Label>
            <Input
              id="template-artifact"
              placeholder="/.interviews/site-plan.md"
              value={form.artifactPath}
              onChange={(e) => setForm(prev => ({ ...prev, artifactPath: e.target.value }))}
              disabled={readOnly}
              className="mt-1.5 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The artifact: the Markdown file this interview writes its findings into. Give it a meaningful name. Must live under /.interviews/ and end in .md.
            </p>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items *</Label>
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add item
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Each item is one thing to gather. The question is what to learn from the user; the
              &quot;done when&quot; criteria is the checkable condition the completion check reads the artifact
              against. Order the items the way the conversation should flow.
            </p>
            <div className="space-y-4">
              {form.items.map((item, i) => (
                <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(i)}
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`item-question-${i}`} className="text-xs">Question</Label>
                    <Textarea
                      id={`item-question-${i}`}
                      placeholder="e.g. The pages or main sections the site needs (home, about, services, contact)"
                      value={item.question}
                      onChange={(e) => updateItem(i, { question: e.target.value })}
                      disabled={readOnly}
                      className="mt-1.5 min-h-[64px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      What to gather, not a literal script. The agent asks it in its own words, and can inspect the project first (e.g. &quot;check what is already there with ls&quot;).
                    </p>
                  </div>
                  <div>
                    <Label htmlFor={`item-criteria-${i}`} className="text-xs">
                      Done when (the artifact records...)
                    </Label>
                    <Textarea
                      id={`item-criteria-${i}`}
                      placeholder="e.g. The artifact lists the pages or main sections the site needs"
                      value={item.criteria}
                      onChange={(e) => updateItem(i, { criteria: e.target.value })}
                      disabled={readOnly}
                      className="mt-1.5 min-h-[64px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      A checkable statement about the artifact. Phrase it as &quot;The artifact records / lists / describes ...&quot;. A model reads the artifact and decides if this is met.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <Checkbox
                      checked={item.required}
                      onCheckedChange={(checked) => updateItem(i, { required: checked === true })}
                      disabled={readOnly}
                    />
                    <span className="text-sm">Required</span>
                  </label>
                </div>
              ))}
              {form.items.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No items yet. Add at least one item.
                </div>
              )}
            </div>
          </div>

          {/* Handoff */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <Checkbox
                checked={handoffEnabled}
                onCheckedChange={(checked) => setHandoffEnabled(checked === true)}
                disabled={readOnly}
              />
              <span className="text-sm font-medium">Handoff action</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Optional. A convenient way to let the user act on the result right away. Enable it to show
              the user a button, once the interview finishes, that starts a normal generation from what
              was recorded, without retyping anything. For example, the built-in &quot;Plan a website&quot;
              interview offers &quot;Build this site&quot;, which hands its site plan to the agent to build from.
              Configure the button below.
            </p>
            {handoffEnabled && form.handoff && (
              <div className="space-y-3 pt-1">
                <div>
                  <Label htmlFor="handoff-label" className="text-xs">Button label</Label>
                  <Input
                    id="handoff-label"
                    placeholder="e.g. Build this site"
                    value={form.handoff.label}
                    onChange={(e) => updateHandoff({ label: e.target.value })}
                    disabled={readOnly}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The text on the button shown when the interview finishes.
                  </p>
                </div>
                <div>
                  <Label htmlFor="handoff-prompt" className="text-xs">Prompt</Label>
                  <Textarea
                    id="handoff-prompt"
                    placeholder="e.g. Build the website described in /.interviews/site-plan.md"
                    value={form.handoff.prompt}
                    onChange={(e) => updateHandoff({ prompt: e.target.value })}
                    disabled={readOnly}
                    className="mt-1.5 min-h-[64px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The message sent to the agent when the user taps the button. Reference the artifact path so it reads what the interview recorded.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Mode</Label>
                  <Select
                    value={form.handoff.mode}
                    onValueChange={(v) => updateHandoff({ mode: v as 'code' | 'chat' })}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Code lets the agent edit the project. Chat is read-only. Most handoffs that build something use Code.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
