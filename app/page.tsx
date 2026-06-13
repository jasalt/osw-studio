'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudioApp } from '@/components/studio-app';

/**
 * Root page
 *
 * Browser mode: Renders the StudioApp (single-page app)
 * Server mode (desktop): Bootstraps workspace, sets cookie, redirects
 * Server mode (web): Redirects to /admin/projects (middleware handles workspace routing)
 */
export default function Home() {
  const router = useRouter();
  const [bootError, setBootError] = useState<string | null>(null);
  const isServerMode = process.env.NEXT_PUBLIC_SERVER_MODE === 'true';
  const isDesktop = process.env.NEXT_PUBLIC_DESKTOP === 'true';

  useEffect(() => {
    if (!isServerMode) return;

    if (isDesktop) {
      // Always bootstrap — desktop-init is idempotent and validates that the
      // workspace actually exists. Trusting the cookie alone routed users into
      // a dead workspace when the database was lost (e.g. during an update),
      // with no way to recover.
      fetch('/api/auth/desktop-init', { method: 'POST' })
        .then(async r => {
          const data = await r.json().catch(() => ({}));
          if (r.ok && data.workspaceId) {
            document.cookie = `osw_workspace=${data.workspaceId}; path=/; max-age=${365 * 24 * 60 * 60}`;
            router.push(`/w/${data.workspaceId}/projects`);
          } else {
            setBootError(data.error || `Workspace initialization failed (HTTP ${r.status})`);
          }
        })
        .catch((err) => {
          setBootError(err instanceof Error ? err.message : 'Workspace initialization request failed');
        });
    } else {
      router.push('/admin/projects');
    }
  }, [isServerMode, isDesktop, router]);

  if (isServerMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        {bootError ? (
          <div className="max-w-lg px-8 text-zinc-400 space-y-3">
            <p className="text-zinc-200 font-semibold">OSW Studio could not initialize its workspace.</p>
            <p className="text-sm">{bootError}</p>
            <p className="text-sm">
              Restarting the app may help. If the problem persists, please report it at{' '}
              <a className="underline" href="https://github.com/o-stahl/osw-studio/issues" target="_blank" rel="noreferrer">
                github.com/o-stahl/osw-studio/issues
              </a>{' '}
              including this message.
            </p>
          </div>
        ) : (
          <p className="text-zinc-400">Loading...</p>
        )}
      </div>
    );
  }

  return <StudioApp />;
}
