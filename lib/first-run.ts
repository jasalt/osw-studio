// Decide whether a fresh visitor should be dropped into an auto-created first project.
// False when any URL param indicates an existing destination (a specific project, an OAuth
// return, a doc, or settings), or when the user already has projects.
export function shouldAutoCreateFirstProject(opts: { search: string; projectCount: number }): boolean {
  if (opts.projectCount > 0) return false;
  const params = new URLSearchParams(opts.search);
  for (const key of ['project', 'code', 'error', 'doc', 'settings']) {
    if (params.has(key)) return false;
  }
  return true;
}
