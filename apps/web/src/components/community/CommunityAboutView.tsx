'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Circle,
  Lock,
  Globe2,
  Users,
  Coins,
  Play,
  ShieldCheck,
} from 'lucide-react';
import type { CommunityAbout } from '@/lib/community-about';
import { InstantCheckoutDrawer } from '@/components/community/InstantCheckoutDrawer';
import { authClient } from '@/lib/auth-client';

type CommunityAboutViewProps = {
  community: CommunityAbout;
  backHref?: string;
  backLabel?: string;
};

export function CommunityAboutView({
  community: initialCommunity,
  backHref = '/',
  backLabel = '← Tillbaka till Sök / Dashboard',
}: CommunityAboutViewProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [community, setCommunity] = useState(initialCommunity);
  const [activeThumb, setActiveThumb] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const price =
    community.is_free || community.monthly_price === 0
      ? 0
      : Math.max(0, Number(community.monthly_price ?? community.price ?? 0));
  const isJoined = Boolean(community.is_joined);
  const isFree = price <= 0;

  const thumbLabels = useMemo(
    () => ['Intro', 'Kurs', 'Live', 'Bonus'].slice(0, community.thumbnails.length || 4),
    [community.thumbnails.length]
  );

  return (
    <div className="nc-app nc-app-shell min-h-screen relative z-10 ">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 min-h-11 text-sm font-bold text-zinc-600 hover:text-zinc-900 transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          {backLabel.replace(/^←\s*/, '')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start">
          {/* ── LEFT: main content ── */}
          <div className="space-y-6">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
              {community.name}
            </h1>

            {/* Video / banner */}
            <div
              className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-200 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${community.cover_color ?? '#0f1f1c'}, #0a0a0f)`,
              }}
            >
              {community.cover_image && !playing ? (
                <img
                  src={community.cover_image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
              ) : null}
              {playing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-sm font-bold px-6 text-center">
                  Förhandsvisning — koppla video_url för riktig uppspelning
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center group"
                  aria-label="Spela förhandsvisning"
                >
                  <span className="w-16 h-16 rounded-full bg-white/95 text-zinc-900 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                    <Play size={26} fill="currentColor" className="ml-1" />
                  </span>
                </button>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {thumbLabels.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setActiveThumb(i);
                    setPlaying(false);
                  }}
                  className={`shrink-0 w-24 h-16 rounded-xl border overflow-hidden relative transition-all ${
                    activeThumb === i
                      ? 'border-zinc-900 ring-2 ring-zinc-900/20'
                      : 'border-zinc-200 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${community.cover_color ?? '#0f1f1c'}, #1a1a22)`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/90">
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* Info bar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-700">
                {community.privacy === 'private' ? <Lock size={12} /> : <Globe2 size={12} />}
                {community.privacy === 'private' ? 'Private' : 'Public'}
              </span>
              <span className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-700">
                <Users size={12} />
                {community.member_count.toLocaleString('sv-SE')} members
              </span>
              <span className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-700">
                <Coins size={12} />
                {isFree ? 'Gratis' : `${price.toLocaleString('sv-SE')} SEK/mån`}
              </span>
              <span className="inline-flex items-center gap-2 min-h-9 px-3 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-700">
                <span
                  className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-black text-white"
                  style={{ background: community.cover_color ?? '#0f1f1c' }}
                >
                  {community.creator_image ? (
                    <img
                      src={community.creator_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (community.creator_name?.[0] ?? 'C').toUpperCase()
                  )}
                </span>
                By {community.creator_name || 'Creator'}
              </span>
            </div>

            {/* Description / includes */}
            <div className="nc-glass rounded-[1.5rem] p-6 sm:p-8">
              <h2 className="text-lg font-black text-zinc-900 mb-2">Vad ingår i communityt</h2>
              <p className="text-sm text-zinc-500 font-medium mb-5 leading-relaxed">
                {community.pitch}
              </p>
              <ul className="space-y-3">
                {community.includes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-bold text-zinc-800">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#d8f5ef] text-[#0f766e] flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── RIGHT: sticky buy box ── */}
          <aside className="lg:sticky lg:top-6">
            <div className="nc-glass rounded-[1.5rem] shadow-lg overflow-hidden">
              <div
                className="h-36 relative"
                style={{
                  background: `linear-gradient(135deg, ${community.cover_color ?? '#0f1f1c'}, #0a0a0f)`,
                }}
              >
                {community.cover_image ? (
                  <img
                    src={community.cover_image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  />
                ) : null}
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/80 bg-black/30 backdrop-blur px-2 py-1 rounded-full">
                    #{community.category}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-zinc-900 leading-snug">
                    {community.name}
                  </h2>
                  <p className="text-xs font-bold text-zinc-400 mt-1">
                    clikd.app/c/{community.slug ?? community.id}
                  </p>
                </div>

                <p className="text-sm text-zinc-600 font-medium leading-relaxed line-clamp-3">
                  {community.pitch}
                </p>

                <div className="grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 border border-zinc-100 p-3">
                  <Stat label="Members" value={community.member_count.toLocaleString('sv-SE')} />
                  <Stat
                    label="Online"
                    value={String(community.online_now)}
                    accent
                  />
                  <Stat label="Admins" value={String(community.admin_count)} />
                </div>

                {isJoined ? (
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="w-full min-h-12 rounded-2xl bg-[var(--nc-coral)] hover:opacity-90 text-white text-sm font-black transition-all active:scale-[0.99]"
                  >
                    Öppna community →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!session) {
                        router.push(
                          `/account/signup?callbackUrl=${encodeURIComponent(`/communities/${community.id}`)}`
                        );
                        return;
                      }
                      setCheckoutOpen(true);
                    }}
                    className="w-full min-h-12 rounded-2xl bg-[var(--nc-coral)] hover:opacity-90 text-white text-sm font-black transition-all active:scale-[0.99] shadow-lg shadow-zinc-900/20"
                  >
                    {isFree
                      ? 'Gå med gratis →'
                      : `Gå med för ${price.toLocaleString('sv-SE')} kr/mån`}
                  </button>
                )}

                <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-400 text-center">
                  <ShieldCheck size={12} />
                  Drivs av clikd: • Säker snabbbetalning
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <InstantCheckoutDrawer
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        communityName={community.name}
        communityId={community.id}
        priceSek={price}
        workspaceId={community.workspace_id}
        sellerUserId={community.creator_id}
        onSuccess={() => {
          setCommunity((c) => ({ ...c, is_joined: true }));
          router.refresh();
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-sm font-black text-zinc-900 flex items-center justify-center gap-1">
        {accent && <Circle size={6} className="text-emerald-500 fill-emerald-500" />}
        {value}
      </p>
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
        {label}
      </p>
    </div>
  );
}
