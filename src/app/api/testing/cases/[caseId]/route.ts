import { successResponse, errorResponse } from '@/lib/api-utils'
import { testRunner } from '@/lib/testing/framework'

// ─── GET /api/testing/cases/[caseId] ─────────────
// Get test case details with latest result

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params
    const testCase = testRunner.getTestCase(caseId)

    if (!testCase) {
      return errorResponse(`Test case "${caseId}" not found`, 404)
    }

    const latestResult = testRunner.getTestResult(caseId)

    return successResponse({
      ...testCase,
      latestResult,
    })
  } catch (err) {
    console.error('[GET /api/testing/cases/[caseId]]', err)
    return errorResponse('Failed to fetch test case', 500)
  }
}

// ─── PUT /api/testing/cases/[caseId] ─────────────
// Update a test case

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params
    const body = await request.json()

    const updated = testRunner.updateTestCase(caseId, body)
    if (!updated) {
      return errorResponse(`Test case "${caseId}" not found`, 404)
    }

    return successResponse(updated)
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(err.message, 400)
    }
    console.error('[PUT /api/testing/cases/[caseId]]', err)
    return errorResponse('Failed to update test case', 500)
  }
}

// ─── DELETE /api/testing/cases/[caseId] ──────────
// Delete a test case

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params
    const deleted = testRunner.deleteTestCase(caseId)

    if (!deleted) {
      return errorResponse(`Test case "${caseId}" not found`, 404)
    }

    return successResponse({ deleted: caseId })
  } catch (err) {
    console.error('[DELETE /api/testing/cases/[caseId]]', err)
    return errorResponse('Failed to delete test case', 500)
  }
}
