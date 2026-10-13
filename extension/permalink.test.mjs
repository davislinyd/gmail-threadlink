import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseGmailPermalink,
  permalinkForShortcut,
  permalinkForSubject,
  permalinkForThread,
  threadIdFromOpenSubject,
} from './permalink.mjs';

const HEX = '18c5e8a1b2c3d4e5';
const TOKEN = 'FMfcgzQfBctTestToken12';

test('builds an #all permalink from an inbox thread', () => {
  const result = parseGmailPermalink(`https://mail.google.com/mail/u/0/#inbox/${TOKEN}`);
  assert.deepEqual(result, {
    ok: true,
    permalink: `https://mail.google.com/mail/u/0/#all/${TOKEN}`,
  });
});

test('keeps a hex thread id opened from #all', () => {
  const result = parseGmailPermalink(`https://mail.google.com/mail/u/0/#all/${HEX}`);
  assert.equal(result.permalink, `https://mail.google.com/mail/u/0/#all/${HEX}`);
});

test('reads the thread id after a label and a search', () => {
  assert.equal(
    parseGmailPermalink(`https://mail.google.com/mail/u/0/#label/Work%2FProj/${TOKEN}`).permalink,
    `https://mail.google.com/mail/u/0/#all/${TOKEN}`,
  );
  assert.equal(
    parseGmailPermalink(`https://mail.google.com/mail/u/0/#search/from%3Aada/${TOKEN}`).permalink,
    `https://mail.google.com/mail/u/0/#all/${TOKEN}`,
  );
  assert.equal(
    parseGmailPermalink(`https://mail.google.com/mail/u/0/#category/social/${HEX}`).permalink,
    `https://mail.google.com/mail/u/0/#all/${HEX}`,
  );
});

test('accepts a 15-character hex id', () => {
  const id = '18c5e8a1b2c3d4e';
  const result = parseGmailPermalink(`https://mail.google.com/mail/u/0/#sent/${id}`);
  assert.equal(result.permalink, `https://mail.google.com/mail/u/0/#all/${id}`);
});

test('prefers the th query parameter used by basic HTML and print view', () => {
  const result = parseGmailPermalink(
    `https://mail.google.com/mail/u/2/h/?ui=html&th=${HEX}&v=c#inbox/${TOKEN}`,
  );
  assert.equal(result.permalink, `https://mail.google.com/mail/u/2/#all/${HEX}`);
});

test('converts a popout thread-f id to the hex #all permalink', () => {
  const result = parseGmailPermalink(
    'https://mail.google.com/mail/u/0/popout?ver=124x8uubqf33l&cat=2%2FRegional%20Report&qid=DACFBF2E-E575-409D-94B3-7ADED5448B80&search=cat&th=%23thread-f%3A1878572531905139709&cvid=1',
  );
  assert.deepEqual(result, {
    ok: true,
    permalink: 'https://mail.google.com/mail/u/0/#all/1a1207c3c10313fd',
  });
});

test('converts a popout msg-f id the same way', () => {
  const result = parseGmailPermalink(
    'https://mail.google.com/mail/u/1/popout?th=%23msg-f%3A1878572531905139709',
  );
  assert.equal(result.permalink, 'https://mail.google.com/mail/u/1/#all/1a1207c3c10313fd');
});

test('uses the hash when th is not a thread id', () => {
  const result = parseGmailPermalink(`https://mail.google.com/mail/u/0/?th=nope#inbox/${TOKEN}`);
  assert.equal(result.permalink, `https://mail.google.com/mail/u/0/#all/${TOKEN}`);
});

test('preserves the account segment', () => {
  assert.equal(
    parseGmailPermalink(`https://mail.google.com/mail/u/1/#inbox/${TOKEN}`).permalink,
    `https://mail.google.com/mail/u/1/#all/${TOKEN}`,
  );
  assert.equal(
    parseGmailPermalink(`https://mail.google.com/mail/u/ada@example.com/#inbox/${HEX}`).permalink,
    `https://mail.google.com/mail/u/ada@example.com/#all/${HEX}`,
  );
});

test('uses account 0 when the URL has no /u/ segment', () => {
  const result = parseGmailPermalink(`https://mail.google.com/mail/#inbox/${TOKEN}`);
  assert.equal(result.permalink, `https://mail.google.com/mail/u/0/#all/${TOKEN}`);
});

