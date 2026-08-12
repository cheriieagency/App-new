'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  Loader2,
  Megaphone,
  Sparkles,
  Users,
  Briefcase,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { formatAuthError } from '@/lib/auth-error';
import { persistPlatformRole } from '@/lib/use-platform-role';
import { ClikdMark } from '@/components/brand/ClikdLogo';

const ROLES: {
  id: string;
  label: string;
  hint: string;
  icon: typeof Sparkles;
}[] = [
  { id: 'creator', label: 'Creator', hint: 'Content & audience growth', icon: Sparkles },
  { id: 'educator', label: 'Educator', hint: 'Courses & classroom', icon: GraduationCap },
  { id: 'coach', label: 'Coach', hint: 'Community & 1:1 offers', icon: Users },
  { id: 'agency', label: 'Agency', hint: 'Multi-brand clients', icon: Briefcase },
  { id: 'brand', label: 'Brand', hint: 'Owned storefront & CRM', icon: Building2 },
  { id: 'other', label: 'Other', hint: 'Something else', icon: Megaphone },
];

const USE_CASES: { id: string; label: string }[] = [
  { id: 'bio_storefront', label: 'Bio link & digital store' },
  { id: 'community', label: 'Paid community' },
  { id: 'courses', label: 'Courses & video hosting' },
  { id: 'social_planner', label: 'Social media planner' },
  { id: 'email_crm', label: 'Email CRM & broadcasts' },
  { id: 'events_live', label: 'Events & live streams' },
  { id: 'digital_products', label: 'Digital products & downloads' },
];

const REFERRALS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Google search',
  'Friend / colleague',
  'Podcast',
  'Event / meetup',
  'Other',
] as const;

const TEAM_SIZES = [
  { id: 'solo', label: 'Just me' },
  { id: '2-5', label: '2–5' },
  { id: '6-15', label: '6–15' },
  { id: '16+', label: '16+' },
] as const;

type Step = 0 | 1 | 2 | 3;

