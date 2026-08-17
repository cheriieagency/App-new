'use client';

import { useRef, useState, type RefObject } from 'react';
import { Link2, Plus, Share2 } from 'lucide-react';

/** Personalization brackets creators can insert into subject/body. */
export const EMAIL_MERGE_TAGS = [
  { tag: '{first_name}', label: 'First name' },
  { tag: '{name}', label: 'Full name' },
  { tag: '{email}', label: 'Email' },
  { tag: '{community}', label: 'Community' },
  { tag: '{community_url}', label: 'Community URL' },
] as const;

const SOCIAL_LINK_PRESETS = [
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/yourhandle',
    insert: (url: string) => `Instagram: ${url}`,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@yourhandle',
    insert: (url: string) => `TikTok: ${url}`,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@yourchannel',
    insert: (url: string) => `YouTube: ${url}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/yourprofile',
    insert: (url: string) => `LinkedIn: ${url}`,
  },
  {
    key: 'website',
    label: 'Website',
    placeholder: 'https://yoursite.com',
    insert: (url: string) => url,
  },
] as const;

type EmailBodyToolbarProps = {
  /** Target field to insert into (body or subject). */
  targetRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  /** Subject lines only need merge tags; body gets links + social too. */
  mode?: 'full' | 'tags';
};

/** Insert text at the current caret (or append) inside an input/textarea. */
export function insertAtCursor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  snippet: string,
  onChange: (next: string) => void
) {
  if (!el) {
    onChange(value + snippet);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + snippet + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    const caret = start + snippet.length;
    el.setSelectionRange(caret, caret);
  });
}

/**
 * Compact toolbar for email subject/body: merge tags, links, and social URLs.
 */
export default function EmailBodyToolbar({
  targetRef,
  value,
  onChange,
  className = '',
  mode = 'full',
}: EmailBodyToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://');
  const [socialKey, setSocialKey] = useState<string | null>(null);
  const [socialUrl, setSocialUrl] = useState('');
  const labelRef = useRef<HTMLInputElement>(null);

  const insert = (snippet: string) => {
    insertAtCursor(targetRef.current, value, snippet, onChange);
  };

  const commitLink = () => {
    const url = linkUrl.trim();
    if (!url || url === 'https://') return;
    const label = linkLabel.trim() || url;
    insert(`${label}: ${url}`);
    setLinkOpen(false);
    setLinkLabel('');
    setLinkUrl('https://');
  };

  const commitSocial = () => {
    const preset = SOCIAL_LINK_PRESETS.find((p) => p.key === socialKey);
    const url = socialUrl.trim();
    if (!preset || !url) return;
    insert(preset.insert(url));
    setSocialKey(null);
    setSocialUrl('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-1.5">
        {EMAIL_MERGE_TAGS.map((item) => (
          <button
            key={item.tag}
            type="button"
            title={`Insert ${item.label}`}
            onClick={() => insert(item.tag)}
            className="inline-flex items-center h-9 min-h-[36px] px-2.5 rounded-lg border border-slate-200 bg-white text-[10px] font-mono font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
          >
            {item.tag}
          </button>
        ))}
        {mode === 'full' && (
          <>
            <button
              type="button"
              onClick={() => {
                setLinkOpen((o) => !o);
                setSocialKey(null);
                requestAnimationFrame(() => labelRef.current?.focus());
              }}
              className="inline-flex items-center gap-1 h-9 min-h-[36px] px-2.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              <Link2 size={11} /> Link
            </button>
            <button
              type="button"
              onClick={() => {
                setSocialKey((k) => (k ? null : 'instagram'));
                setLinkOpen(false);
                setSocialUrl('');
              }}
              className="inline-flex items-center gap-1 h-9 min-h-[36px] px-2.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              <Share2 size={11} /> Social
            </button>
          </>
        )}
      </div>

      {mode === 'full' && linkOpen && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
            Insert link
          </p>
          <input
            ref={labelRef}
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Link text (optional)"
            className="w-full h-10 min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            className="w-full h-10 min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={commitLink}
              className="inline-flex items-center gap-1 h-10 min-h-[40px] px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              <Plus size={12} /> Add link
            </button>
            <button
              type="button"
              onClick={() => setLinkOpen(false)}
              className="h-10 min-h-[40px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'full' && socialKey && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
            Social / profile link
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SOCIAL_LINK_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setSocialKey(p.key);
                  setSocialUrl('');
                }}
                className={`inline-flex items-center gap-1 h-9 min-h-[36px] px-2.5 rounded-lg text-[10px] font-bold border transition-colors ${
                  socialKey === p.key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            value={socialUrl}
            onChange={(e) => setSocialUrl(e.target.value)}
            placeholder={
              SOCIAL_LINK_PRESETS.find((p) => p.key === socialKey)?.placeholder ??
              'https://…'
            }
            className="w-full h-10 min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={commitSocial}
              className="inline-flex items-center gap-1 h-10 min-h-[40px] px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              <Plus size={12} /> Add to email
            </button>
            <button
              type="button"
              onClick={() => setSocialKey(null)}
              className="h-10 min-h-[40px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 font-medium">
        {mode === 'full'
          ? 'Tap a tag to insert it at the cursor. Links and social URLs are added as plain text so they work in every inbox.'
          : 'Tap a tag to personalize this field for each recipient.'}
      </p>
    </div>
  );
}
