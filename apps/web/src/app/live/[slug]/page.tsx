'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Radio,
  Users,
  Send,
  Share2,
  Check,
  ArrowLeft,
  Video,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';

type LiveSession = {
  slug: string;
  title: string;
  creator_name: string;
  community_name: string | null;
  is_live: boolean;
  viewer_count: number;
  chat: { id: string; name: string; msg: string; created_at: string }[];
  exists?: boolean;
};

export default function PublicLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [chatMsg, setChatMsg] = useState('');
  const [guestName, setGuestName] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);

  const { data: live, isLoading } = useQuery<LiveSession>({
    queryKey: ['public-live', slug],
    queryFn: async () => {
      const r = await fetch(`/api/live/${encodeURIComponent(slug)}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    refetchInterval: 2500,
  });

  useEffect(() => {
    if (!live || joinedRef.current) return;
    joinedRef.current = true;
    void fetch(`/api/live/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join' }),
    }).then(() => queryClient.invalidateQueries({ queryKey: ['public-live', slug] }));
  }, [live?.slug, slug, queryClient]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [live?.chat?.length]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/live/${slug}`
      : `/live/${slug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendChat = async () => {
    const msg = chatMsg.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      await fetch(`/api/live/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          name: session?.user?.name || guestName.trim() || 'Gäst',
          msg,
        }),
      });
      setChatMsg('');
      await queryClient.invalidateQueries({ queryKey: ['public-live', slug] });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f14] text-zinc-400 text-sm">
        Laddar live…
      </div>
    );
  }

  const isLive = Boolean(live?.is_live);

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f14]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-11 min-h-[44px] text-sm font-bold text-zinc-300 hover:text-white"
          >
            <ArrowLeft size={16} /> clikd:
          </Link>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl bg-white/10 text-xs font-extrabold hover:bg-white/15"
          >
            {copied ? <Check size={13} /> : <Share2 size={13} />}
            {copied ? 'Kopierad' : 'Dela länk'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <section>
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950">
            <div className="aspect-video flex items-center justify-center relative">
              {isLive ? (
                <div className="text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                    <Radio
                      size={30}
                      className="text-red-400"
                      style={{ animation: 'livePulse 1s ease-in-out infinite' }}
                    />
                  </div>
                  <p className="text-xl font-black">
                    {live?.title || 'Live Sändning'}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">
                    {live?.creator_name}
                    {live?.community_name ? ` · ${live.community_name}` : ''}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-extrabold px-3 py-1 rounded-full">
                      <span
                        className="w-1.5 h-1.5 bg-white rounded-full"
                        style={{ animation: 'livePulse 1s ease-in-out infinite' }}
                      />
                      LIVE
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/10 text-xs font-bold px-3 py-1 rounded-full">
                      <Users size={11} /> {live?.viewer_count ?? 0} tittare
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center px-6">
                  <Video size={42} className="text-zinc-600 mx-auto mb-3" />
                  <p className="text-lg font-black text-zinc-200">
                    {live?.title || 'Live'}
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Sändningen har inte startat ännu — behåll länken bokmärkt.
                  </p>
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500 font-medium">
            Publik länk — funkar även utanför communityn. Ingen inloggning krävs för att titta.
          </p>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col min-h-[420px] max-h-[70vh]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Radio size={13} className={isLive ? 'text-red-400' : 'text-zinc-500'} />
            <p className="text-sm font-black">Livechatt</p>
            {isLive && (
              <span className="ml-auto text-[10px] font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
                LIVE
              </span>
            )}
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {(live?.chat ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-10">
                {isLive ? 'Säg hej i chatten!' : 'Chatten öppnar när sändningen startar.'}
              </p>
            ) : (
              (live?.chat ?? []).map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-extrabold text-[var(--nc-coral)]">{m.name}</span>
                  <span className="text-zinc-300 ml-1.5">{m.msg}</span>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-white/10 space-y-2">
            {!session?.user && (
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ditt namn"
                className="w-full h-11 min-h-[44px] rounded-xl bg-white/5 border border-white/10 px-3 text-sm focus:outline-none focus:border-[var(--nc-coral)]"
              />
            )}
            <div className="flex gap-2">
              <input
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void sendChat();
                }}
                disabled={!isLive}
                placeholder={isLive ? 'Skriv ett meddelande…' : 'Väntar på live…'}
                className="flex-1 h-11 min-h-[44px] rounded-xl bg-white/5 border border-white/10 px-3 text-sm focus:outline-none focus:border-[var(--nc-coral)] disabled:opacity-40"
              />
              <button
                type="button"
                disabled={!isLive || !chatMsg.trim() || sending}
                onClick={() => void sendChat()}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--nc-coral)] flex items-center justify-center disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
