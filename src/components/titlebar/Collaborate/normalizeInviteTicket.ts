// Iroh DocTickets are base32 and carry the whole credential, so both link forms
// the panel hands out are just the ticket dropped into a path slot — no decoding.
const TICKET_PATTERN = /^doc[a-z0-9]{16,}$/iu;

const WEB_HOST = "getpeek.dev";

/**
 * Reduces any of the three invite formats the Collaborate panel produces — a
 * `peek://invite/<ticket>` deep link, a `getpeek.dev/join/<ticket>` URL, or a bare
 * ticket — down to the bare ticket `mp_join_session` expects. Returns null when the
 * input isn't recognisable as any of them.
 */
export function normalizeInviteTicket(raw: string): string | null {
  const trimmed = raw.trim();
  if (TICKET_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // A web link is as likely to be pasted from a browser address bar as copied from
  // Peek, so tolerate the missing scheme rather than rejecting it outright.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/iu.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  const url = parseUrl(candidate);
  if (!url) {
    return null;
  }

  const isDeepLink = url.protocol === "peek:" && url.hostname === "invite";
  const isWebLink = url.hostname.replace(/^www\./u, "") === WEB_HOST;
  if (!isDeepLink && !isWebLink) {
    return null;
  }

  const ticket = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return TICKET_PATTERN.test(ticket) ? ticket : null;
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}
