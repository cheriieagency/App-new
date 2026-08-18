/**
 * LinkedIn UGC Posts API — text, image, and video shares.
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/ugc-post-api
 */

export type LinkedInMediaKind = 'text' | 'image' | 'video';

export type PublishLinkedInPostInput = {
  accessToken: string;
  /** OpenID `sub` or full urn:li:person:… */
  personId: string;
  text: string;
  mediaUrl?: string;
  kind?: LinkedInMediaKind;
};

function personUrn(personId: string): string {
  const trimmed = personId.trim();
  if (trimmed.startsWith('urn:li:person:')) return trimmed;
  return `urn:li:person:${trimmed}`;
}

type RegisterUploadResponse = {
  value?: {
    uploadMechanism?: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'?: {
        uploadUrl?: string;
        headers?: Record<string, string>;
      };
    };
    asset?: string;
  };
  message?: string;
};

async function registerLinkedInUpload(
  accessToken: string,
  ownerUrn: string,
  recipe: string
): Promise<{ uploadUrl: string; asset: string; headers: Record<string, string> }> {
  const res = await fetch(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: [recipe],
          owner: ownerUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      }),
    }
  );

  const data = (await res.json()) as RegisterUploadResponse;
  const mechanism =
    data.value?.uploadMechanism?.[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ];
  const uploadUrl = mechanism?.uploadUrl;
  const asset = data.value?.asset;
  if (!res.ok || !uploadUrl || !asset) {
    throw new Error(data.message || `LinkedIn register upload failed (${res.status})`);
  }
  return {
    uploadUrl,
    asset,
    headers: mechanism?.headers ?? {},
  };
}

async function uploadLinkedInBinary(
  uploadUrl: string,
  bytes: ArrayBuffer,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/octet-stream',
    },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      text || `LinkedIn media upload failed (${res.status})`
    );
  }
}

async function fetchMediaBytes(mediaUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch media for LinkedIn (${res.status})`);
  }
  return res.arrayBuffer();
}

/** Publish a UGC post to the member's network. */
export async function publishLinkedInPost(
  input: PublishLinkedInPostInput
): Promise<{ id: string }> {
  const accessToken = input.accessToken.trim();
  const ownerUrn = personUrn(input.personId);
  const text = input.text.trim();
  const kind =
    input.kind ||
    (input.mediaUrl
      ? /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(input.mediaUrl)
        ? 'video'
        : 'image'
      : 'text');

  let shareMediaCategory: 'NONE' | 'IMAGE' | 'VIDEO' = 'NONE';
  let media: Array<{ status: string; media: string; title?: { text: string } }> =
    [];

  if (kind !== 'text' && input.mediaUrl?.trim()) {
    const recipe =
      kind === 'video'
        ? 'urn:li:digitalmediaRecipe:feedshare-video'
        : 'urn:li:digitalmediaRecipe:feedshare-image';
    const { uploadUrl, asset, headers } = await registerLinkedInUpload(
      accessToken,
      ownerUrn,
      recipe
    );
    const bytes = await fetchMediaBytes(input.mediaUrl.trim());
    await uploadLinkedInBinary(uploadUrl, bytes, headers);
    shareMediaCategory = kind === 'video' ? 'VIDEO' : 'IMAGE';
    media = [{ status: 'READY', media: asset, title: { text: text.slice(0, 200) || 'Post' } }];
  }

  const body: Record<string, unknown> = {
    author: ownerUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: text || ' ' },
        shareMediaCategory,
        ...(media.length ? { media } : {}),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as { id?: string; message?: string };
  if (!res.ok || !data.id) {
    throw new Error(data.message || `LinkedIn publish failed (${res.status})`);
  }
  return { id: data.id };
}
