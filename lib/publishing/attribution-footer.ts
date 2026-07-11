const OSW_SPACE_URL = 'https://huggingface.co/spaces/otst/osw-studio';

const CREDIT_HTML =
  `<div data-osw-credit style="text-align:center;font:12px/1.6 system-ui,sans-serif;` +
  `padding:12px;opacity:.6">` +
  `Built with <a href="${OSW_SPACE_URL}" target="_blank" rel="noopener" ` +
  `style="color:inherit">OSW Studio</a></div>`;

/** Inject the opt-out "Built with OSW Studio" credit before </body>. Idempotent. */
export function injectAttributionFooter(html: string): string {
  if (html.includes('data-osw-credit')) return html;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${CREDIT_HTML}</body>`);
  }
  return html + CREDIT_HTML;
}
