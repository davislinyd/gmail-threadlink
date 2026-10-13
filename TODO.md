# TODO

## Current decisions

- The add-on only displays the current Gmail thread permalink as selectable plain text and provides an **Open in Gmail** button.
- Test deployments execute the latest files stored in GAS `HEAD`; local changes require `clasp push`.
- Keep the contextual Gmail scope model. Do not expose a permalink API solely for Python or Go, because arbitrary `threadId` lookup would require the broad `mail.google.com` scope.

## Marketplace release

- [ ] Complete Google Auth Platform branding, audience, support contact, and consent-screen configuration.
- [ ] Prepare Marketplace listing, privacy policy, support URL, and data-use disclosure.
- [ ] Complete OAuth verification and Marketplace review requirements before public release.
- [ ] Add at least one trusted co-owner for the GAS and GCP projects; do not delete the active GAS project, deployment, OAuth client, or linked GCP project.

## External API integrations

- [ ] Decide per provider: user OAuth is preferred; otherwise support user-owned API keys (BYOK).
- [ ] If BYOK is needed, add a settings card that validates the key, stores it in `UserProperties`, masks it after saving, and provides a remove action.
- [ ] Do not store API keys in source files, `.env` files pushed by clasp, logs, error cards, or URL parameters.
- [ ] If a shared provider key is required, use a backend with Secret Manager, authentication, rate limits, quotas, and budget alerts instead of exposing a shared GAS key.

## External Python or Go client

- [ ] Only add an Apps Script API executable if the client genuinely needs Gmail access under each user's OAuth identity.
- [ ] If added, restrict API-executable access, require per-user OAuth tokens, secure refresh-token storage, and validate all input; never deploy a public Web App that executes as the script owner.
