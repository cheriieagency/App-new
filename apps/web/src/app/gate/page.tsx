import { Suspense } from 'react';
import { GateForm } from './GateForm';

/** Full-screen site password gate — shown before any other page. */
export default function GatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] flex items-center justify-center bg-[#FAFAFA]">
          <p className="font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-[#0F172A]">
            clikd<span className="text-[#F472B6]">:</span>
          </p>
        </main>
      }
    >
      <GateForm />
    </Suspense>
  );
}
