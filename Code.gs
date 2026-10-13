/**
 * Builds the contextual Gmail add-on card for the currently open message.
 * @param {Object} e Gmail add-on event object.
 * @return {Card} The card to display.
 */
function onGmailMessageOpen(e) {
  try {
    if (!e || !e.gmail || !e.gmail.accessToken || !e.gmail.messageId) {
      throw new Error('Missing Gmail message context.');
    }

    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    const message = GmailApp.getMessageById(e.gmail.messageId);
    if (!message) {
      throw new Error('Gmail message was not found.');
    }

    return buildPermalinkCard(message.getThread().getPermalink());
  } catch (error) {
    console.error(error);
    return buildErrorCard();
  }
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
    .setHeader(CardService.newCardHeader().setTitle('Gmail Goggles'))
    .addSection(section)
    .build();
}

/**
 * Builds a generic error card without exposing implementation details.
 * @return {Card} Error card.
 */
function buildErrorCard() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Gmail Goggles'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('Unable to load this email. Please try again.')))
    .build();
}
