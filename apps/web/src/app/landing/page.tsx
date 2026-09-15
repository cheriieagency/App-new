import { redirect } from 'next/navigation';

/** Legacy preview URL — canonical marketing home is now `/`. */
export default function LandingPreviewPage() {
  redirect('/');
}
