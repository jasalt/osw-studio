import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

let turndown: TurndownService | null = null;
function getTurndown(): TurndownService {
  if (!turndown) turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  return turndown;
}

// Minimum readable-text length before we trust Readability's extraction over
// the raw document body. Short fixtures/pages get low-quality Readability
// output (heading demotion, URL normalization), so fall back to the raw body.
const MIN_READABLE_LENGTH = 200;

export function htmlToMarkdown(html: string, baseUrl: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Resolve relative links against the source URL so markdown links work.
    const base = doc.createElement('base');
    base.href = baseUrl;
    doc.head?.appendChild(base);
    const article = new Readability(doc).parse();
    const readableText = article?.textContent?.trim() ?? '';
    const contentHtml =
      article?.content && readableText.length >= MIN_READABLE_LENGTH
        ? article.content
        : doc.body?.innerHTML || html;
    const md = getTurndown().turndown(contentHtml).trim();
    return md || (doc.body?.textContent || '').trim();
  } catch {
    return html;
  }
}
