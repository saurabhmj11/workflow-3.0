import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { INTEGRATIONS } from '@/lib/integrations/registry';
import { getCurrentUserId } from '@/lib/auth-utils';
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit';

// ─── POST ──────────────────────────────────────────────────────────────────────
// Connect an integration — either kick off OAuth2 or validate & store an API key
// Associates with current user if authenticated (multi-tenancy)
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const { integrationId, authType, apiKey, redirectUri } = body as {
      integrationId: string;
      authType: 'oauth2' | 'api_key';
      apiKey?: string;
      redirectUri?: string;
    };

    // ── Validate required fields ─────────────────────────────────────────────
    if (!integrationId || typeof integrationId !== 'string') {
      return errorResponse('integrationId is required', 400);
    }

    if (!authType || (authType !== 'oauth2' && authType !== 'api_key')) {
      return errorResponse('authType must be "oauth2" or "api_key"', 400);
    }

    // ── Look up integration definition ───────────────────────────────────────
    const integration = INTEGRATIONS.find((i) => i.id === integrationId);

    if (!integration) {
      return errorResponse(`Integration "${integrationId}" not found in registry`, 404);
    }

    // ── OAuth2 flow ──────────────────────────────────────────────────────────
    if (authType === 'oauth2') {
      if (!integration.authUrl) {
        return errorResponse(`Integration "${integrationId}" does not support OAuth2`, 400);
      }

      // Build a state parameter that encodes the integrationId so the callback
      // knows which integration the code belongs to.
      const state = Buffer.from(
        JSON.stringify({
          integrationId,
          redirectUri: redirectUri ?? '',
          ts: Date.now(),
        }),
      ).toString('base64url');

      const scopes = Array.isArray(integration.scopes) ? integration.scopes.join(' ') : '';

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: integration.clientId ?? '',
        redirect_uri: redirectUri ?? '',
        scope: scopes,
        state,
        access_type: 'offline', // request refresh token when possible
        prompt: 'consent',
      });

      const authorizationUrl = `${integration.authUrl}?${params.toString()}`;

      return successResponse({ authorizationUrl, state });
    }

    // ── API key flow ─────────────────────────────────────────────────────────
    if (authType === 'api_key') {
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return errorResponse('apiKey is required and must be non-empty for api_key auth', 400);
      }

      // Store the API key via upsert on IntegrationCredential
      const credential = await db.integrationCredential.upsert({
        where: { integrationId },
        update: {
          apiKey: apiKey.trim(),
          // Clear any stale OAuth tokens when switching to API key
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          ...(userId ? { userId } : {}),
        },
        create: {
          integrationId,
          apiKey: apiKey.trim(),
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          metadata: null,
          userId: userId ?? undefined,
        },
      });

      // Audit log — fire-and-forget
      auditLog({
        userId: userId ?? undefined,
        action: AUDIT_ACTIONS.INTEGRATION_CONNECTED,
        resource: 'integration',
        resourceId: integrationId,
        details: { authType: 'api_key' },
        ...getRequestMeta(request),
      }).catch(() => {});

      return successResponse({
        connected: true,
        integrationId: credential.integrationId,
      });
    }

    // Should never reach here, but satisfy TypeScript
    return errorResponse('Invalid authType', 400);
  } catch (error) {
    console.error('[connect POST]', error);
    return errorResponse('Failed to connect integration', 500);
  }
}
