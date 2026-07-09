import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { db } from '@/lib/db'

const WHITELABEL_KEY = 'whitelabel'

const DEFAULT_WHITELABEL = {
  companyName: '',
  logoUrl: '',
  primaryColor: '#06b6d4',
  customDomain: '',
  removeOpenWorkflowBranding: false,
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const config = await db.siteConfig.findUnique({
      where: { key: WHITELABEL_KEY },
    })

    if (!config) {
      return NextResponse.json({ ok: true, data: DEFAULT_WHITELABEL })
    }

    return NextResponse.json({ ok: true, data: JSON.parse(config.value) })
  } catch (error) {
    console.error('Failed to get whitelabel config:', error)
    return NextResponse.json({ ok: false, error: 'Failed to get whitelabel config' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow ADMIN to update whitelabel settings
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Must be an ADMIN to update whitelabel settings' }, { status: 403 })
    }

    const body = await req.json()

    // Validate body structure
    const newConfig = {
      companyName: String(body.companyName || ''),
      logoUrl: String(body.logoUrl || ''),
      primaryColor: String(body.primaryColor || '#06b6d4'),
      customDomain: String(body.customDomain || ''),
      removeOpenWorkflowBranding: Boolean(body.removeOpenWorkflowBranding),
    }

    await db.siteConfig.upsert({
      where: { key: WHITELABEL_KEY },
      update: { value: JSON.stringify(newConfig) },
      create: { key: WHITELABEL_KEY, value: JSON.stringify(newConfig) },
    })

    return NextResponse.json({ ok: true, data: newConfig })
  } catch (error) {
    console.error('Failed to update whitelabel config:', error)
    return NextResponse.json({ ok: false, error: 'Failed to update whitelabel config' }, { status: 500 })
  }
}
