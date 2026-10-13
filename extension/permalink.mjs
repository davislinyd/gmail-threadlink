const HEX_THREAD = /^[0-9a-f]{15,16}$/i;
const WEB_THREAD = /^FMfcg[A-Za-z0-9_-]{10,}$/;
const USER = /^[A-Za-z0-9._@+-]+$/;

/**
 * @param {string} url
 * @returns {{ ok: true, permalink: string } | { ok: false, reason: 'invalid-url' | 'not-gmail' | 'no-thread' }}
 */
export function parseGmailPermalink(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }

  if (parsed.hostname !== 'mail.google.com') {
    return { ok: false, reason: 'not-gmail' };
  }

  const threadId = extractThreadId(parsed);
  if (!threadId) {
    return { ok: false, reason: 'no-thread' };
  }

  return {
    ok: true,
    permalink: `https://mail.google.com/mail/u/${extractUser(parsed)}/#all/${threadId}`,
  };
}

/**
 * Picks the open conversation id from visible subject elements.
 * List rows are not subjects, so they must not be passed in.
 * @param {Array<{ legacyThreadId?: string | null, permId?: string | null, visible?: boolean }> | null | undefined} candidates
 * @returns {string | null}
 */
export function threadIdFromOpenSubject(candidates) {
  if (!Array.isArray(candidates)) {
    return null;
  }
  for (const candidate of candidates) {
    if (!candidate?.visible) {
      continue;
    }
    const legacy = typeof candidate.legacyThreadId === 'string' ? candidate.legacyThreadId.trim() : '';
    const perm = typeof candidate.permId === 'string' ? candidate.permId.trim() : '';
    const threadId = canonicalThreadId(legacy) || canonicalThreadId(perm);
    if (threadId) {
      return threadId;
    }
  }
  return null;
}

/**
 * Builds a permalink for a thread id found outside the page URL.
 * @param {string} pageUrl
 * @param {string} threadId
 * @returns {string | null}
 */
export function permalinkForThread(pageUrl, threadId) {
  let parsed;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'mail.google.com') {
    return null;
  }
  const id = canonicalThreadId(typeof threadId === 'string' ? threadId.trim() : '');
  if (!id) {
    return null;
  }
  return `https://mail.google.com/mail/u/${extractUser(parsed)}/#all/${id}`;
}

/**
 * Permalink for the subject button. The subject id wins over the page URL.
 * @param {string} pageUrl
 * @param {string | null | undefined} legacyThreadId
 * @param {string | null | undefined} permId
 * @returns {string | null}
 */
export function permalinkForSubject(pageUrl, legacyThreadId, permId) {
  const legacy = typeof legacyThreadId === 'string' ? legacyThreadId.trim() : '';
  const perm = typeof permId === 'string' ? permId.trim() : '';
  const threadId = canonicalThreadId(legacy) || canonicalThreadId(perm);
  if (threadId) {
    return permalinkForThread(pageUrl, threadId);
  }
  const fromUrl = parseGmailPermalink(pageUrl);
  return fromUrl.ok ? fromUrl.permalink : null;
}

/**
 * Permalink for the shortcut. A thread id already in the URL wins.
 * @param {string} pageUrl
 * @param {Array<{ legacyThreadId?: string | null, permId?: string | null, visible?: boolean }> | null | undefined} candidates
 * @returns {{ ok: true, permalink: string } | { ok: false, reason: 'invalid-url' | 'not-gmail' | 'no-thread' }}
 */
export function permalinkForShortcut(pageUrl, candidates) {
  const fromUrl = parseGmailPermalink(pageUrl);
  if (fromUrl.ok || fromUrl.reason !== 'no-thread') {
    return fromUrl;
  }
  const threadId = threadIdFromOpenSubject(candidates);
  if (!threadId) {
    return { ok: false, reason: 'no-thread' };
  }
  const permalink = permalinkForThread(pageUrl, threadId);
  if (!permalink) {
    return { ok: false, reason: 'no-thread' };
  }
  return { ok: true, permalink };
}

function extractUser(url) {
  const match = url.pathname.match(/\/mail\/u\/([^/]+)/);
  if (!match || !USER.test(match[1])) {
    return '0';
  }
  return match[1];
}

function extractThreadId(url) {
  const fromQuery = canonicalThreadId(url.searchParams.get('th'));
  if (fromQuery) {
    return fromQuery;
  }

  const hash = url.hash.replace(/^#/, '');
  if (!hash) {
    return null;
  }

  const last = hash.split('/').at(-1);
  if (!last) {
    return null;
  }

  try {
    return canonicalThreadId(decodeURIComponent(last));
  } catch {
    return null;
  }
}

function canonicalThreadId(value) {
  if (!value) {
    return null;
  }
  if (HEX_THREAD.test(value) || WEB_THREAD.test(value)) {
    return value;
  }

  const threadF = value.match(/^#?(?:thread|msg)-f:(\d+)$/);
  if (!threadF) {
    return null;
  }
  const hex = BigInt(threadF[1]).toString(16);
  return HEX_THREAD.test(hex) ? hex : null;
}
