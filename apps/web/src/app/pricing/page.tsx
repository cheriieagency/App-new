import { redirect } from 'next/navigation';

/** Legacy / deep-link path — pricing lives on the landing page. */
export default function PricingPage() {
  redirect('/#pricing');
}
