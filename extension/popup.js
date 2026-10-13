import { parseGmailPermalink, permalinkForThread, threadIdFromOpenSubject } from './permalink.mjs';

const message = document.querySelector('#message');
const result = document.querySelector('#result');
const field = document.querySelector('#permalink');
const copyButton = document.querySelector('#copy');
const openButton = document.querySelector('#open');

let permalink = '';

function showMessage(text) {
  message.hidden = false;
  message.textContent = text;
}

function showPermalink(url) {
  permalink = url;
  message.hidden = true;
  result.hidden = false;
  field.value = url;
}

copyButton.addEventListener('click', async () => {
  if (!permalink) {
    return;
  }
  try {
    await navigator.clipboard.writeText(permalink);
    copyButton.textContent = '已複製';
    message.hidden = true;
  } catch {
    field.focus();
    field.select();
    showMessage('無法複製，請手動選取連結。');
  }
});

function collectOpenThreadCandidates() {
  function isShown(element) {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    return element.getClientRects().length > 0;
  }

  const subjects = [];
  for (const element of document.querySelectorAll('h2[data-legacy-thread-id], h2[data-thread-perm-id]')) {
    if (!isShown(element)) {
      continue;
    }
    subjects.push({
      legacyThreadId: element.getAttribute('data-legacy-thread-id'),
      permId: element.getAttribute('data-thread-perm-id'),
      visible: true,
    });
    if (subjects.length === 3) {
      break;
    }
  }
  if (subjects.length > 0) {
    return subjects;
  }

  let messageOpen = false;
  for (const element of document.querySelectorAll('[data-message-id]')) {
    if (isShown(element)) {
      messageOpen = true;
      break;
    }
  }
  if (!messageOpen) {
    return [];
  }

  const selected = document.querySelector(
    '[aria-selected="true"][data-legacy-thread-id], [aria-selected="true"] [data-legacy-thread-id]',
  );
  if (!selected) {
    return [];
  }
  const row = selected.matches('[data-legacy-thread-id]')
    ? selected
    : selected.querySelector('[data-legacy-thread-id]');
  if (!row) {
    return [];
  }
  return [{
    legacyThreadId: row.getAttribute('data-legacy-thread-id'),
    permId: row.getAttribute('data-thread-id'),
    visible: true,
  }];
}

async function permalinkFromOpenMessage(tab) {
  if (typeof tab.id !== 'number') {
    return null;
  }
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectOpenThreadCandidates,
    });
    const threadId = threadIdFromOpenSubject(injection?.result);
    return threadId ? permalinkForThread(tab.url, threadId) : null;
  } catch {
    return null;
  }
}

openButton.addEventListener('click', async () => {
  if (!permalink) {
    return;
  }
  try {
    await chrome.tabs.create({ url: permalink });
  } catch {
    showMessage('無法開啟連結。');
  }
});

try {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showMessage('無法讀取分頁網址，請重新開啟這個視窗。');
  } else {
    const parsed = parseGmailPermalink(tab.url);
    if (parsed.ok) {
      showPermalink(parsed.permalink);
    } else if (parsed.reason === 'not-gmail') {
      showMessage('請先打開 Gmail。');
    } else if (parsed.reason === 'no-thread') {
      const fromPage = await permalinkFromOpenMessage(tab);
      if (fromPage) {
        showPermalink(fromPage);
      } else {
        showMessage('請先打開一封郵件。');
      }
    } else {
      showMessage('無法讀取分頁網址，請重新開啟這個視窗。');
    }
  }
} catch {
  showMessage('無法讀取分頁網址，請重新開啟這個視窗。');
}
