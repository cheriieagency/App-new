/**
 * Inline image marker for CRM broadcasts.
 * The token lives in the body so the composer, preview, and Resend template
 * all place the picture at the same caret/drop position.
 */

export const EMAIL_IMAGE_TOKEN = '{image}';
export const EMAIL_IMAGE_TOKEN_RE = /\{image\}/gi;

export type EmailImagePlacement = 'top' | 'middle' | 'bottom' | 'inline';

export function stripEmailImageToken(body: string): string {
  return body.replace(EMAIL_IMAGE_TOKEN_RE, '');
}

export function splitBodyAroundImage(body: string): {
  before: string;
  after: string;
  hasMarker: boolean;
} {
  const match = body.match(/\{image\}/i);
  if (!match || match.index == null) {
    return { before: body, after: '', hasMarker: false };
  }
  return {
    before: body.slice(0, match.index),
    after: body.slice(match.index + match[0].length),
    hasMarker: true,
  };
}

/** Insert `{image}` at a character index (existing marker is moved). */
export function insertEmailImageToken(body: string, index: number): string {
  const cleaned = stripEmailImageToken(body);
  const i = Math.max(0, Math.min(cleaned.length, index));
  const left = cleaned.slice(0, i);
  const right = cleaned.slice(i);
  const leftPad = left && !left.endsWith('\n') ? '\n' : '';
  const rightPad = right && !right.startsWith('\n') ? '\n' : '';
  return `${left}${leftPad}${EMAIL_IMAGE_TOKEN}${rightPad}${right}`;
}

export function defaultImageInsertIndex(body: string): number {
  const cleaned = stripEmailImageToken(body);
  const para = cleaned.indexOf('\n\n');
  return para >= 0 ? para : cleaned.length;
}

export function deriveImagePlacement(body: string): EmailImagePlacement {
  const { before, after, hasMarker } = splitBodyAroundImage(body);
  if (!hasMarker) return 'middle';
  if (!before.trim()) return 'top';
  if (!after.trim()) return 'bottom';
  return 'inline';
}

/** Move the marker one paragraph up (−1) or down (+1). */
export function moveEmailImageToken(body: string, dir: -1 | 1): string {
  const { before, after, hasMarker } = splitBodyAroundImage(body);
  if (!hasMarker) return insertEmailImageToken(body, defaultImageInsertIndex(body));
  if (dir < 0) {
    const trimmed = before.replace(/\n+$/, '');
    const idx = trimmed.lastIndexOf('\n\n');
    if (idx < 0) return insertEmailImageToken(before + after, 0);
    return insertEmailImageToken(before + after, idx);
  }
  const lead = after.replace(/^\n+/, '');
  const idx = lead.indexOf('\n\n');
  if (idx < 0) return insertEmailImageToken(before + after, (before + after).length);
  return insertEmailImageToken(before + after, before.length + idx);
}

/**
 * Approximate caret index in a textarea from pointer coordinates
 * (used while dragging an image onto the body).
 */
export function textareaIndexFromPoint(
  ta: HTMLTextAreaElement,
  clientX: number,
  clientY: number
): number {
  const style = window.getComputedStyle(ta);
  const rect = ta.getBoundingClientRect();
  const lineHeight =
    parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 22;
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const y = Math.max(0, clientY - rect.top - paddingTop + ta.scrollTop);
  const x = Math.max(0, clientX - rect.left - paddingLeft);
  const lines = ta.value.split('\n');
  if (lines.length === 0) return 0;
  const lineIndex = Math.min(
    lines.length - 1,
    Math.max(0, Math.floor(y / lineHeight))
  );
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  let col = (lines[lineIndex] ?? '').length;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = font;
      const line = lines[lineIndex] ?? '';
      col = line.length;
      for (let i = 0; i <= line.length; i += 1) {
        if (ctx.measureText(line.slice(0, i)).width >= x) {
          col = i;
          break;
        }
      }
    }
  } catch {
    /* keep end-of-line */
  }
  let idx = 0;
  for (let i = 0; i < lineIndex; i += 1) idx += (lines[i] ?? '').length + 1;
  return idx + col;
}

export function textareaCaretTop(
  ta: HTMLTextAreaElement,
  index: number
): number {
  const style = window.getComputedStyle(ta);
  const lineHeight =
    parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 22;
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const prefix = ta.value.slice(0, Math.max(0, index));
  const line = prefix.split('\n').length - 1;
  return paddingTop + line * lineHeight - ta.scrollTop;
}
