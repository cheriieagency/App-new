/**
 * Silent Comment-to-DM watcher for the whole admin shell.
 * Keeps keyword → Private Reply running every 20s even outside Automations.
 */

'use client';

import { useCommentToDmAutoPoll } from '@/hooks/useCommentToDmAutoPoll';

export default function CommentToDmAutoPoller() {
  useCommentToDmAutoPoll({ enabled: true });
  return null;
}
