const PERMALINK_CACHE_SECONDS = 21600;

/**
 * Builds the contextual Gmail add-on card for the currently open message.
 * getPermalink() has to mint the popout URL, so a cached copy skips that round trip.
 * @param {Object} e Gmail add-on event object.
 * @return {Card} The card to display.
 */
function onGmailMessageOpen(e) {
  try {
    if (!e || !e.gmail || !e.gmail.accessToken || !e.gmail.messageId) {
      throw new Error('Missing Gmail message context.');
    }

    const keys = permalinkCacheKeys_(e.gmail);
    const cached = readCachedPermalink_(keys);
    if (cached) {
      return buildPermalinkCard(cached);
    }

    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    const message = GmailApp.getMessageById(e.gmail.messageId);
    if (!message) {
      throw new Error('Gmail message was not found.');
    }

    const permalink = message.getThread().getPermalink();
    writeCachedPermalink_(keys, permalink);
    return buildPermalinkCard(permalink);
  } catch (error) {
    console.error(error);
    return buildErrorCard();
  }
}

/**
 * Thread id is checked first so another message in the same thread can reuse it.
 * @param {{ threadId?: string, messageId?: string }} gmail
 * @return {string[]}
 */
function permalinkCacheKeys_(gmail) {
  const keys = [];
  const threadKey = permalinkCacheKey_('t', gmail.threadId);
  const messageKey = permalinkCacheKey_('m', gmail.messageId);
  if (threadKey) {
    keys.push(threadKey);
  }
  if (messageKey && messageKey !== threadKey) {
    keys.push(messageKey);
  }
  return keys;
}

/**
 * @param {string} prefix
 * @param {string} id
 * @return {string}
 */
function permalinkCacheKey_(prefix, id) {
  if (typeof id !== 'string' || !id) {
    return '';
  }
  const key = 'pl_' + prefix + '_' + id.replace(/[^A-Za-z0-9_-]/g, '_');
  return key.length <= 250 ? key : '';
}

/**
 * @param {string[]} keys
 * @return {string}
 */
function readCachedPermalink_(keys) {
  if (!keys.length) {
    return '';
  }
  try {
    const found = CacheService.getUserCache().getAll(keys);
    for (let i = 0; i < keys.length; i++) {
      const value = found[keys[i]];
      if (isGmailPermalink_(value)) {
        return value;
      }
    }
  } catch (error) {
    console.error(error);
  }
  return '';
}

/**
 * @param {string[]} keys
 * @param {string} permalink
 */
function writeCachedPermalink_(keys, permalink) {
  if (!keys.length || !isGmailPermalink_(permalink)) {
    return;
  }
  try {
    const values = {};
    for (let i = 0; i < keys.length; i++) {
      values[keys[i]] = permalink;
    }
    CacheService.getUserCache().putAll(values, PERMALINK_CACHE_SECONDS);
  } catch (error) {
    console.error(error);
  }
}

/**
 * @param {string} value
 * @return {boolean}
 */
function isGmailPermalink_(value) {
  return typeof value === 'string' && value.startsWith('https://mail.google.com/');
}

/**
 * Builds the permalink card.
 * @param {string} permalink Gmail thread permalink.
 * @return {Card} The card to display.
 */
function buildPermalinkCard(permalink) {
  const openLink = CardService.newOpenLink()
    .setUrl(permalink)
    .setOpenAs(CardService.OpenAs.FULL_SIZE);

  const section = CardService.newCardSection()
    .addWidget(CardService.newTextInput()
      .setFieldName('permalink')
      .setTitle('Permalink')
      .setValue(permalink)
      .setMultiline(true))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Open in Gmail')
        .setOpenLink(openLink)
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Gmail ThreadLink'))
    .addSection(section)
    .build();
}

/**
 * Builds a generic error card without exposing implementation details.
 * @return {Card} Error card.
 */
function buildErrorCard() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Gmail ThreadLink'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('Unable to load this email. Please try again.')))
    .build();
}
