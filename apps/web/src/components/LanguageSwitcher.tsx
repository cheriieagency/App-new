'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { LOCALE_META, useLanguage } from '@/lib/i18n';

/** Compact flag + locale pill — updates every string instantly via LanguageContext. */
export default function LanguageSwitcher({
  className = '',
}: {
  className?: string;
}) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALE_META.find((l) => l.code === language) ?? LOCALE_META[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs font-extrabold text-zinc-600 transition-colors"
        aria-label={t('nav.language')}
        aria-expanded={open}
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span className="uppercase tracking-wide">{current.code}</span>
        <ChevronDown
          size={12}
          className={`opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-zinc-100 rounded-2xl shadow-xl z-50 overflow-hidden">
          {LOCALE_META.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 min-h-11 text-sm font-bold transition-colors hover:bg-zinc-50 ${
                language === l.code ? 'text-[#2c3340] bg-zinc-50' : 'text-zinc-500'
              }`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span className="flex-1 text-left uppercase tracking-wide font-extrabold">
                {l.code}
              </span>
              <span className="text-xs font-semibold text-zinc-400">{l.label}</span>
              {language === l.code && <Check size={13} className="text-[#F472B6]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
