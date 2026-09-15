'use client';

import { authClient } from '@/lib/auth-client';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { PricingSection } from '@/components/landing/PricingSection';

/** Dedicated pricing route — header chrome + PricingSection only. */
export function PricingPageClient() {
  const { data: session } = authClient.useSession();

  return (
    <div className="editorial-landing nc-landing min-h-screen bg-[#F9F8F6] text-[#2C2621]">
      <LandingHeader
        isLoggedIn={!!session}
        user={
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
              }
            : null
        }
      />
      <PricingSection />
      <LandingFooter />
    </div>
  );
}
