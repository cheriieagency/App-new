'use client';

import { useEffect, useState, type ElementType } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Hash,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PlatformBadge } from '@/components/planner/PlatformBadge';
import {
  TONE_OPTIONS,
  type AiContentIdea,
  type ContentTone,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

type CopilotMode = 'ideas' | 'caption' | 'hashtags' | 'hooks' | 'saved';

type SavedIdea = {
  id: string;
  title: string;
  body: string;
  source: CopilotMode | 'manual';
  savedAt: string;
};

const SAVED_KEY = 'nc_ai_copilot_saved_ideas';

const PLATFORM_OPTIONS: { key: SocialPlatform; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
];

const MODE_DEFS: {
  key: CopilotMode;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
  icon: ElementType;
}[] = [
  {
    key: 'ideas',
    labelKey: 'copilotIdeas',
    hintKey: 'copilotIdeasHint',
    icon: Lightbulb,
  },
  {
    key: 'caption',
    labelKey: 'copilotCaption',
    hintKey: 'copilotCaptionHint',
    icon: MessageSquareText,
  },
  {
    key: 'hashtags',
    labelKey: 'copilotHashtags',
    hintKey: 'copilotHashtagsHint',
    icon: Hash,
  },
  {
    key: 'hooks',
    labelKey: 'copilotHooks',
    hintKey: 'copilotHooksHint',
    icon: Wand2,
  },
  {
    key: 'saved',
    labelKey: 'copilotSaved',
    hintKey: 'copilotSavedHint',
    icon: Bookmark,
  },
];

const QUICK_PROMPTS = [
  '5 tips för att starta e-handel',
  'Hur man bygger en community som köper',
  'Behind the scenes från en livesändning',
  'Vanliga misstag creators gör med content',
];

function extractHashtags(text: string): string {
  const tags = text.match(/#[\wåäöÅÄÖ]+/gi) ?? [];
  if (tags.length) return [...new Set(tags)].join(' ');
  const words = text
    .toLowerCase()
    .replace(/[^\wåäö\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
  return [...words.map((w) => `#${w}`), '#nordiccreator', '#contentcreator', '#tips'].join(' ');
}

function buildHooks(prompt: string, tone: ContentTone): string[] {
  const topic = prompt.trim() || 'ditt ämne';
  const openers: Record<ContentTone, string[]> = {
    inspirerande: [
      `Sluta scrolla — det här ändrar hur du ser på ${topic}.`,
      `Du behöver inte mer tid. Du behöver detta kring ${topic}.`,
      `3 saker jag önskar att jag visste tidigare om ${topic}.`,
    ],
    professionell: [
      `En konkret approach till ${topic} som faktiskt skalar.`,
      `Data > magkänsla: så här jobbar vi med ${topic}.`,
      `Framework: så strukturerar du ${topic} på 15 minuter.`,
    ],
    saljig: [
      `Vill du mer resultat från ${topic}? Börja här.`,
      `Det här är anledningen till att ${topic} funkar (när du gör det rätt).`,
      `Gratis tipset som brukar kosta dig kunder — kring ${topic}.`,
    ],
    casual: [
      `Okej real talk om ${topic}…`,
      `Ingen fluff. Bara det som funkar med ${topic}.`,
      `POV: du äntligen fattar ${topic}.`,
    ],
  };
  return openers[tone];
}

function loadSavedIdeas(): SavedIdea[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedIdea[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedIdeas(items: SavedIdea[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_KEY, JSON.stringify(items));
}

export default function AiCopilotPanel({
  onUseIdea,
  onCreateFromCaption,
}: {
  onUseIdea: (idea: AiContentIdea, platform: SocialPlatform) => void;
  onCreateFromCaption: (input: {
    title: string;
    caption: string;
    hashtags: string;
    platforms: SocialPlatform[];
  }) => void;
}) {
  const { locale } = useLanguage();
  const [mode, setMode] = useState<CopilotMode>('ideas');
  const [prompt, setPrompt] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    'instagram',
    'tiktok',
    'linkedin',
  ]);
  const [tone, setTone] = useState<ContentTone>('inspirerande');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<AiContentIdea[]>([]);
  const [captionResult, setCaptionResult] = useState('');
  const [hashtagResult, setHashtagResult] = useState('');
  const [hooks, setHooks] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  useEffect(() => {
    setSavedIdeas(loadSavedIdeas());
  }, []);

  const modes = MODE_DEFS.map((m) => ({
    ...m,
    label: t(m.labelKey, locale),
    hint: t(m.hintKey, locale),
  }));

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const saveIdea = (title: string, body: string, source: CopilotMode) => {
    const entry: SavedIdea = {
      id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.slice(0, 80) || 'Saved idea',
      body,
      source,
      savedAt: new Date().toISOString(),
    };
    setSavedIdeas((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      persistSavedIdeas(next);
      return next;
    });
    setJustSaved(entry.id);
    setTimeout(() => setJustSaved(null), 1600);
  };

  const removeSaved = (id: string) => {
    setSavedIdeas((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSavedIdeas(next);
      return next;
    });
  };

  const run = async () => {
    if (!prompt.trim() || loading || mode === 'saved') return;
    if ((mode === 'ideas' || mode === 'caption') && platforms.length === 0) return;
    setLoading(true);
    try {
      if (mode === 'ideas') {
        const r = await fetch('/api/planner/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ideas', prompt, platforms, tone }),
        });
        const data = await r.json();
        setIdeas(data.ideas ?? []);
        setCaptionResult('');
        setHashtagResult('');
        setHooks([]);
      } else if (mode === 'caption') {
        const r = await fetch('/api/planner/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ideas', prompt, platforms, tone }),
        });
        const data = await r.json();
        const first: AiContentIdea | undefined = data.ideas?.[0];
        const raw =
          first?.captions[platforms[0]] ||
          Object.values(first?.captions ?? {})[0] ||
          prompt;
        const polish = await fetch('/api/planner/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'polish', caption: raw, tone }),
        });
        const polished = await polish.json();
        setCaptionResult(polished.caption || raw);
        setIdeas([]);
        setHashtagResult('');
        setHooks([]);
      } else if (mode === 'hashtags') {
        const r = await fetch('/api/planner/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ideas',
            prompt,
            platforms: platforms.length ? platforms : ['instagram'],
            tone,
          }),
        });
        const data = await r.json();
        const blob = [
          prompt,
          ...(data.ideas ?? []).flatMap((i: AiContentIdea) => Object.values(i.captions)),
        ].join(' ');
        setHashtagResult(extractHashtags(blob));
        setIdeas([]);
        setCaptionResult('');
        setHooks([]);
      } else if (mode === 'hooks') {
        setHooks(buildHooks(prompt, tone));
        setIdeas([]);
        setCaptionResult('');
        setHashtagResult('');
      }
    } finally {
      setLoading(false);
    }
  };

  const activeMode = modes.find((m) => m.key === mode)!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-5">
      {/* Mode sidebar */}
      <aside className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-3 sm:p-4 h-fit lg:sticky lg:top-28">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Sparkles size={15} className="text-[var(--nc-coral)]" />
          <h2 className="text-sm font-black text-[#2c3340]">AI Copilot</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
          {modes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`flex items-center gap-2 h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold transition-colors text-left ${
                mode === key
                  ? 'bg-[var(--nc-coral)] text-white'
                  : 'bg-zinc-50 text-zinc-500 hover:text-[#2c3340] hover:bg-zinc-100'
              }`}
            >
              <Icon size={14} /> {label}
              {key === 'saved' && savedIdeas.length > 0 && (
                <span
                  className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    mode === key ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {savedIdeas.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="hidden lg:block text-[11px] text-zinc-400 font-medium mt-3 px-1 leading-relaxed">
          {activeMode.hint}
        </p>
      </aside>

      <div className="space-y-4">
        {mode !== 'saved' && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-4 sm:p-6 space-y-4">
            <div>
              <p className="text-xs font-extrabold text-zinc-500 mb-1 lg:hidden">{activeMode.hint}</p>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
                Vad vill du ha hjälp med?
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="T.ex. 5 tips för att starta e-handel…"
                className="min-h-[110px] rounded-xl border-zinc-200 resize-none text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setPrompt(q)}
                    className="h-9 min-h-[36px] px-2.5 rounded-full text-[11px] font-bold text-zinc-500 bg-zinc-50 border border-zinc-100 hover:border-[var(--nc-coral)] hover:text-[#2c3340]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {(mode === 'ideas' || mode === 'caption' || mode === 'hashtags') && (
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                  Plattformar
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PLATFORM_OPTIONS.map(({ key, label }) => {
                    const checked = platforms.includes(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2 h-11 min-h-[44px] px-3 rounded-xl border text-xs font-extrabold cursor-pointer ${
                          checked
                            ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)]'
                            : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePlatform(key)}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
                Ton
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ContentTone)}
                className="w-full sm:max-w-xs h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340]"
              >
                {TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              onClick={() => void run()}
              disabled={!prompt.trim() || loading}
              className="w-full sm:w-auto h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white font-black gap-2 px-6"
            >
              {loading ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={15} />
              )}
              {mode === 'ideas'
                ? t('copilotIdeas', locale)
                : mode === 'caption'
                  ? t('writeCaptionShort', locale)
                  : mode === 'hashtags'
                    ? t('copilotHashtags', locale)
                    : t('copilotHooks', locale)}
            </Button>
          </div>
        )}

        {/* Saved ideas panel */}
        {mode === 'saved' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Saved ideas ({savedIdeas.length})
              </p>
            </div>
            {savedIdeas.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-8 text-center">
                <Bookmark size={22} className="mx-auto mb-2 text-zinc-300" />
                <p className="text-sm font-extrabold text-[#2c3340]">No saved ideas yet</p>
                <p className="text-xs text-zinc-500 font-medium mt-1 max-w-sm mx-auto">
                  Generate idéer, captions or hooks and tap Save to keep them here.
                </p>
              </div>
            ) : (
              savedIdeas.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#2c3340]">{item.title}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-1">
                        {item.source} ·{' '}
                        {new Date(item.savedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSaved(item.id)}
                      className="h-10 min-h-[44px] px-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50"
                      aria-label="Remove saved idea"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed">
                    {item.body}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyText(item.body, item.id)}
                      className="h-10 min-h-[44px] px-3 rounded-xl text-[11px] font-extrabold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 inline-flex items-center gap-1"
                    >
                      {copied === item.id ? <Check size={12} /> : <Copy size={12} />}
                      Copy
                    </button>
                    <Button
                      type="button"
                      onClick={() =>
                        onCreateFromCaption({
                          title: item.title,
                          caption: item.body,
                          hashtags: extractHashtags(item.body),
                          platforms: platforms.length ? platforms : ['instagram', 'tiktok'],
                        })
                      }
                      className="h-10 min-h-[44px] rounded-xl bg-[var(--nc-coral)] text-white font-extrabold gap-1.5 text-[11px] px-3"
                    >
                      <Plus size={12} /> Open in Post Studio
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Results */}
        {mode === 'ideas' && ideas.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
              3 idéer — öppna i Post Studio
            </p>
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-[#2c3340]">{idea.title}</p>
                    <p className="text-xs text-zinc-500 font-medium mt-1">{idea.hook}</p>
                    <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wide mt-2">
                      Mall: {idea.template}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      saveIdea(
                        idea.title,
                        `${idea.hook}\n\n${Object.values(idea.captions).join('\n\n')}`,
                        'ideas'
                      )
                    }
                    className="h-10 min-h-[44px] px-2.5 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:bg-zinc-50 inline-flex items-center gap-1 flex-shrink-0"
                  >
                    <Bookmark size={12} /> Save
                  </button>
                </div>
                <div className="space-y-2">
                  {(Object.entries(idea.captions) as [SocialPlatform, string][]).map(
                    ([platform, caption]) => (
                      <div
                        key={platform}
                        className="rounded-xl bg-zinc-50 border border-zinc-100 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <PlatformBadge platform={platform} />
                          <button
                            type="button"
                            onClick={() => void copyText(caption, `${idea.id}-${platform}`)}
                            className="h-10 min-h-[40px] px-2 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:bg-white inline-flex items-center gap-1"
                          >
                            {copied === `${idea.id}-${platform}` ? (
                              <Check size={12} />
                            ) : (
                              <Copy size={12} />
                            )}
                            Kopiera
                          </button>
                        </div>
                        <p className="text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed">
                          {caption}
                        </p>
                        <button
                          type="button"
                          onClick={() => onUseIdea(idea, platform)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--nc-coral)] h-10 min-h-[44px]"
                        >
                          <Plus size={12} /> Skapa inlägg med denna caption
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === 'caption' && captionResult && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#2c3340]">Föreslagen caption</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => saveIdea(prompt.slice(0, 60) || 'Caption', captionResult, 'caption')}
                  className="h-10 min-h-[44px] px-2 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:bg-zinc-50 inline-flex items-center gap-1"
                >
                  <Bookmark size={12} /> Save
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(captionResult, 'caption')}
                  className="h-10 min-h-[44px] px-2 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:bg-zinc-50 inline-flex items-center gap-1"
                >
                  {copied === 'caption' ? <Check size={12} /> : <Copy size={12} />}
                  Kopiera
                </button>
              </div>
            </div>
            <Textarea
              value={captionResult}
              onChange={(e) => setCaptionResult(e.target.value)}
              className="min-h-[160px] rounded-xl border-zinc-200 resize-none text-sm"
            />
            <Button
              type="button"
              onClick={() =>
                onCreateFromCaption({
                  title: prompt.slice(0, 60) || 'AI Caption',
                  caption: captionResult,
                  hashtags: extractHashtags(captionResult),
                  platforms,
                })
              }
              className="h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] text-white font-extrabold gap-2"
            >
              <Plus size={14} /> Öppna i Post Studio
            </Button>
          </div>
        )}

        {mode === 'hashtags' && hashtagResult && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#2c3340]">Hashtag-förslag</p>
              <button
                type="button"
                onClick={() => void copyText(hashtagResult, 'tags')}
                className="h-10 min-h-[44px] px-2 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:bg-zinc-50 inline-flex items-center gap-1"
              >
                {copied === 'tags' ? <Check size={12} /> : <Copy size={12} />}
                Kopiera
              </button>
            </div>
            <p className="text-sm font-bold text-[var(--nc-coral)] leading-relaxed break-words">
              {hashtagResult}
            </p>
            <Button
              type="button"
              onClick={() =>
                onCreateFromCaption({
                  title: prompt.slice(0, 60) || 'Hashtag-post',
                  caption: prompt,
                  hashtags: hashtagResult,
                  platforms: platforms.length ? platforms : ['instagram'],
                })
              }
              className="h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] text-white font-extrabold gap-2"
            >
              <Plus size={14} /> Använd i nytt inlägg
            </Button>
          </div>
        )}

        {mode === 'hooks' && hooks.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
              Hooks
            </p>
            {hooks.map((hook, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3"
              >
                <span className="text-xs font-black text-zinc-300 mt-0.5">{i + 1}</span>
                <p className="flex-1 text-sm font-bold text-[#2c3340]">{hook}</p>
                <button
                  type="button"
                  onClick={() => saveIdea(hook.slice(0, 60), hook, 'hooks')}
                  className="h-10 min-h-[44px] px-2 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:bg-zinc-50 inline-flex items-center gap-1 flex-shrink-0"
                  title="Save idea"
                >
                  <Bookmark size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(hook, `hook-${i}`)}
                  className="h-10 min-h-[44px] px-2 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:bg-zinc-50 inline-flex items-center gap-1 flex-shrink-0"
                >
                  {copied === `hook-${i}` ? <Check size={12} /> : <Copy size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onCreateFromCaption({
                      title: hook.slice(0, 60),
                      caption: hook,
                      hashtags: '',
                      platforms: platforms.length ? platforms : ['instagram', 'tiktok'],
                    })
                  }
                  className="h-10 min-h-[44px] px-2 rounded-lg text-[11px] font-extrabold text-[var(--nc-coral)] hover:bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)] flex-shrink-0"
                >
                  Använd
                </button>
              </div>
            ))}
          </div>
        )}

        {justSaved && (
          <p className="text-xs font-bold text-emerald-600 px-1">Saved to Saved ideas ✓</p>
        )}
      </div>
    </div>
  );
}
