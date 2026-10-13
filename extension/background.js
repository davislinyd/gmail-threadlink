function isGmailPermalink(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'mail.google.com' && parsed.pathname.startsWith('/mail/');
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'open-permalink' || !sender.tab || !isGmailPermalink(message.url)) {
    return undefined;
  }
  chrome.tabs.create({ url: message.url }).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false }),
  );
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'copy-permalink') {
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.startsWith('https://mail.google.com/')) {
      return;
    }
    await chrome.tabs.sendMessage(tab.id, { type: 'copy-permalink' });
  } catch {
    // The Gmail content script is not available on this tab.
  }
});
