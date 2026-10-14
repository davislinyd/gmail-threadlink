# Gmail ThreadLink extension

After you open a message in Gmail on the web, copy that thread's permalink from the button beside the subject, the keyboard shortcut, or the toolbar icon.

## Load

1. Open `chrome://extensions`.
2. Turn on Developer mode in the top right.
3. Choose Load unpacked.
4. Select this `extension` directory.

## Manual checks

1. Open a Gmail message and click the extension icon. You should see a link that contains `#all/` and the thread id. Click Copy, paste, and confirm the text. Click Open. A new tab should open the same thread.
2. Stay on the inbox list with no message open. The popup should say "Open an email first."
3. On a tab that is not Gmail, the popup should say "Open Gmail first."
4. With more than one Google account, `/u/0/` or `/u/1/` in the link should match the current tab.
5. When a message is open in a popout (the URL contains `/popout` and `th=#thread-f:`), the popup should still show an `#all/` link.
6. In split view the URL can stay on `#inbox`. With a message open below or to the right, the popup should still show an `#all/` link. With no message open, it should still say "Open an email first."
7. An open message has a link icon to the right of the subject. After you click it, the clipboard holds that message's `#all/` link, the icon briefly becomes a check mark, and the lower right says "Link copied."
8. The default shortcut is Option+C. The lower right of the page should say "Link copied." Change the shortcut at `chrome://extensions/shortcuts`. With no message open, it must not copy another message's link.
9. Right-click a message row or an open message. Gmail's own menu ends with "Copy link to this email" and "Open this email in a new tab". These items do not appear in Chrome's normal context menu. After "Copy link to this email", the lower right says "Link copied." "Open this email in a new tab" opens that message's `#all/` link in a new tab.
