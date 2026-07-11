import { createRepo, repoExists, commit } from '@huggingface/hub';
import type { CommitOperation } from '@huggingface/hub';
import type { VirtualFileSystem } from '@/lib/vfs';
import { compileStaticSite } from '@/lib/publishing/compile-static-site';
import { buildSpaceReadme } from '@/lib/publishing/hf-space-readme';
import { injectAttributionFooter } from '@/lib/publishing/attribution-footer';

interface PublishOptions {
  accessToken: string;
  username: string;
  slug: string;
  isPrivate: boolean;
  description: string;
  includeFooter: boolean;
  mode: 'update' | 'new';
}

export interface PublishProgress {
  phase: 'compiling' | 'creating' | 'uploading';
}

function toBlob(content: string | ArrayBuffer): Blob {
  return new Blob([content]);
}

export async function publishToSpace(
  vfs: VirtualFileSystem,
  projectId: string,
  opts: PublishOptions,
  onProgress?: (p: PublishProgress) => void,
): Promise<{ repoId: string; url: string }> {
  const repoId = `${opts.username}/${opts.slug}`;
  const repo = { type: 'space' as const, name: repoId };

  onProgress?.({ phase: 'compiling' });
  const { files } = await compileStaticSite(vfs, projectId); // throws TerminalRuntimeError

  const project = await vfs.getProject?.(projectId);
  const title = project?.name || opts.slug;

  const operations: CommitOperation[] = files.map((f) => {
    let content = f.content;
    if (opts.includeFooter && typeof content === 'string' && f.path.endsWith('.html')) {
      content = injectAttributionFooter(content);
    }
    return { operation: 'addOrUpdate', path: f.path, content: toBlob(content) };
  });
  operations.push({
    operation: 'addOrUpdate',
    path: 'README.md',
    content: toBlob(buildSpaceReadme({ title, shortDescription: opts.description })),
  });

  if (opts.mode === 'new') {
    if (await repoExists({ repo, accessToken: opts.accessToken })) {
      throw new Error(`The name "${opts.slug}" is already taken. Pick a different name.`);
    }
    onProgress?.({ phase: 'creating' });
    await createRepo({ repo, private: opts.isPrivate, sdk: 'static', accessToken: opts.accessToken });
  }

  onProgress?.({ phase: 'uploading' });
  await commit({
    repo,
    title: 'Update from OSW Studio',
    operations,
    accessToken: opts.accessToken,
  });

  return { repoId, url: `https://huggingface.co/spaces/${repoId}` };
}
