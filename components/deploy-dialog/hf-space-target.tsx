'use client';

import React, { useEffect, useState } from 'react';
import { vfs } from '@/lib/vfs';
import { Project } from '@/lib/vfs/types';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import { publishToSpace, PublishProgress } from '@/lib/publishing/hf-space-publisher';
import { TerminalRuntimeError } from '@/lib/publishing/compile-static-site';
import { suggestSpaceSlug, isValidSpaceSlug } from '@/lib/publishing/hf-slug';
import { hasPublishScope, loginHF, checkHFCapabilities } from '@/lib/auth/hf-auth';
import { configManager } from '@/lib/config/storage';

type PublishMode = 'update' | 'new';
type Status = 'idle' | 'needsScope' | 'publishing' | 'done' | 'error';

const PHASE_LABEL: Record<PublishProgress['phase'], string> = {
  compiling: 'Compiling site...',
  creating: 'Creating Space...',
  uploading: 'Uploading files...',
};

/**
 * The "HuggingFace Space" deployment target body — the form + actions, rendered inside the
 * DeployDialog shell. Publishes the project as a static Space under the user's account.
 */
export function HFSpaceTarget({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [mode, setMode] = useState<PublishMode>('new');

  const [status, setStatus] = useState<Status>('idle');
  const [progressPhase, setProgressPhase] = useState<PublishProgress['phase'] | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await vfs.init();
      const proj = await vfs.getProject(projectId);
      if (cancelled || !proj) return;

      setProject(proj);
      setDescription(proj.description ?? '');

      const existing = proj.settings?.hfSpace;
      if (existing) {
        setMode('update');
        // Preserve the existing Space's visibility — update mode commits files but does not
        // change privacy, so don't reset the toggle to a value that misrepresents the Space.
        setIsPrivate(existing.isPrivate);
        const existingSlug = existing.repoId.includes('/')
          ? existing.repoId.split('/').slice(1).join('/')
          : existing.repoId;
        setSlug(existingSlug);
      } else {
        setMode('new');
        setIsPrivate(false);
        setSlug(suggestSpaceSlug(proj.name));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const hasExistingSpace = !!project?.settings?.hfSpace;
  const slugLocked = mode === 'update';
  const slugValid = slugLocked || isValidSpaceSlug(slug);
  const isPublishing = status === 'publishing';

  const handleClose = () => {
    if (isPublishing) return;
    onClose();
  };

  const handleCopyUrl = () => {
    if (!resultUrl) return;
    navigator.clipboard.writeText(resultUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // The stored HF token predates this feature (or the deployment) if it lacks the publishing
  // scope. Show an explicit prompt rather than silently full-page-redirecting on the primary
  // action — so the user understands the round-trip, and a misconfigured deployment that never
  // grants the scope shows the same clear prompt instead of an invisible bounce loop.
  async function handleGrantPermission() {
    // Stash the open project so studio-app can restore it after the OAuth round-trip
    // (the redirect returns to the app root without ?project=). Mirrors chat-panel's HF sign-in.
    try {
      sessionStorage.setItem('hf_oauth_return_project', projectId);
    } catch {}
    const caps = await checkHFCapabilities();
    if (caps.oauthAvailable && caps.clientId) {
      await loginHF(caps.clientId, caps.scopes);
    } else {
      setErrorMsg('Connect your HuggingFace account in Settings to publish.');
      setStatus('error');
    }
  }

  async function handlePublish() {
    if (!hasPublishScope()) {
      setStatus('needsScope');
      return;
    }

    const auth = configManager.getHFAuth();
    if (!auth?.access_token || !auth.username) {
      setErrorMsg('Not connected to HuggingFace, or the connection is missing your username. Reconnect and try again.');
      setStatus('error');
      return;
    }

    try {
      setStatus('publishing');
      setErrorMsg('');
      setProgressPhase(null);

      const res = await publishToSpace(
        vfs,
        projectId,
        {
          accessToken: auth.access_token,
          username: auth.username,
          slug,
          isPrivate,
          description,
          includeFooter,
          mode,
        },
        (p) => setProgressPhase(p.phase)
      );

      const proj = await vfs.getProject(projectId);
      if (proj) {
        proj.settings = {
          ...proj.settings,
          hfSpace: {
            repoId: res.repoId,
            url: res.url,
            isPrivate,
            lastPublishedAt: new Date().toISOString(),
          },
        };
        await vfs.updateProject(proj);
      }

      setResultUrl(res.url);
      setStatus('done');
    } catch (e) {
      if (e instanceof TerminalRuntimeError) {
        setErrorMsg('This project type can’t be published as a static Space. Use ZIP export instead.');
        setStatus('error');
        return;
      }
      // A 403/401 here means the token lacks the create-Space permission — e.g. a pasted token
      // (whose scopes we can't inspect up front, so hasPublishScope() passes optimistically) or a
      // stale OAuth grant. Route to the grant-permission prompt instead of showing a raw API error.
      const statusCode = (e as { statusCode?: number })?.statusCode;
      if (statusCode === 403 || statusCode === 401) {
        setStatus('needsScope');
        return;
      }
      setErrorMsg(e instanceof Error ? e.message : 'Publish failed');
      setStatus('error');
    }
  }

  return (
    <>
      {status === 'done' && resultUrl ? (
        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground">Your site is live at:</div>
          <div className="flex items-center gap-2 rounded border p-2 text-sm">
            <span className="flex-1 truncate">{resultUrl}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopyUrl} title="Copy URL">
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => window.open(resultUrl, '_blank', 'noopener,noreferrer')}
              title="Open in new tab"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          {copied && <p className="text-xs text-muted-foreground">Copied to clipboard</p>}
        </div>
      ) : status === 'needsScope' ? (
        <div className="grid gap-3 py-4 text-sm">
          <p>
            Publishing needs permission to create a Space on your HuggingFace account.
            You&apos;ll be sent to HuggingFace to grant it, then returned here to publish.
          </p>
          <p className="text-xs text-muted-foreground">
            If you grant it and this keeps asking, the deployment may not yet be configured
            for publishing.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 py-4">
          {hasExistingSpace && (
            <div className="grid gap-2">
              <Label>Publish mode</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'update' ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={isPublishing}
                  onClick={() => {
                    setMode('update');
                    if (project?.settings?.hfSpace) {
                      const existingSlug = project.settings.hfSpace.repoId.includes('/')
                        ? project.settings.hfSpace.repoId.split('/').slice(1).join('/')
                        : project.settings.hfSpace.repoId;
                      setSlug(existingSlug);
                      setIsPrivate(project.settings.hfSpace.isPrivate);
                    }
                  }}
                >
                  Update existing
                </Button>
                <Button
                  type="button"
                  variant={mode === 'new' ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={isPublishing}
                  onClick={() => {
                    setMode('new');
                    setSlug(suggestSpaceSlug(project?.name ?? ''));
                    setIsPrivate(false);
                  }}
                >
                  Publish as new
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="hf-slug">Space name</Label>
            <Input
              id="hf-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={slugLocked || isPublishing}
              placeholder="my-site"
            />
            {!slugValid && (
              <p className="text-xs text-destructive">
                Use lowercase letters, numbers, and single hyphens (no leading/trailing hyphen).
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hf-description">Description</Label>
            <Input
              id="hf-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPublishing}
              placeholder="A short description of your site"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hf-private">Private Space</Label>
              <p className="text-xs text-muted-foreground">Only you can view this Space</p>
            </div>
            <Switch
              id="hf-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={isPublishing || mode === 'update'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hf-footer">&quot;Built with OSW Studio&quot; footer</Label>
              <p className="text-xs text-muted-foreground">Adds a small attribution footer to your site</p>
            </div>
            <Switch
              id="hf-footer"
              checked={includeFooter}
              onCheckedChange={setIncludeFooter}
              disabled={isPublishing}
            />
          </div>

          {isPublishing && progressPhase && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {PHASE_LABEL[progressPhase]}
            </div>
          )}

          {status === 'error' && errorMsg && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">{errorMsg}</div>
          )}
        </div>
      )}

      <DialogFooter>
        {status === 'done' ? (
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        ) : status === 'needsScope' ? (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleGrantPermission}>Grant permission on HuggingFace</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing || !slug || !slugValid}>
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}
