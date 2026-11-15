// Links people pass around. Framework-free and unit-tested: a wrong link here breaks the whole loop.
// Secrets (host and participant tokens) go in the #fragment: browsers never send it to the
// server, so it stays out of logs, analytics and link previews (docs/conventions.md, Routes).

/** Group link, the one that can go to the WhatsApp group: people join with their own name. */
export function buildGroupUrl(origin: string, slug: string) {
  return `${origin}/g/${encodeURIComponent(slug)}`;
}

/** Host link: opens the group's management screen on any device. */
export function buildHostUrl(origin: string, slug: string, hostToken: string) {
  return `${origin}/g/${encodeURIComponent(slug)}/manage#${encodeURIComponent(hostToken)}`;
}

/** Personal link: shows one person who they drew. Sent privately, one person at a time. */
export function buildParticipantUrl(origin: string, slug: string, participantToken: string) {
  return `${origin}/g/${encodeURIComponent(slug)}/me#${encodeURIComponent(participantToken)}`;
}

/** Reads a token back from location.hash ("#abc" → "abc"); empty when missing. */
export function readTokenFromHash(hash: string) {
  try {
    return decodeURIComponent(hash.replace(/^#/, '')).trim();
  } catch {
    return '';
  }
}

/** "amigosecreto.gr1618.io/g/sh3v2kw2nc2s": what people see, without the protocol. */
export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, '');
}

/** Opens WhatsApp (app on phones, web elsewhere) with the message ready to send. */
export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Splits a pasted list ("Ana, Beto\nCarla") into clean, distinct names, keeping the order. */
export function parseNames(text: string) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const piece of text.split(/[\n,;]+/)) {
    const name = piece.trim().replace(/\s+/g, ' ').slice(0, 60);
    const key = name.toLocaleLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}
