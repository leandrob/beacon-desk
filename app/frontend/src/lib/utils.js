import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes conditionally (shadcn/ui helper). */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Replace {{customer}} / {{agent}} placeholders in a macro body. */
export function fillTemplate(body, vars = {}) {
  return String(body || '').replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? vars[key] : ''));
}

/** Very small plain-text → HTML renderer for knowledge base articles. */
export function renderArticle(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  const lines = String(text || '').split('\n');
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) {
      out.push(list === 'ul' ? '</ul>' : '</ol>');
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^## /.test(line)) { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (/^> /.test(line)) { closeList(); out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); continue; }
    if (/^[-*] /.test(line)) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    if (/^\d+\. /.test(line)) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`); continue; }
    if (!line.trim()) { closeList(); continue; }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}
