# Gmail ThreadLink

Copy the permalink of the Gmail message you are reading. The link is Gmail's thread permalink. Only people who can open that mailbox can open it.

This repository has two uses:

- `extension/`: a Chrome extension. Copy or open the link from beside the subject, a keyboard shortcut, or Gmail's own context menu.
- `Code.gs` at the repository root: a Google Workspace add-on that shows the same link in the Gmail side panel.

## Chrome extension

After you open a message in Gmail on the web:

- Click the link icon to the right of the subject to copy the link.
- Press Option+C (Alt+C on other platforms) to copy the link. If the shortcut does not work, set it at `chrome://extensions/shortcuts`.
- Right-click a message row or an open message. Gmail's own menu ends with "Copy link to this email" and "Open this email in a new tab". These items do not appear in Chrome's normal context menu.
- Click the toolbar icon to view the link, copy it, or open it in a new tab.

In split view the URL can stay on `#inbox`. The extension reads the thread id from the open message's subject, or from the row you right-clicked. A decimal id in a popout URL (`#thread-f:`) is converted into an `#all/` link.

### Install

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Choose Load unpacked.
4. Select this repository's `extension` directory.

The extension runs only on `https://mail.google.com/`. It reads the thread id from the page URL and the subject on your machine and builds the link there. It does not send message content to another server.

### Development

```bash
node --test extension/permalink.test.mjs
```

## Workspace add-on

When you open a message, the add-on appears in the Gmail side panel. It shows a selectable permalink and an Open in Gmail button. `GmailApp.getPermalink()` produces the permalink, in the form `https://mail.google.com/mail/u/0/popout?ver=…&cat=…&qid=…`. Opening the same thread again within 6 hours reuses the permalink fetched last time.

Push `Code.gs` and `appsscript.json` from this machine with [clasp](https://github.com/google/clasp):

```bash
npm install -g @google/clasp
clasp login
clasp create --type standalone --title "Gmail ThreadLink"
clasp push
```

`.clasp.json` holds the Script ID and is listed in `.gitignore`, so it is not in this repository. `.claspignore` keeps `clasp push` from uploading `extension/` to Apps Script.

The OAuth scopes are:

- `https://www.googleapis.com/auth/gmail.addons.execute`
- `https://www.googleapis.com/auth/gmail.addons.current.message.readonly`
