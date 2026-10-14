const BUTTON_CLASS = 'gmail-threadlink-copy';
const SUBJECT_CLASS = 'gmail-threadlink-subject';
const TOAST_CLASS = 'gmail-threadlink-toast';
const LINK_PATH = 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z';
const CHECK_PATH = 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';
const buttonTimers = new WeakMap();
let toastTimer = 0;
let scanScheduled = false;
let permalinkForShortcut = () => ({ ok: false, reason: 'no-thread' });
let permalinkForSubject = () => null;
let permalinkReady = null;

function loadPermalink() {
  if (!permalinkReady) {
    permalinkReady = import(chrome.runtime.getURL('permalink.mjs')).then((module) => {
      permalinkForShortcut = module.permalinkForShortcut;
      permalinkForSubject = module.permalinkForSubject;
    });
  }
  return permalinkReady;
}

function isShown(element) {
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }
  return element.getClientRects().length > 0;
}

function visibleSubjects() {
  const subjects = [];
  for (const heading of document.querySelectorAll('h2[data-legacy-thread-id], h2[data-thread-perm-id]')) {
    if (!isShown(heading)) {
      continue;
    }
    subjects.push({
      legacyThreadId: heading.getAttribute('data-legacy-thread-id'),
      permId: heading.getAttribute('data-thread-perm-id'),
      visible: true,
    });
    if (subjects.length === 3) {
      break;
    }
  }
  return subjects;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    } catch {
      return false;
    }
  }
}

function showToast(text) {
  let toast = document.querySelector(`.${TOAST_CLASS}`);
  if (!toast) {
    toast = document.createElement('div');
    toast.className = TOAST_CLASS;
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 1600);
}

function markCopied(button) {
  button.classList.add('is-copied');
  const pending = buttonTimers.get(button);
  if (pending) {
    clearTimeout(pending);
  }
  buttonTimers.set(button, setTimeout(() => {
    button.classList.remove('is-copied');
  }, 1600));
}

function svgIcon(path, className) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(className);
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shape.setAttribute('fill', 'currentColor');
  shape.setAttribute('d', path);
  svg.append(shape);
  return svg;
}

function createButton(heading) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASS;
  button.setAttribute('aria-label', "Copy this email's permalink");
  button.append(svgIcon(LINK_PATH, 'gmail-threadlink-link'), svgIcon(CHECK_PATH, 'gmail-threadlink-check'));
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const permalink = permalinkForSubject(
      location.href,
      heading.getAttribute('data-legacy-thread-id'),
      heading.getAttribute('data-thread-perm-id'),
    );
    if (!permalink || !(await copyText(permalink))) {
      showToast("Couldn't copy.");
      return;
    }
    markCopied(button);
    showToast('Link copied.');
  });
  return button;
}

function messageFor(result, copied) {
  if (!result.ok) {
    return result.reason === 'not-gmail' ? 'Open Gmail first.' : 'Open an email first.';
  }
  return copied ? 'Link copied.' : "Couldn't copy.";
}

async function copyShortcut() {
  const result = permalinkForShortcut(location.href, visibleSubjects());
  const copied = result.ok ? await copyText(result.permalink) : false;
  const text = messageFor(result, copied);
  showToast(text);
  return { ok: result.ok && copied, message: text };
}

function ensureButtons() {
  for (const heading of document.querySelectorAll('h2[data-legacy-thread-id], h2[data-thread-perm-id]')) {
    if (heading.parentElement?.classList.contains(SUBJECT_CLASS)) {
      continue;
    }
    if (heading.nextElementSibling?.classList.contains(BUTTON_CLASS)) {
      heading.nextElementSibling.remove();
    }
    const group = document.createElement('span');
    group.className = SUBJECT_CLASS;
    heading.replaceWith(group);
    group.append(heading, createButton(heading));
  }
}

function scheduleScan() {
  if (scanScheduled) {
    return;
  }
  scanScheduled = true;
  requestAnimationFrame(() => {
    scanScheduled = false;
    ensureButtons();
  });
}

