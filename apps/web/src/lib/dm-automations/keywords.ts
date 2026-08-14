/**
 * Shared keyword cleaning + matching for Comment-to-DM automations.
 * Kept separate from engine.ts so API routes can import without Meta Graph deps.
 */

function normalizeKeyword(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .trim();
}

/** Expand Postgres text[] string forms like `{mer,kurs}` or `{"#MER","Kurs"}`. */
function expandPgArrayLiteral(raw: string): string[] {
  const s = raw.trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return [s];
  const inner = s.slice(1, -1).trim();
  if (!inner) return [];
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur) parts.push(cur);
  return parts.map((p) => p.replace(/\\"/g, '"').trim());
}

/**
 * Normalize trigger keywords for storage / matching:
 * split commas, strip leading #, trim, lowercase, dedupe.
 * Accepts string ("Mer, #Kurs"), pg `{…}`, or array (["Mer", "#Kurs"]).
 * Stored form example: ['mer', 'kurs', 'masterclass']
 */
export function cleanTriggerKeywords(input: unknown): string[] {
  const parts: string[] = [];

  if (Array.isArray(input)) {
    for (const item of input) {
      if (item == null) continue;
      const s = String(item);
      if (s.trim().startsWith('{') && s.trim().endsWith('}')) {
        parts.push(...expandPgArrayLiteral(s));
      } else if (s.includes(',')) {
        parts.push(...s.split(','));
      } else {
        parts.push(s);
      }
    }
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      parts.push(...expandPgArrayLiteral(trimmed));
    } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return cleanTriggerKeywords(parsed);
      } catch {
        parts.push(...trimmed.split(/[,;\n]+/));
      }
    } else {
      parts.push(...trimmed.split(/[,;\n]+/));
    }
  } else if (input && typeof input === 'object') {
    parts.push(...Object.values(input as Record<string, unknown>).map(String));
  } else {
    return [];
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const cleaned = normalizeKeyword(raw);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out;
}

/** Lowercase word tokens from a comment (hashtags become bare words). */
export function commentWordTokens(commentText: string): string[] {
  return String(commentText || '')
    .toLowerCase()
    .replace(/[#@]/g, ' ')
    .replace(/[^\p{L}\p{N}\s_]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^#+/, '').trim())
    .filter(Boolean);
}

/** True when comment text contains the keyword as a whole token / hashtag. */
export function commentMatchesKeyword(
  commentText: string,
  keyword: string
): boolean {
  const kw = normalizeKeyword(keyword);
  if (!kw) return false;
  const words = commentWordTokens(commentText);
  if (words.includes(kw)) return true;
  const hay = commentText.toLowerCase();
  if (hay.includes(`#${kw}`)) return true;
  const re = new RegExp(
    `(^|[^a-z0-9_åäö])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9_åäö]|$)`,
    'i'
  );
  return re.test(hay);
}

export function findMatchingKeyword(
  commentText: string,
  keywords: string[]
): string | null {
  const cleaned = cleanTriggerKeywords(keywords);
  if (cleaned.length === 0) return null;

  const words = new Set(commentWordTokens(commentText));
  for (const kw of cleaned) {
    if (words.has(kw)) return kw;
  }

  for (const kw of cleaned) {
    if (commentMatchesKeyword(commentText, kw)) return kw;
  }
  return null;
}