/** 3-step onboarding questionnaire (+ optional account gate when signed out). */
export default function OnboardingForm() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [roleCategory, setRoleCategory] = useState('creator');
  const [useCases, setUseCases] = useState<string[]>(['bio_storefront', 'community']);
  const [brandName, setBrandName] = useState('');
  const [brandWebsite, setBrandWebsite] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [teamSize, setTeamSize] = useState('solo');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Unauthenticated users start on account creation (step 0).
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setStep(0);
      return;
    }
    setStep((s) => (s === 0 ? 1 : s));
    if (session.user.name && !fullName) {
      setFullName(session.user.name);
    }
  }, [isPending, session?.user, fullName]);

  const progress = useMemo(() => {
    if (step === 0) return 0;
    return (step / 3) * 100;
  }, [step]);

  const toggleUseCase = (id: string) => {
    setUseCases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: fullName.trim() || email.split('@')[0] || 'Creator',
      });
      if (signUpError) {
        setError(formatAuthError(signUpError, 'Could not create account'));
        setLoading(false);
        return;
      }
      try {
        const { ensureDefaultWorkspace } = await import(
          '@/lib/mock-workspace-profiles'
        );
        ensureDefaultWorkspace();
      } catch {
        /* ignore */
      }
      await persistPlatformRole('creator');
      setStep(1);
    } catch (err) {
      setError(formatAuthError(err, 'Could not create account'));
    } finally {
      setLoading(false);
    }
  };

  const submitOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName.trim(),
          role_category: roleCategory,
          primary_use_cases: useCases,
          referral_source: referralSource,
          brand_name: brandName.trim(),
          brand_website: brandWebsite.trim(),
          team_size: teamSize,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not save onboarding');
        setLoading(false);
        return;
      }
      await persistPlatformRole('creator');
      router.replace(typeof data.redirect === 'string' ? data.redirect : '/admin');
    } catch (err) {
      setError(formatAuthError(err, 'Could not save onboarding'));
      setLoading(false);
    }
  };

  const nextFromStep1 = () => {
    if (fullName.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }
    if (!roleCategory) {
      setError('Pick the role that fits you best');
      return;
    }
    setError(null);
    setStep(2);
  };

  const nextFromStep2 = () => {
    if (useCases.length === 0) {
      setError('Select at least one use case');
      return;
    }
    setError(null);
    setStep(3);
  };

  if (isPending) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <ClikdMark size={36} />
          <span className="font-clikd-wordmark font-extrabold text-xl text-slate-900 tracking-tight">
            clikd<span className="text-[#F472B6]">:</span>
          </span>
        </div>
        <h1 className="font-outfit font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          {step === 0 ? 'Create your account' : 'Welcome — let’s set up your studio'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          {step === 0
            ? 'Then a quick 3-step questionnaire so we can tailor clikd: for you.'
            : 'Takes about a minute. You can change this later in Settings.'}
        </p>
      </div>

      {/* Progress */}
      {step > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F472B6] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(['You', 'Goals', 'Brand'] as const).map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const active = step === n;
              const done = step > n;
              return (
                <div
                  key={label}
                  className={`rounded-xl px-2 py-2 text-center text-[11px] font-bold ${
                    active
                      ? 'bg-[#F472B6]/10 text-[#F472B6]'
                      : done
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  {done ? '✓ ' : ''}
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Step 0 — account */}
        {step === 0 && (
          <form onSubmit={createAccount} className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                Full name
              </span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F472B6]/30"
                placeholder="Ebba Brobeck"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                Email
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F472B6]/30"
                placeholder="you@email.com"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                Password
              </span>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F472B6]/30"
                placeholder="At least 8 characters"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#F472B6] hover:bg-[#F472B6]/90 text-white font-bold text-sm disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Continue
              <ArrowRight size={16} />
            </button>
            <p className="text-center text-xs text-slate-500 font-medium">
              Already have an account?{' '}
              <Link
                href="/account/signin?callbackUrl=/onboarding"
                className="text-[#F472B6] font-bold hover:underline"
              >
                Log in
              </Link>
            </p>
          </form>
        )}

        {/* Step 1 — name + role */}
        {step === 1 && (
          <div className="space-y-5">
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                Full name
              </span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F472B6]/30"
                placeholder="Your name"
              />
            </label>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400 mb-2">
                What best describes you?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROLES.map(({ id, label, hint, icon: Icon }) => {
                  const selected = roleCategory === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRoleCategory(id)}
                      className={`text-left rounded-2xl border p-3.5 min-h-[72px] transition-all ${
                        selected
                          ? 'border-[#F472B6] bg-[#F472B6]/5 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            selected
                              ? 'bg-[#F472B6] text-white'
                              : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900">{label}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{hint}</p>
                        </div>
                        {selected && (
                          <Check size={16} className="text-[#F472B6] ml-auto shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={nextFromStep1}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#F472B6] hover:bg-[#F472B6]/90 text-white font-bold text-sm"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2 — use cases */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-extrabold text-slate-900 mb-1">
                What do you want to use clikd: for?
              </p>
              <p className="text-xs text-slate-500 font-medium mb-3">
                Select all that apply
              </p>
              <div className="space-y-2">
                {USE_CASES.map(({ id, label }) => {
                  const selected = useCases.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleUseCase(id)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 min-h-[48px] text-left transition-all ${
                        selected
                          ? 'border-[#F472B6] bg-[#F472B6]/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          selected
                            ? 'bg-[#F472B6] border-[#F472B6] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selected && <Check size={12} />}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                type="button"
                onClick={nextFromStep2}
                className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#F472B6] hover:bg-[#F472B6]/90 text-white font-bold text-sm"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — brand + referral */}
        {step === 3 && (
          <div className="space-y-5">
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                Brand / studio name
              </span>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F472B6]/30"
                placeholder="e.g. Ebba Creator Lab"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                Website (optional)
              </span>
              <input
                value={brandWebsite}
                onChange={(e) => setBrandWebsite(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F472B6]/30"
                placeholder="https://"
              />
            </label>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400 mb-2">
                Team size
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TEAM_SIZES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTeamSize(id)}
                    className={`min-h-[44px] rounded-xl border text-xs font-bold transition-all ${
                      teamSize === id
                        ? 'border-[#F472B6] bg-[#F472B6]/5 text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400 mb-2">
                How did you hear about us?
              </p>
              <div className="flex flex-wrap gap-2">
                {REFERRALS.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setReferralSource(src)}
                    className={`min-h-[40px] px-3 rounded-full border text-xs font-bold transition-all ${
                      referralSource === src
                        ? 'border-[#F472B6] bg-[#F472B6] text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                type="button"
                disabled={loading || !referralSource}
                onClick={() => void submitOnboarding()}
                className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#0F172A] hover:bg-[#1a1848] text-white font-bold text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Finish & open studio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
