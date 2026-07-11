/** Conservative HF repo-name sanitization: lowercase [a-z0-9-], single hyphens, <=96 chars. */
export function suggestSpaceSlug(projectName: string): string {
  const slug = (projectName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 96)
    .replace(/-+$/, ''); // re-trim in case the slice landed on a hyphen
  return slug || 'my-site';
}

/** Matches the conservative subset we generate; the server does final validation. */
export function isValidSpaceSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 96;
}
