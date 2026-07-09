import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { INTEGRATIONS } from '@/lib/integrations/registry';

// ─── GET ───────────────────────────────────────────────────────────────────────
// OAuth2 callback — exchanges the authorization code for tokens and stores them
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // ── User denied access or provider returned an error ─────────────────────
    if (error) {
      const errorDescription = searchParams.get('error_description') ?? error;
      return new Response(oauthErrorHtml(errorDescription), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code || !stateParam) {
      return new Response(oauthErrorHtml('Missing authorization code or state parameter'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // ── Decode state to recover integrationId & redirectUri ──────────────────
    let state: { integrationId: string; redirectUri: string; ts: number };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
    } catch {
      return new Response(oauthErrorHtml('Invalid state parameter'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const { integrationId, redirectUri } = state;

    // ── Look up integration definition ───────────────────────────────────────
    const integration = INTEGRATIONS.find((i) => i.id === integrationId);

    if (!integration) {
      return new Response(oauthErrorHtml(`Integration "${integrationId}" not found`), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!integration.tokenUrl) {
      return new Response(oauthErrorHtml(`Integration "${integrationId}" has no tokenUrl configured`), {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // ── Exchange authorization code for tokens ───────────────────────────────
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: integration.clientId ?? '',
      client_secret: integration.clientSecret ?? '',
      redirect_uri: redirectUri ?? '',
    });

    const tokenRes = await fetch(integration.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenRequestBody.toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('[oauth callback] Token exchange failed:', tokenRes.status, text);
      return new Response(oauthErrorHtml('Token exchange failed. Please try again.'), {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | null = tokenData.refresh_token ?? null;
    const expiresIn: number | null = tokenData.expires_in ?? null;

    // Calculate absolute expiry time
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // ── Persist tokens in IntegrationCredential ──────────────────────────────
    await db.integrationCredential.upsert({
      where: { integrationId },
      update: {
        accessToken,
        refreshToken,
        expiresAt,
        // Clear any stale API key when switching to OAuth
        apiKey: null,
      },
      create: {
        integrationId,
        accessToken,
        refreshToken,
        apiKey: null,
        expiresAt,
        metadata: null,
      },
    });

    // ── Return success HTML that closes itself or redirects ──────────────────
    return new Response(oauthSuccessHtml(redirectUri), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[oauth callback GET]', error);
    return new Response(oauthErrorHtml('An unexpected error occurred'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ─── HTML Templates ────────────────────────────────────────────────────────────

function oauthSuccessHtml(redirectUri?: string): string {
  const redirectScript = redirectUri
    ? `window.location.href = "${redirectUri}";`
    : 'window.close();';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authorization Successful</title>
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f0fdf4;
      color: #166534;
    }
    .container { text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { font-size: 14px; color: #15803d; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10003;</div>
    <h1>Authorization Successful</h1>
    <p>You can close this window.</p>
  </div>
  <script>
    try { ${redirectScript} } catch (e) { /* window.close may be blocked */ }
  </script>
</body>
</html>`;
}

function oauthErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authorization Failed</title>
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fef2f2;
      color: #991b1b;
    }
    .container { text-align: center; max-width: 400px; padding: 24px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { font-size: 14px; color: #b91c1c; margin: 0 0 16px; word-break: break-word; }
    button {
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      background: #dc2626;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover { background: #b91c1c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10007;</div>
    <h1>Authorization Failed</h1>
    <p>${escapeHtml(message)}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
