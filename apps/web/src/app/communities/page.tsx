import { redirect } from 'next/navigation';

/** Index for /communities — send members to the community dashboard. */
export default function CommunitiesIndexPage() {
  redirect('/dashboard');
}
