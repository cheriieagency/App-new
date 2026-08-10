/**
 * Automated post-purchase email that directs buyers into a community.
 */

export type CommunityAccessEmailInput = {
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  communityId: number;
  communityName: string;
  /** Absolute origin, e.g. https://clikd.app — falls back to relative path. */
  origin?: string;
};

export type CommunityAccessEmailContent = {
  subject: string;
  body: string;
  communityUrl: string;
  firstName: string;
};

/** Build the public community URL buyers receive after purchase. */
export function buildCommunityAccessUrl(
  communityId: number,
  origin?: string
): string {
  const path = `/communities/${communityId}`;
  if (origin?.trim()) {
    return `${origin.replace(/\/$/, '')}${path}`;
  }
  return path;
}

/** Compose subject + body for the automated community access email. */
export function buildCommunityAccessEmail(
  input: CommunityAccessEmailInput
): CommunityAccessEmailContent {
  const firstName =
    input.buyerName.trim().split(/\s+/)[0] ||
    input.buyerEmail.split('@')[0] ||
    'there';
  const communityUrl = buildCommunityAccessUrl(input.communityId, input.origin);
  const subject = `You're in — access ${input.communityName}`;
  const body = [
    `Hi {first_name},`,
    ``,
    `Thanks for purchasing ${input.productTitle}.`,
    ``,
    `Your purchase unlocks access to ${input.communityName}.`,
    `Open your community here:`,
    communityUrl,
    ``,
    `See you inside,`,
    `The ${input.communityName} team`,
  ].join('\n');

  return { subject, body, communityUrl, firstName };
}
