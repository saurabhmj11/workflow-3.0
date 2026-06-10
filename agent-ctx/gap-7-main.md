# Task gap-7: Implement Real IMAP Email Listener with imapflow

## Agent: Main

## Summary
Implemented real IMAP email listener using imapflow library, replacing the stubbed `fetchNewEmails()` function with actual IMAP connectivity. Added connection testing API endpoint and graceful degradation when the library is unavailable.

## Changes Made

### 1. Installed Packages
- `imapflow@1.3.7` — IMAP client library
- `@types/imapflow@1.0.189` — TypeScript type definitions

### 2. Updated `/src/lib/email-listener.ts`
- **Replaced `fetchNewEmails()` stub** with real IMAP implementation:
  - Dynamic import of imapflow with cached availability check
  - ImapFlow client with `logger: false`, `emitLogs: false`
  - 10-second connection timeout via `Promise.race`
  - Mailbox lock with proper cleanup in `finally`
  - Searches unseen messages (max 50)
  - Fetches envelope + source per message
  - Skips already-seen emails via `lastSeenIds`
  - Body capped at 10,000 chars

- **Added `extractPlainText()`** MIME body parser:
  - text/plain extraction with quoted-printable decoding
  - base64 fallback
  - Raw source truncation as last resort

- **Added `testImapConnection()`** export:
  - Tests IMAP reachability with 10s timeout
  - Returns `{ success: boolean; error?: string }`
  - Handles missing library gracefully

- **Added `getImapFlow()`** dynamic import helper:
  - Caches library availability (null → not checked, true/false → cached)
  - Returns ImapFlow class or null

### 3. Updated `/src/app/api/triggers/email/route.ts`
- GET handler now supports `?action=test`:
  - `?action=test&id=<triggerId>` — loads config from DB
  - `?action=test&host=...&username=...&password=...` — tests direct credentials
  - Passwords encrypted before passing to `testImapConnection`
- Default GET (list triggers) behavior unchanged

## Build Verification
- `bun run lint` — passes clean
- `npx next build` — compiles successfully
- Dev server running on port 3000
