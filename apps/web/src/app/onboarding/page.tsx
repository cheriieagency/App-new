import type { Metadata } from 'next';
import { Suspense } from 'react';
import OnboardingForm from '@/components/onboarding/OnboardingForm';

export const metadata: Metadata = {
  title: 'Get started — clikd:',
  description: 'Set up your clikd: creator studio in three quick steps.',
};

/** Onboarding questionnaire — account details, profile wizard, then plan checkout. */
export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] text-slate-900">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(244,114,182,0.22), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
              Loading…
            </div>
          }
        >
          <OnboardingForm />
        </Suspense>
      </div>
    </main>
  );
}
