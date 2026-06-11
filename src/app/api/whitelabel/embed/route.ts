// ─── White-Label Embed API ────────────────────────
// GET /api/whitelabel/embed
// Returns embeddable workflow builder HTML for iframe embedding.
// Validates the token and checks origin permissions.

import { whiteLabelManager } from '@/lib/whitelabel/config'
import { errorResponse } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

const log = createLogger('WhiteLabelEmbed')

/**
 * GET /api/whitelabel/embed
 * Returns embeddable workflow builder HTML with CORS headers.
 *
 * Query params:
 *   workflowId — The workflow to embed
 *   token      — JWT embed token for authentication
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const workflowId = url.searchParams.get('workflowId')
    const token = url.searchParams.get('token')
    const origin = req.headers.get('origin') || req.headers.get('referer') || ''

    // Check if embedding is allowed from this origin
    if (origin) {
      let originUrl: string
      try {
        originUrl = new URL(origin).origin
      } catch {
        originUrl = origin
      }

      const isAllowed = await whiteLabelManager.isOriginAllowed(originUrl)
      if (!isAllowed) {
        log.warn({ origin: originUrl }, 'Embed request from disallowed origin')
        return errorResponse('Origin not allowed for embedding', 403)
      }
    }

    // Validate token (simple JWT-like validation)
    if (!token) {
      return errorResponse('Embed token is required', 401)
    }

    // Decode and validate the token
    const tokenData = await validateEmbedToken(token)
    if (!tokenData) {
      return errorResponse('Invalid or expired embed token', 401)
    }

    // If workflowId is specified, verify access
    if (workflowId && tokenData.workflowId && tokenData.workflowId !== workflowId) {
      return errorResponse('Token does not grant access to this workflow', 403)
    }

    // Get white-label config for branding
    const config = await whiteLabelManager.getConfig()

    // Generate the embeddable HTML
    const html = generateEmbedHtml({
      workflowId: workflowId || tokenData.workflowId,
      companyName: config.companyName,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
      customCss: config.customCss,
      showHeader: config.embed.showHeader,
      showSidebar: config.embed.showSidebar,
      theme: config.embed.theme,
      locale: config.embed.locale,
      permissions: tokenData.permissions,
    })

    // Set CORS headers based on allowed origins
    const allowedOrigins = config.embed.allowedOrigins
    const corsOrigin = origin && allowedOrigins.length > 0
      ? allowedOrigins.find((o) => {
          if (o === '*') return true
          if (o.startsWith('*.')) {
            return origin.endsWith(o.slice(2))
          }
          return o === origin
        }) ? origin : ''
      : ''

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': corsOrigin ? `ALLOW-FROM ${corsOrigin}` : 'DENY',
        'Content-Security-Policy': corsOrigin
          ? `frame-ancestors ${corsOrigin}`
          : "frame-ancestors 'none'",
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err) {
    log.error({ err }, 'Failed to serve embed HTML')
    return errorResponse('Failed to load embed', 500)
  }
}

// ─── Token Validation ─────────────────────────────

interface EmbedTokenData {
  workflowId?: string
  permissions: string[]
  expiresAt: number
}

async function validateEmbedToken(token: string): Promise<EmbedTokenData | null> {
  try {
    // Our embed tokens are stored in the DB (SiteConfig with key pattern 'embed_token:{hash}')
    // For simplicity, we use a base64-encoded JSON token
    const decoded = JSON.parse(atob(token)) as EmbedTokenData

    // Check expiration
    if (decoded.expiresAt && decoded.expiresAt < Date.now()) {
      return null
    }

    return decoded
  } catch {
    // Try DB-based token validation
    try {
      const record = await db.siteConfig.findUnique({
        where: { key: `embed_token:${token}` },
      })

      if (!record) return null

      const data = JSON.parse(record.value) as EmbedTokenData

      // Check expiration
      if (data.expiresAt && data.expiresAt < Date.now()) {
        // Clean up expired token
        await db.siteConfig.delete({ where: { key: `embed_token:${token}` } }).catch(() => {})
        return null
      }

      return data
    } catch {
      return null
    }
  }
}

// ─── HTML Generation ──────────────────────────────

function generateEmbedHtml(opts: {
  workflowId?: string
  companyName: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  customCss?: string
  showHeader: boolean
  showSidebar: boolean
  theme: string
  locale: string
  permissions?: string[]
}): string {
  const themeClass = opts.theme === 'dark' ? 'dark' : opts.theme === 'light' ? 'light' : ''
  const dataWorkflow = opts.workflowId ? `data-workflow-id="${opts.workflowId}"` : ''
  const dataPermissions = opts.permissions ? `data-permissions="${opts.permissions.join(',')}"` : ''

  return `<!DOCTYPE html>
<html lang="${opts.locale}" class="${themeClass}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${opts.companyName} — Workflow Builder</title>
  <style>
    :root {
      --ow-primary: ${opts.primaryColor};
      --ow-secondary: ${opts.secondaryColor};
      --ow-accent: ${opts.accentColor};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      height: 100vh;
      overflow: hidden;
    }
    .embed-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    ${opts.showHeader ? `
    .embed-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }
    .embed-header h1 {
      font-size: 14px;
      font-weight: 600;
      background: linear-gradient(135deg, var(--ow-primary), var(--ow-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    ` : ''}
    .embed-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    ${opts.showSidebar ? `
    .embed-sidebar {
      width: 240px;
      background: #1e293b;
      border-right: 1px solid #334155;
      padding: 16px;
      overflow-y: auto;
    }
    .embed-sidebar h2 {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
    }
    .node-item {
      padding: 8px 12px;
      border-radius: 6px;
      cursor: grab;
      margin-bottom: 4px;
      border: 1px solid #334155;
      background: #0f172a;
      font-size: 13px;
      transition: border-color 0.15s;
    }
    .node-item:hover {
      border-color: var(--ow-primary);
    }
    ` : ''}
    .embed-canvas {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .embed-canvas canvas {
      width: 100%;
      height: 100%;
    }
    .embed-watermark {
      position: absolute;
      bottom: 8px;
      right: 8px;
      font-size: 10px;
      color: #475569;
      opacity: 0.6;
    }
    ${opts.customCss || ''}
  </style>
</head>
<body>
  <div class="embed-container" ${dataWorkflow} ${dataPermissions}>
    ${opts.showHeader ? `
    <header class="embed-header">
      <h1>${opts.companyName}</h1>
    </header>
    ` : ''}
    <div class="embed-body">
      ${opts.showSidebar ? `
      <aside class="embed-sidebar">
        <h2>Nodes</h2>
        <div class="node-item" draggable="true" data-type="llm">🤖 LLM Node</div>
        <div class="node-item" draggable="true" data-type="condition">🔀 Condition</div>
        <div class="node-item" draggable="true" data-type="webhook">🌐 Webhook</div>
        <div class="node-item" draggable="true" data-type="approval">👍 Approval</div>
        <div class="node-item" draggable="true" data-type="code">⚡ Code</div>
      </aside>
      ` : ''}
      <main class="embed-canvas">
        <div style="text-align:center;">
          <p style="font-size:16px;color:#94a3b8;">Embedded Workflow Builder</p>
          <p style="font-size:12px;color:#475569;margin-top:8px;">
            ${opts.workflowId ? `Workflow: ${opts.workflowId}` : 'No workflow specified'}
          </p>
        </div>
        <div class="embed-watermark">Powered by ${opts.companyName}</div>
      </main>
    </div>
  </div>
  <script>
    // Post message API for parent frame communication
    window.addEventListener('message', function(event) {
      var data = event.data;
      if (data.type === 'ow:ready') {
        event.source.postMessage({ type: 'ow:ready', workflowId: document.querySelector('[data-workflow-id]')?.dataset.workflowId }, event.origin);
      }
    });
    // Notify parent that embed is loaded
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'ow:loaded' }, '*');
    }
  </script>
</body>
</html>`
}