function nodeElement(target) {
  if (target instanceof Element) {
    return target;
  }
  if (target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

function emailFromTarget(target) {
  const element = nodeElement(target);
  if (!element) {
    return null;
  }

  const row = element.closest('tr[data-legacy-thread-id], tr.zA, [role="row"]');
  if (row) {
    const source = row.matches('[data-legacy-thread-id], [data-thread-id], [data-thread-perm-id]')
      ? row
      : row.querySelector('[data-legacy-thread-id], [data-thread-id], [data-thread-perm-id]');
    const legacyThreadId = source?.getAttribute('data-legacy-thread-id') || null;
    const permId = source?.getAttribute('data-thread-perm-id') || source?.getAttribute('data-thread-id') || null;
    if (legacyThreadId || permId) {
      return { legacyThreadId, permId };
    }
  }

  const heading = element.closest('h2[data-legacy-thread-id], h2[data-thread-perm-id]')
    || element.closest(`.${SUBJECT_CLASS}`)?.querySelector('h2[data-legacy-thread-id], h2[data-thread-perm-id]');
  if (heading) {
    return {
      legacyThreadId: heading.getAttribute('data-legacy-thread-id'),
      permId: heading.getAttribute('data-thread-perm-id'),
    };
  }

  if (element.closest('[data-message-id]')) {
    const visible = [...document.querySelectorAll('h2[data-legacy-thread-id], h2[data-thread-perm-id]')].find(isShown);
    if (visible) {
      return {
        legacyThreadId: visible.getAttribute('data-legacy-thread-id'),
        permId: visible.getAttribute('data-thread-perm-id'),
      };
    }
  }
  return null;
}

function findContextMenu(x, y) {
  let best = null;
  let bestDistance = 300;
  for (const menu of document.querySelectorAll('[role="menu"]')) {
    if (!isShown(menu) || !menu.querySelector('[role="menuitem"]')) {
      continue;
    }
    const rect = menu.getBoundingClientRect();
    const distance = Math.max(rect.left - x, 0, x - rect.right) + Math.max(rect.top - y, 0, y - rect.bottom);
    if (distance < bestDistance) {
      best = menu;
      bestDistance = distance;
    }
  }
  return best;
}

async function permalinkForEmail(email) {
  await loadPermalink();
  return permalinkForSubject(location.href, email.legacyThreadId, email.permId);
}

async function copyEmail(email) {
  const permalink = await permalinkForEmail(email);
  const copied = permalink ? await copyText(permalink) : false;
  showToast(copied ? 'Link copied.' : "Couldn't copy.");
}

async function openEmail(email) {
  const permalink = await permalinkForEmail(email);
  if (!permalink) {
    showToast("Couldn't open.");
    return;
  }
  try {
    const response = await chrome.runtime.sendMessage({ type: 'open-permalink', url: permalink });
    if (!response?.ok) {
      showToast("Couldn't open.");
    }
  } catch {
    showToast("Couldn't open.");
  }
}

function createContextMenuItem(sample, labelText, action) {
  const item = document.createElement(sample.tagName.toLowerCase());
  item.className = sample.className;
  item.setAttribute('role', 'menuitem');
  item.setAttribute('data-gmail-threadlink-menu', '');
  const labelSample = sample.querySelector('.J-N-Jz');
  if (labelSample) {
    const label = document.createElement(labelSample.tagName.toLowerCase());
    label.className = labelSample.className;
    label.textContent = labelText;
    item.append(label);
  } else {
    item.textContent = labelText;
  }
  item.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  });
  return item;
}

function addContextMenuItem(menu, email) {
  if (!menu.isConnected || menu.querySelector('[data-gmail-threadlink-menu]')) {
    return;
  }
  const sample = menu.querySelector('[role="menuitem"]');
  if (!sample?.parentElement) {
    return;
  }

  const closeMenu = () => {
    menu.style.display = 'none';
  };
  sample.parentElement.append(
    createContextMenuItem(sample, 'Copy link to this email', () => {
      copyEmail(email).finally(closeMenu);
    }),
    createContextMenuItem(sample, 'Open this email in a new tab', () => {
      openEmail(email).finally(closeMenu);
    }),
  );
}

function watchContextMenu(email, x, y) {
  const started = performance.now();
  const attach = () => {
    const menu = findContextMenu(x, y);
    if (!menu) {
      return false;
    }
    addContextMenuItem(menu, email);
    return true;
  };
  if (attach()) {
    return;
  }
  const observer = new MutationObserver(() => {
    if (attach() || performance.now() - started > 800) {
      observer.disconnect();
    }
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
  setTimeout(() => observer.disconnect(), 800);
}

document.addEventListener('contextmenu', (event) => {
  const email = emailFromTarget(event.target);
  if (!email) {
    return;
  }
  watchContextMenu(email, event.clientX, event.clientY);
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'copy-permalink') {
    return undefined;
  }
  loadPermalink()
    .then(() => copyShortcut())
    .then(sendResponse, () => sendResponse({ ok: false, message: "Couldn't copy." }));
  return true;
});

loadPermalink().then(() => {
  ensureButtons();
  if (document.body) {
    new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
  }
}).catch(() => {
  // Leave Gmail unchanged when the permalink module cannot load.
});
