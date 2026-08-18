/**
 * Mock TikTok inbox threads for UI testing when Business API secret is unset.
 */

import type { TikTokInboxThread } from '@/lib/tiktok/inbox-persist';

const MOCK_CONV_A = '00000000-0000-4000-8000-0000000000a1';
const MOCK_CONV_B = '00000000-0000-4000-8000-0000000000b2';
const MOCK_CONV_C = '00000000-0000-4000-8000-0000000000c3';

/** Deterministic sample DMs + comment-style thread for Social Inbox. */
export function getMockTikTokInboxThreads(): TikTokInboxThread[] {
  return [
    {
      id: `tt:dm:${MOCK_CONV_A}`,
      platform: 'tiktok',
      channel: 'dm',
      name: 'nova_creates',
      handle: '@nova_creates',
      preview: 'Love your latest video! Do you have a link?',
      time: '12m',
      unread: true,
      recipient_id: 'mock_open_nova',
      conversation_id: MOCK_CONV_A,
      avatar_url: null,
      messages: [
        {
          id: 'mock-msg-a1',
          from: 'them',
          text: 'Hej! Saw your reel about Nordic creators 🔥',
          time: '18m',
        },
        {
          id: 'mock-msg-a2',
          from: 'them',
          text: 'Love your latest video! Do you have a link?',
          time: '12m',
        },
      ],
    },
    {
      id: `tt:dm:${MOCK_CONV_B}`,
      platform: 'tiktok',
      channel: 'dm',
      name: 'stockholm.studio',
      handle: '@stockholm.studio',
      preview: 'Can we collab on a spring drop?',
      time: '2h',
      unread: false,
      recipient_id: 'mock_open_stockholm',
      conversation_id: MOCK_CONV_B,
      avatar_url: null,
      messages: [
        {
          id: 'mock-msg-b1',
          from: 'them',
          text: 'Hey team — big fan of clikd:',
          time: '3h',
        },
        {
          id: 'mock-msg-b2',
          from: 'you',
          text: 'Thanks! Always open to collabs ✨',
          time: '2h',
        },
        {
          id: 'mock-msg-b3',
          from: 'them',
          text: 'Can we collab on a spring drop?',
          time: '2h',
        },
      ],
    },
    {
      id: `tt:dm:${MOCK_CONV_C}`,
      platform: 'tiktok',
      channel: 'dm',
      name: 'comment_fan_42',
      handle: '@comment_fan_42',
      preview: '[Comment] Where can I buy this?',
      time: '1d',
      unread: true,
      recipient_id: 'mock_open_comment',
      conversation_id: MOCK_CONV_C,
      avatar_url: null,
      messages: [
        {
          id: 'mock-msg-c1',
          from: 'them',
          text: '[Comment on your video] Where can I buy this?',
          time: '1d',
        },
      ],
    },
  ];
}

export function isMockTikTokThreadId(threadId: string): boolean {
  return (
    threadId.includes(MOCK_CONV_A) ||
    threadId.includes(MOCK_CONV_B) ||
    threadId.includes(MOCK_CONV_C) ||
    threadId.startsWith('tt:dm:00000000-0000-4000-8000-')
  );
}
