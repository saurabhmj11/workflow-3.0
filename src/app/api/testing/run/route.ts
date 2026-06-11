import { successResponse, errorResponse } from '@/lib/api-utils'
import { testRunner } from '@/lib/testing/framework'

// ─── POST /api/testing/run ───────────────────────
// Run a test case or all tests for a workflow
// Body: { testCaseId?: string, workflowId?: string }

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.testCaseId) {
      // Run a specific test case
      const testCase = testRunner.getTestCase(body.testCaseId)
      if (!testCase) {
        return errorResponse(`Test case "${body.testCaseId}" not found`, 404)
      }

      const result = await testRunner.runTest(testCase)
      return successResponse(result)
    }

    if (body.workflowId) {
      // Run all tests for a workflow
      const results = await testRunner.runWorkflowTests(body.workflowId)

      const summary = {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        error: results.filter(r => r.status === 'error').length,
        totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
      }

      return successResponse({ results, summary })
    }

    return errorResponse('Provide either "testCaseId" or "workflowId" in the request body', 400)
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(err.message, 400)
    }
    console.error('[POST /api/testing/run]', err)
    return errorResponse('Failed to run tests', 500)
  }
}
