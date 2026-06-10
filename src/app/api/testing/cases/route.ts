import { successResponse, errorResponse } from '@/lib/api-utils'
import { testRunner } from '@/lib/testing/framework'
import type { TestAssertion } from '@/lib/testing/framework'

// ─── Lazy-init demo test data on first call ──────
let demoDataSeeded = false
async function ensureDemoData() {
  if (demoDataSeeded) return
  demoDataSeeded = true
  try {
    const { seedDemoTestData } = await import('@/lib/testing/seed')
    seedDemoTestData()
  } catch (err) {
    console.error('[Testing] Failed to seed demo data:', err)
  }
}

// ─── GET /api/testing/cases ──────────────────────
// List test cases, optionally filtered by workflowId

export async function GET(request: Request) {
  try {
    await ensureDemoData()
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId') ?? undefined

    const cases = testRunner.getTestCases(workflowId)
    const results = testRunner.getAllResults()

    return successResponse({
      testCases: cases.map(tc => ({
        ...tc,
        latestResult: results.find(r => r.testCaseId === tc.id),
      })),
    })
  } catch (err) {
    console.error('[GET /api/testing/cases]', err)
    return errorResponse('Failed to fetch test cases', 500)
  }
}

// ─── POST /api/testing/cases ─────────────────────
// Create a new test case

export async function POST(request: Request) {
  try {
    await ensureDemoData()
    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return errorResponse('Missing required field: "name"', 400)
    }
    if (!body.workflowId || typeof body.workflowId !== 'string') {
      return errorResponse('Missing required field: "workflowId"', 400)
    }
    if (!body.input || typeof body.input !== 'object') {
      return errorResponse('Missing required field: "input" (must be an object)', 400)
    }
    if (!Array.isArray(body.assertions) || body.assertions.length === 0) {
      return errorResponse('Missing required field: "assertions" (must be a non-empty array)', 400)
    }

    // Validate assertion types
    const validTypes: TestAssertion['type'][] = [
      'output_equals', 'output_contains', 'output_path_equals', 'status_equals',
      'node_executed', 'node_not_executed', 'cost_less_than', 'duration_less_than',
      'confidence_greater_than',
    ]
    for (const assertion of body.assertions) {
      if (!validTypes.includes(assertion.type)) {
        return errorResponse(`Invalid assertion type: "${assertion.type}". Valid types: ${validTypes.join(', ')}`, 400)
      }
    }

    const testCase = testRunner.createTestCase({
      name: body.name,
      description: body.description,
      workflowId: body.workflowId,
      input: body.input,
      assertions: body.assertions,
      mockConfig: body.mockConfig,
      tags: body.tags,
    })

    return successResponse(testCase, 201)
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(err.message, 400)
    }
    console.error('[POST /api/testing/cases]', err)
    return errorResponse('Failed to create test case', 500)
  }
}
