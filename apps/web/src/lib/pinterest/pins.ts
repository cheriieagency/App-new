/**
 * Pinterest Pins API helpers for Content Planner scheduling / publish.
 */

export type CreatePinterestPinInput = {
  accessToken: string;
  boardId: string;
  title: string;
  description?: string;
  link?: string | null;
  /** Public image URL for the pin media source. */
  imageUrl: string;
  /** Optional ISO timestamp — when supported by the app's Pin create access. */
  createAt?: string | null;
};

export type CreatePinterestPinResult = {
  id: string;
  link?: string | null;
  created_at?: string;
};

/** List boards for the connected account (first page). */
export async function listPinterestBoards(accessToken: string): Promise<
  { id: string; name: string }[]
> {
  const res = await fetch('https://api.pinterest.com/v5/boards?page_size=50', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = (await res.json()) as {
    items?: { id?: string; name?: string }[];
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || `Pinterest boards list failed (${res.status})`);
  }
  return (data.items ?? [])
    .filter((b) => Boolean(b.id))
    .map((b) => ({ id: String(b.id), name: String(b.name ?? 'Board') }));
}

/** Create (or schedule) a Pin on the given board. */
export async function createPinterestPin(
  input: CreatePinterestPinInput
): Promise<CreatePinterestPinResult> {
  const body: Record<string, unknown> = {
    board_id: input.boardId,
    title: input.title.slice(0, 100),
    description: (input.description || '').slice(0, 800),
    media_source: {
      source_type: 'image_url',
      url: input.imageUrl,
    },
  };
  if (input.link?.trim()) body.link = input.link.trim();
  // Pinterest accepts create_at for scheduled Pins when the app has access.
  if (input.createAt?.trim()) body.create_at = input.createAt.trim();

  const res = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as CreatePinterestPinResult & {
    message?: string;
  };

  if (!res.ok || !data.id) {
    throw new Error(data.message || `Pinterest pin create failed (${res.status})`);
  }
  return { id: data.id, link: data.link, created_at: data.created_at };
}
