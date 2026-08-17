'use client';

/**
 * TikTok DM threads for Social Inbox (workspace-scoped).
 */

import { useQuery } from '@tanstack/react-query';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';

export type TikTokInboxThreadDto = {
  id: string;
  platform: 'tiktok';
  channel: 'dm';
  name: string;
  handle: string;
  preview: string;
  time: string;
  unread: boolean;
  recipient_id: string;
  conversation_id: string;
  avatar_url: string | null;
  messages: Array<{
    id: string;
    from: 'them' | 'you';
    text: string;
    time: string;
    media_url?: string | null;
  }>;
};

export function useTikTokInbox(enabled: boolean) {
  const workspace = useWorkspaceOptional();
  const workspaceId = workspace?.activeWorkspaceId || '';

  return useQuery({
    queryKey: ['tiktok-inbox', workspaceId],
    enabled: enabled && Boolean(workspaceId),
    queryFn: async () => {
      const r = await fetch(
        `/api/inbox/tiktok?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          credentials: 'include',
          headers: { 'x-workspace-id': workspaceId },
        }
      );
      const json = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        threads?: TikTokInboxThreadDto[];
        message?: string;
        error?: string;
      };
      if (!r.ok) {
        throw new Error(json.message || json.error || 'Failed to load TikTok inbox');
      }
      return { threads: json.threads ?? [] };
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}
