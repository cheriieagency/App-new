'use client';

import { useState } from 'react';
import { Loader2, Sparkles, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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

const PLATFORM_OPTIONS: { key: SocialPlatform; label: string }[] = [
  { key: 'instagram', label: 'Instagram Reel / Post' },
  { key: 'facebook', label: 'Facebook Post / Reel' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube Shorts / Video' },
];

export default function AiContentGenerator({
  open,
  onOpenChange,
  onUseIdea,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseIdea: (idea: AiContentIdea, platform: SocialPlatform) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    'instagram',
    'tiktok',
    'linkedin',
  ]);
  const [tone, setTone] = useState<ContentTone>('inspirerande');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<AiContentIdea[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const generate = async () => {
    if (!prompt.trim() || platforms.length === 0 || loading) return;
    setLoading(true);
    setSelectedIdeaId(null);
    try {
      const r = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ideas', prompt, platforms, tone }),
      });
      const data = await r.json();
      setIdeas(data.ideas ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto p-0"
      >
        <div className="p-5 sm:p-6 border-b border-zinc-100">
          <SheetHeader className="text-left space-y-1">
            <SheetTitle className="flex items-center gap-2 text-[#2c3340] font-black">
              <Sparkles size={16} className="text-[var(--nc-coral)]" />
              AI Content Generator
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 font-medium">
              Få 3 unika idéer med anpassade captions per plattform.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
              Prompt
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Vad vill du skapa innehåll om idag?"
              className="min-h-[96px] rounded-xl border-zinc-200 resize-none text-sm"
            />
            <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">
              T.ex. &quot;5 tips för att starta e-handel&quot;
            </p>
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
              Plattformar
            </label>
            <div className="space-y-2">
              {PLATFORM_OPTIONS.map(({ key, label }) => {
                const checked = platforms.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 h-11 min-h-[44px] px-3 rounded-xl border cursor-pointer transition-colors ${
                      checked
                        ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)]'
                        : 'border-zinc-100 bg-zinc-50'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePlatform(key)}
                    />
                    <span className="text-sm font-bold text-[#2c3340]">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
              Ton
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as ContentTone)}
              className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340] focus:outline-none focus:border-[var(--nc-coral)]"
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
            onClick={() => void generate()}
            disabled={!prompt.trim() || platforms.length === 0 || loading}
            className="w-full h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white font-black gap-2"
          >
            {loading ? (
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={15} />
            )}
            Generera Content
          </Button>

          {ideas.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                3 idéer — klicka för att använda
              </p>
              {ideas.map((idea) => {
                const selected = selectedIdeaId === idea.id;
                const firstPlatform =
                  (Object.keys(idea.captions)[0] as SocialPlatform) || 'instagram';
                return (
                  <button
                    key={idea.id}
                    type="button"
                    onClick={() => {
                      setSelectedIdeaId(idea.id);
                      onUseIdea(idea, firstPlatform);
                    }}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      selected
                        ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)]'
                        : 'border-zinc-100 bg-white hover:border-zinc-200'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <p className="text-sm font-black text-[#2c3340] flex-1">
                        {idea.title}
                      </p>
                      {selected && (
                        <Check size={14} className="text-[var(--nc-coral)] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 font-medium mb-2">{idea.hook}</p>
                    <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wide mb-3">
                      Mall: {idea.template}
                    </p>
                    <div className="space-y-2">
                      {(Object.entries(idea.captions) as [SocialPlatform, string][]).map(
                        ([platform, caption]) => (
                          <div
                            key={platform}
                            className="rounded-xl bg-zinc-50 border border-zinc-100 p-3"
                          >
                            <div className="mb-1.5">
                              <PlatformBadge platform={platform} />
                            </div>
                            <p className="text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed">
                              {caption}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIdeaId(idea.id);
                                onUseIdea(idea, platform);
                              }}
                              className="mt-2 text-[11px] font-extrabold text-[var(--nc-coral)] h-10 min-h-[44px] -ml-1 px-1"
                            >
                              Använd {platform}-caption →
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
