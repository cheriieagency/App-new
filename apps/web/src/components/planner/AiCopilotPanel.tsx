'use client';

import { useState, type ElementType } from 'react';
import {
  Check,
  Copy,
  Hash,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Plus,
  Sparkles,
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

type CopilotMode = 'ideas' | 'caption' | 'hashtags' | 'hooks';

const PLATFORM_OPTIONS: { key: SocialPlatform; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
];

const MODES: { key: CopilotMode; label: string; icon: ElementType; hint: string }[] = [
  {
    key: 'ideas',
    label: 'Idéer',
    icon: Lightbulb,
    hint: 'Få 3 unika inläggsidéer med captions per plattform.',
  },
  {
    key: 'caption',
    label: 'Caption',
    icon: MessageSquareText,
    hint: 'Skriv eller polera en caption utifrån din brief.',
  },
  {
    key: 'hashtags',
    label: 'Hashtags',
    icon: Hash,
    hint: 'Föreslå relevanta hashtags för ditt ämne.',
  },
  {
    key: 'hooks',
    label: 'Hooks',
    icon: Wand2,
    hint: 'Scroll-stoppare och öppningsrader för Reels / Shorts.',
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
  // Fallback demo tags from words
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

  const run = async () => {
    if (!prompt.trim() || loading) return;
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
        // Generate ideas then polish the first platform caption into a clean draft.
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
          body: JSON.stringify({ action: 'ideas', prompt, platforms: platforms.length ? platforms : ['instagram'], tone }),
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
      } else {
        setHooks(buildHooks(prompt, tone));
        setIdeas([]);
        setCaptionResult('');
        setHashtagResult('');
      }
    } finally {
      setLoading(false);
    }
  };

  const activeMode = MODES.find((m) => m.key === mode)!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-5">
      {/* Mode sidebar */}
      <aside className="nc-glass rounded-[1.5rem] p-3 sm:p-4 h-fit lg:sticky lg:top-28">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Sparkles size={15} className="text-[var(--nc-coral)]" />
          <h2 className="text-sm font-black text-[#2c3340]">AI Copilot</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
          {MODES.map(({ key, label, icon: Icon }) => (
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
            </button>
          ))}
        </div>
        <p className="hidden lg:block text-[11px] text-zinc-400 font-medium mt-3 px-1 leading-relaxed">
          {activeMode.hint}
        </p>
      </aside>

      <div className="space-y-4">
        <div className="nc-glass rounded-[1.5rem] p-4 sm:p-6 space-y-4">
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
              ? 'Generera idéer'
              : mode === 'caption'
                ? 'Skriv caption'
                : mode === 'hashtags'
                  ? 'Föreslå hashtags'
                  : 'Generera hooks'}
          </Button>
        </div>

        {/* Results */}
        {mode === 'ideas' && ideas.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
              3 idéer — öppna i Post Studio
            </p>
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="nc-glass rounded-[1.5rem] p-4 sm:p-5 space-y-3"
              >
                <div>
                  <p className="text-sm font-black text-[#2c3340]">{idea.title}</p>
                  <p className="text-xs text-zinc-500 font-medium mt-1">{idea.hook}</p>
                  <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wide mt-2">
                    Mall: {idea.template}
                  </p>
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
          <div className="nc-glass rounded-[1.5rem] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#2c3340]">Föreslagen caption</p>
              <button
                type="button"
                onClick={() => void copyText(captionResult, 'caption')}
                className="h-10 min-h-[44px] px-2 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:bg-zinc-50 inline-flex items-center gap-1"
              >
                {copied === 'caption' ? <Check size={12} /> : <Copy size={12} />}
                Kopiera
              </button>
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
          <div className="nc-glass rounded-[1.5rem] p-4 sm:p-5 space-y-3">
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
                className="nc-glass rounded-2xl p-4 flex items-start gap-3"
              >
                <span className="text-xs font-black text-zinc-300 mt-0.5">{i + 1}</span>
                <p className="flex-1 text-sm font-bold text-[#2c3340]">{hook}</p>
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
      </div>
    </div>
  );
}
