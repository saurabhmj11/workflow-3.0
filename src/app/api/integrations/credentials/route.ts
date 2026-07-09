import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getCurrentUserId } from '@/lib/auth-utils';
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit';

/**
 * Mask a sensitive string, showing only the last 4 characters.
 * Returns "****" if the value is too short or empty.
 */
function maskSecret(value: string | null | undefined): string {
  if (!value || value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

// ─── GET ───────────────────────────────────────────────────────────────────────
// List all stored credentials with masked sensitive fields
// Scoped to current user if authenticated (multi-tenancy)
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const credentials = await db.integrationCredential.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const masked = credentials.map((cred) => ({
      id: cred.id,
      integrationId: cred.integrationId,
      accessToken: maskSecret(cred.accessToken),
      refreshToken: maskSecret(cred.refreshToken),
      apiKey: maskSecret(cred.apiKey),
      expiresAt: cred.expiresAt,
      metadata: cred.metadata,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    }));

    return successResponse(masked);
  } catch (error) {
    console.error('[credentials GET]', error);
    return errorResponse('Failed to fetch credentials', 500);
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────────
// Save or update (upsert) credentials for an integration
// Associates with current user if authenticated (multi-tenancy)
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const { integrationId, accessToken, refreshToken, apiKey, expiresAt, metadata } = body;

    if (!integrationId || typeof integrationId !== 'string') {
      return errorResponse('integrationId is required', 400);
    }

    // At least one credential field should be provided
    if (!accessToken && !refreshToken && !apiKey) {
      return errorResponse('At least one of accessToken, refreshToken, or apiKey must be provided', 400);
    }

    const credential = await db.integrationCredential.upsert({
      where: { integrationId },
      update: {
        ...(accessToken !== undefined && { accessToken }),
        ...(refreshToken !== undefined && { refreshToken }),
        ...(apiKey !== undefined && { apiKey }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(metadata !== undefined && { metadata }),
      },
      create: {
        integrationId,
        accessToken: accessToken ?? null,
        refreshToken: refreshToken ?? null,
        apiKey: apiKey ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata: metadata ?? null,
        userId: userId ?? undefined,
      },
    });

    return successResponse({
      id: credential.id,
      integrationId: credential.integrationId,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    });
  } catch (error) {
    console.error('[credentials POST]', error);
    return errorResponse('Failed to save credentials', 500);
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────
// Remove credentials for a given integration
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const { integrationId } = body;

    if (!integrationId || typeof integrationId !== 'string') {
      return errorResponse('integrationId is required', 400);
    }

    const deleted = await db.integrationCredential.deleteMany({
      where: {
        integrationId,
        ...(userId ? { userId } : {}),
      },
    });

    if (deleted.count === 0) {
      return errorResponse('No credentials found for this integration', 404);
    }

    // Audit log — fire-and-forget
    auditLog({
      userId: userId ?? undefined,
      action: AUDIT_ACTIONS.INTEGRATION_DISCONNECTED,
      resource: 'integration',
      resourceId: integrationId,
      ...getRequestMeta(request),
    }).catch(() => {});

    return successResponse({ deleted: deleted.count });
  } catch (error) {
    console.error('[credentials DELETE]', error);
    return errorResponse('Failed to delete credentials', 500);
  }
}
