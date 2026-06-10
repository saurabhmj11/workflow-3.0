import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'
import { successResponse, errorResponse } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'

// PUT /api/settings/password — Change password
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { currentPassword, newPassword, confirmPassword } = body as {
      currentPassword?: string
      newPassword?: string
      confirmPassword?: string
    }

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return errorResponse('All password fields are required')
    }

    if (newPassword.length < 8) {
      return errorResponse('New password must be at least 8 characters')
    }

    if (newPassword !== confirmPassword) {
      return errorResponse('New passwords do not match')
    }

    // Fetch user with hashed password
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, hashedPassword: true },
    })

    if (!dbUser) return errorResponse('User not found', 404)

    // If user has a password, verify current password
    if (dbUser.hashedPassword) {
      const isValid = await bcrypt.compare(currentPassword, dbUser.hashedPassword)
      if (!isValid) {
        return errorResponse('Current password is incorrect')
      }
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    })

    return successResponse({ message: 'Password updated successfully' })
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[Settings/Password] PUT error:', err)
    return errorResponse('Failed to change password', 500)
  }
}
