/**
 * Shared keyword cleaning + matching for Comment-to-DM automations.
 * Kept separate from engine.ts so API routes can import without Meta Graph deps.
 *
 * Matching is intentionally fuzzy:
 * - strip #, trim, lowercase on both sides
 * - whole-token / hashtag match
 * - substring / partial contains (e.g. "masterclass" inside a longer comment)
 * - small Levenshtein distance for typos (e.g. "marsterclass" ≈ "masterclass")
 */

function normalizeKeyword(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .trim();
}

/** Normalize free-form comment text for comparison. */
export function normalizeCommentText(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/[#@]/g, ' ')
    .replace(/[^\p{L}\p{N}\s_]/gu, ' ')
    .replace(/\s+/g, ' ')
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
  return normalizeCommentText(commentText)
    .split(/\s+/)
    .map((w) => w.replace(/^#+/, '').trim())
    .filter(Boolean);
}

/** Tiny Levenshtein for typo-tolerant keyword matches. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);
  for (let j = 0; j < cols; j += 1) prev[j] = j;
  for (let i = 1; i < rows; i += 1) {
    curr[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + cost
      );
    }
    for (let j = 0; j < cols; j += 1) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

function typoDistanceAllowed(keywordLength: number): number {
  if (keywordLength <= 4) return 0;
  if (keywordLength <= 7) return 1;
  return Math.max(1, Math.floor(keywordLength * 0.25));
}

/**
 * True when comment text matches the keyword flexibly:
 * exact token, hashtag, substring/partial, or near-typo token.
 */
export function commentMatchesKeyword(
  commentText: string,
  keyword: string
): boolean {
  const kw = normalizeKeyword(keyword);
  if (!kw) return false;

  const hay = normalizeCommentText(commentText);
  const words = commentWordTokens(commentText);

  // Exact token / hashtag
  if (words.includes(kw)) return true;
  if (hay.includes(`#${kw}`)) return true;

  // Partial / substring (e.g. keyword "masterclass" inside free text)
  if (hay.includes(kw)) return true;

  // Keyword contains a long comment token (or vice versa)
  for (const token of words) {
    if (token.length >= 4 && (token.includes(kw) || kw.includes(token))) {
      return true;
    }
  }

  // Typo-tolerant: "marsterclass" ≈ "masterclass"
  const maxDist = typoDistanceAllowed(kw.length);
  if (maxDist > 0) {
    for (const token of words) {
      if (Math.abs(token.length - kw.length) > maxDist + 1) continue;
      if (levenshtein(token, kw) <= maxDist) return true;
    }
  }

  // Boundary-aware regex fallback for glued punctuation
  const re = new RegExp(
    `(^|[^\\p{L}\\p{N}_])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}\\p{N}_]|$)`,
    'iu'
  );
  return re.test(hay);
}

export function findMatchingKeyword(
  commentText: string,
  keywords: string[]
): string | null {
  const cleaned = cleanTriggerKeywords(keywords);
  if (cleaned.length === 0) return null;

  // Prefer exact token hits first for stable logging / analytics.
  const words = new Set(commentWordTokens(commentText));
  for (const kw of cleaned) {
    if (words.has(kw)) return kw;
  }

  for (const kw of cleaned) {
    if (commentMatchesKeyword(commentText, kw)) return kw;
  }
  return null;
}