test('rejects list, settings, and short tokens', () => {
  for (const url of [
    'https://mail.google.com/mail/u/0/#inbox',
    'https://mail.google.com/mail/u/0/#label/Work',
    'https://mail.google.com/mail/u/0/#settings/general',
    'https://mail.google.com/mail/u/0/#inbox/p2',
    'https://mail.google.com/mail/u/0/#inbox/FMfcgshort',
    'https://mail.google.com/mail/u/0/popout?th=%23thread-f%3A123',
  ]) {
    assert.deepEqual(parseGmailPermalink(url), { ok: false, reason: 'no-thread' });
  }
});

test('rejects a non-Gmail page and an invalid URL', () => {
  assert.deepEqual(parseGmailPermalink('https://example.com/mail/u/0/#inbox/' + TOKEN), {
    ok: false,
    reason: 'not-gmail',
  });
  assert.deepEqual(parseGmailPermalink('not a url'), { ok: false, reason: 'invalid-url' });
});

test('uses the visible subject id when split view leaves the URL on #inbox', () => {
  const threadId = threadIdFromOpenSubject([
    { legacyThreadId: HEX, permId: 'undefined', visible: false },
    { legacyThreadId: '1a1207c3c10313fd', permId: 'undefined', visible: true },
  ]);
  assert.equal(threadId, '1a1207c3c10313fd');
  assert.equal(
    permalinkForThread('https://mail.google.com/mail/u/0/#inbox', threadId),
    'https://mail.google.com/mail/u/0/#all/1a1207c3c10313fd',
  );
});

test('ignores a missing or non-visible subject', () => {
  assert.equal(threadIdFromOpenSubject(null), null);
  assert.equal(threadIdFromOpenSubject([{ legacyThreadId: HEX, visible: false }]), null);
  assert.equal(threadIdFromOpenSubject([{ permId: 'undefined', visible: true }]), null);
  assert.equal(permalinkForThread('https://mail.google.com/mail/u/0/#inbox', 'not-a-thread'), null);
});

test('subject button prefers that subject id over a different URL thread', () => {
  assert.equal(
    permalinkForSubject(
      `https://mail.google.com/mail/u/0/#inbox/${TOKEN}`,
      '1a1207c3c10313fd',
      'undefined',
    ),
    'https://mail.google.com/mail/u/0/#all/1a1207c3c10313fd',
  );
});

test('subject button uses the page URL when the subject has no thread id', () => {
  assert.equal(
    permalinkForSubject(`https://mail.google.com/mail/u/1/#inbox/${TOKEN}`, null, 'undefined'),
    `https://mail.google.com/mail/u/1/#all/${TOKEN}`,
  );
  assert.equal(permalinkForSubject('https://mail.google.com/mail/u/0/#inbox', '', ''), null);
});

test('shortcut keeps the URL thread when a different subject is visible', () => {
  const result = permalinkForShortcut(`https://mail.google.com/mail/u/0/#inbox/${TOKEN}`, [
    { legacyThreadId: HEX, visible: true },
  ]);
  assert.deepEqual(result, {
    ok: true,
    permalink: `https://mail.google.com/mail/u/0/#all/${TOKEN}`,
  });
});

test('shortcut uses the visible subject when the URL has no thread', () => {
  assert.deepEqual(
    permalinkForShortcut('https://mail.google.com/mail/u/0/#inbox', [
      { legacyThreadId: '1a1207c3c10313fd', visible: true },
    ]),
    { ok: true, permalink: 'https://mail.google.com/mail/u/0/#all/1a1207c3c10313fd' },
  );
  assert.deepEqual(permalinkForShortcut('https://mail.google.com/mail/u/0/#inbox', []), {
    ok: false,
    reason: 'no-thread',
  });
  assert.deepEqual(permalinkForShortcut('https://example.com/', []), {
    ok: false,
    reason: 'not-gmail',
  });
});

test('falls back to account 0 when the account segment is unsafe', () => {
  const result = parseGmailPermalink(`https://mail.google.com/mail/u/a%20b/#inbox/${HEX}`);
  assert.equal(result.permalink, `https://mail.google.com/mail/u/0/#all/${HEX}`);
});
