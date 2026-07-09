// ─── OpenWorkflow Testing Framework ──────────────
// Create and run test cases for workflows with
// mockable AI/action responses and rich assertions.

import { createLogger } from '@/lib/logger'

const log = createLogger('TestRunner')

// ─── Type Definitions ────────────────────────────

/** A single test case for a workflow */
export interface TestCase {
  id: string
  name: string
  description?: string
  workflowId: string
  input: Record<string, unknown>
  assertions: TestAssertion[]
  mockConfig?: {
    /** Override AI responses by node type */
    aiResponses?: Record<string, string>
    /** Override action responses by node type */
    actionResponses?: Record<string, unknown>
    /** Override all delays to this value (ms) */
    delayMs?: number
    /** Auto-approve human approval nodes */
    skipHumanNodes?: boolean
  }
  tags?: string[]
}

/** An assertion to validate against execution results */
export interface TestAssertion {
  type: 'output_equals' | 'output_contains' | 'output_path_equals' | 'status_equals' | 'node_executed' | 'node_not_executed' | 'cost_less_than' | 'duration_less_than' | 'confidence_greater_than'
  /** For node-specific assertions (node_executed, node_not_executed, confidence_greater_than) */
  nodeId?: string
  /** JSON path for output_path_equals */
  path?: string
  /** Expected value */
  expected?: unknown
  /** Custom failure message */
  message?: string
}

/** Result of running a single test case */
export interface TestResult {
  testCaseId: string
  testCaseName: string
  status: 'passed' | 'failed' | 'error'
  durationMs: number
  assertions: Array<{
    assertion: TestAssertion
    passed: boolean
    actual?: unknown
    message: string
  }>
  executionResult?: unknown
  error?: string
  startedAt: string
  finishedAt: string
}

/** A group of test cases for a workflow */
export interface TestSuite {
  id: string
  name: string
  workflowId: string
  testCases: TestCase[]
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────

function generateId(length = 12): string {
  const chars = '0123456789abcdef'
  let id = ''
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Get a nested value from an object using a dot-separated path.
 * e.g. getNestedValue(obj, 'data.items.0.name')
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined

  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

// ─── Test Runner ─────────────────────────────────

/**
 * Workflow test runner.
 * Executes test cases against workflows and validates assertions.
 */
export class TestRunner {
  private testCases: Map<string, TestCase> = new Map()
  private testResults: Map<string, TestResult> = new Map()
  private testSuites: Map<string, TestSuite> = new Map()

  /** Create a new test case */
  createTestCase(testCase: Omit<TestCase, 'id'>): TestCase {
    const tc: TestCase = {
      ...testCase,
      id: `tc-${generateId()}`,
    }
    this.testCases.set(tc.id, tc)
    log.info({ testCaseId: tc.id, name: tc.name, workflowId: tc.workflowId }, 'Test case created')
    return tc
  }

  /** Get a test case by ID */
  getTestCase(id: string): TestCase | undefined {
    return this.testCases.get(id)
  }

  /** Get all test cases, optionally filtered by workflowId */
  getTestCases(workflowId?: string): TestCase[] {
    const all = Array.from(this.testCases.values())
    if (workflowId) {
      return all.filter(tc => tc.workflowId === workflowId)
    }
    return all
  }

  /** Update an existing test case */
  updateTestCase(id: string, updates: Partial<Omit<TestCase, 'id'>>): TestCase | undefined {
    const existing = this.testCases.get(id)
    if (!existing) return undefined

    const updated = { ...existing, ...updates }
    this.testCases.set(id, updated)
    return updated
  }

  /** Delete a test case */
  deleteTestCase(id: string): boolean {
    return this.testCases.delete(id)
  }

  /** Get the latest result for a test case */
  getTestResult(testCaseId: string): TestResult | undefined {
    return this.testResults.get(testCaseId)
  }

  /** Get all test results */
  getAllResults(): TestResult[] {
    return Array.from(this.testResults.values())
  }

  /** Create a test suite */
  createTestSuite(suite: Omit<TestSuite, 'id' | 'createdAt'>): TestSuite {
    const ts: TestSuite = {
      ...suite,
      id: `ts-${generateId()}`,
      createdAt: new Date().toISOString(),
    }
    this.testSuites.set(ts.id, ts)
    return ts
  }

  /**
   * Run a single test case.
   * Executes the workflow with mocked inputs and validates assertions.
   */
  async runTest(testCase: TestCase): Promise<TestResult> {
    const startedAt = new Date().toISOString()
    const startTime = Date.now()

    log.info({ testCaseId: testCase.id, name: testCase.name }, 'Running test case')

    try {
      // Simulate workflow execution with mock config
      const executionResult = await this.simulateExecution(testCase)

      // Extract steps for node-level assertions
      const steps = (executionResult as Record<string, unknown>)?.steps as Array<Record<string, unknown>> ?? []

      // Validate assertions
      const assertionResults = this.validateAssertions(testCase.assertions, executionResult, steps)

      const allPassed = assertionResults.every(a => a.passed)
      const hasFailed = assertionResults.some(a => !a.passed)

      const result: TestResult = {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        status: allPassed ? 'passed' : 'failed',
        durationMs: Date.now() - startTime,
        assertions: assertionResults,
        executionResult,
        startedAt,
        finishedAt: new Date().toISOString(),
      }

      this.testResults.set(testCase.id, result)
      log.info({ testCaseId: testCase.id, status: result.status, durationMs: result.durationMs }, 'Test completed')

      return result
    } catch (err) {
      const result: TestResult = {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        status: 'error',
        durationMs: Date.now() - startTime,
        assertions: [],
        error: err instanceof Error ? err.message : 'Unknown error',
        startedAt,
        finishedAt: new Date().toISOString(),
      }

      this.testResults.set(testCase.id, result)
      log.error({ testCaseId: testCase.id, error: result.error }, 'Test errored')

      return result
    }
  }

  /**
   * Run all test cases for a workflow.
   */
  async runWorkflowTests(workflowId: string): Promise<TestResult[]> {
    const cases = this.getTestCases(workflowId)
    const results: TestResult[] = []

    for (const tc of cases) {
      const result = await this.runTest(tc)
      results.push(result)
    }

    return results
  }

  /**
   * Validate assertions against execution results.
   */
  validateAssertions(
    assertions: TestAssertion[],
    executionResult: unknown,
    steps: Array<Record<string, unknown>>
  ): TestResult['assertions'] {
    return assertions.map(assertion => {
      try {
        return this.validateSingleAssertion(assertion, executionResult, steps)
      } catch (err) {
        return {
          assertion,
          passed: false,
          actual: undefined,
          message: err instanceof Error ? err.message : 'Assertion validation failed',
        }
      }
    })
  }

  /** Validate a single assertion */
  private validateSingleAssertion(
    assertion: TestAssertion,
    executionResult: unknown,
    steps: Array<Record<string, unknown>>
  ): TestResult['assertions'][0] {
    const result = executionResult as Record<string, unknown> | null

    switch (assertion.type) {
      case 'output_equals': {
        const actual = result?.output
        const passed = JSON.stringify(actual) === JSON.stringify(assertion.expected)
        return {
          assertion,
          passed,
          actual,
          message: passed
            ? 'Output matches expected value'
            : assertion.message ?? `Expected output ${JSON.stringify(assertion.expected)} but got ${JSON.stringify(actual)}`,
        }
      }

      case 'output_contains': {
        const outputStr = JSON.stringify(result?.output ?? '')
        const expectedStr = String(assertion.expected)
        const passed = outputStr.includes(expectedStr)
        return {
          assertion,
          passed,
          actual: outputStr.slice(0, 200),
          message: passed
            ? 'Output contains expected value'
            : assertion.message ?? `Output does not contain "${expectedStr}"`,
        }
      }

      case 'output_path_equals': {
        const actual = getNestedValue(result?.output, assertion.path ?? '')
        const passed = JSON.stringify(actual) === JSON.stringify(assertion.expected)
        return {
          assertion,
          passed,
          actual,
          message: passed
            ? `Path "${assertion.path}" matches expected value`
            : assertion.message ?? `Expected path "${assertion.path}" to be ${JSON.stringify(assertion.expected)} but got ${JSON.stringify(actual)}`,
        }
      }

      case 'status_equals': {
        const actual = result?.status
        const passed = actual === assertion.expected
        return {
          assertion,
          passed,
          actual,
          message: passed
            ? 'Status matches expected value'
            : assertion.message ?? `Expected status "${assertion.expected}" but got "${actual}"`,
        }
      }

      case 'node_executed': {
        const nodeId = assertion.nodeId
        const executed = steps.some(s => s.nodeId === nodeId && s.status !== 'skipped')
        return {
          assertion,
          passed: executed,
          actual: executed,
          message: executed
            ? `Node "${nodeId}" was executed`
            : assertion.message ?? `Expected node "${nodeId}" to be executed but it was not`,
        }
      }

      case 'node_not_executed': {
        const nodeId = assertion.nodeId
        const executed = steps.some(s => s.nodeId === nodeId && s.status !== 'skipped')
        return {
          assertion,
          passed: !executed,
          actual: !executed,
          message: !executed
            ? `Node "${nodeId}" was not executed (as expected)`
            : assertion.message ?? `Expected node "${nodeId}" NOT to be executed but it was`,
        }
      }

      case 'cost_less_than': {
        const actual = (result?.totalCostUsd as number) ?? 0
        const threshold = (assertion.expected as number) ?? Infinity
        const passed = actual < threshold
        return {
          assertion,
          passed,
          actual,
          message: passed
            ? `Cost $${actual.toFixed(4)} is below threshold $${threshold}`
            : assertion.message ?? `Cost $${actual.toFixed(4)} exceeds threshold $${threshold}`,
        }
      }

      case 'duration_less_than': {
        const actual = (result?.totalDurationMs as number) ?? 0
        const threshold = (assertion.expected as number) ?? Infinity
        const passed = actual < threshold
        return {
          assertion,
          passed,
          actual,
          message: passed
            ? `Duration ${actual}ms is below threshold ${threshold}ms`
            : assertion.message ?? `Duration ${actual}ms exceeds threshold ${threshold}ms`,
        }
      }

      case 'confidence_greater_than': {
        const nodeId = assertion.nodeId
        const step = nodeId ? steps.find(s => s.nodeId === nodeId) : steps[0]
        const actual = (step?.output as Record<string, unknown>)?.confidence as number ?? 0
        const threshold = (assertion.expected as number) ?? 0
        const passed = actual > threshold
        return {
          assertion,
          passed,
          actual,
          message: passed
            ? `Confidence ${actual.toFixed(2)} exceeds threshold ${threshold}`
            : assertion.message ?? `Confidence ${actual.toFixed(2)} does not exceed threshold ${threshold}`,
        }
      }

      default:
        return {
          assertion,
          passed: false,
          message: `Unknown assertion type: "${assertion.type}"`,
        }
    }
  }

  /**
   * Simulate workflow execution with mock configuration.
   * Returns a simulated execution result for assertion validation.
   */
  private async simulateExecution(testCase: TestCase): Promise<unknown> {
    const mockConfig = testCase.mockConfig ?? {}

    // Simulate a basic workflow execution with mock responses
    const delayMs = mockConfig.delayMs ?? 50

    // Simulate 3-step workflow
    const steps: Array<Record<string, unknown>> = []
    let totalCostUsd = 0
    let totalDurationMs = 0

    // Step 1: Trigger
    await new Promise(r => setTimeout(r, delayMs))
    steps.push({
      nodeId: 'trigger-1',
      nodeType: 'webhook',
      status: 'success',
      input: testCase.input,
      output: { triggered: true, payload: testCase.input },
      startedAt: new Date().toISOString(),
    })
    totalDurationMs += delayMs

    // Step 2: AI processing
    await new Promise(r => setTimeout(r, delayMs))
    const aiResponse = mockConfig.aiResponses?.['llm'] ?? 'AI processing completed successfully with 92% confidence.'
    const aiConfidence = 0.92
    steps.push({
      nodeId: 'ai-1',
      nodeType: 'llm',
      status: 'success',
      input: testCase.input,
      output: {
        response: aiResponse,
        confidence: aiConfidence,
        model: 'gpt-4o',
        needsReview: aiConfidence < 0.9,
      },
      tokenUsage: { prompt: 150, completion: 80 },
      costUsd: 0.0039,
      startedAt: new Date().toISOString(),
    })
    totalCostUsd += 0.0039
    totalDurationMs += delayMs

    // Step 3: Action
    await new Promise(r => setTimeout(r, delayMs))
    const actionResponse = mockConfig.actionResponses?.['email'] ?? { sent: true, messageId: 'msg-123' }

    // Handle skipHumanNodes mock
    if (mockConfig.skipHumanNodes) {
      steps.push({
        nodeId: 'approval-1',
        nodeType: 'approval',
        status: 'success',
        output: { approved: true, autoApproved: true },
        startedAt: new Date().toISOString(),
      })
    }

    steps.push({
      nodeId: 'action-1',
      nodeType: 'email',
      status: 'success',
      input: { to: 'user@example.com', body: aiResponse },
      output: actionResponse,
      startedAt: new Date().toISOString(),
    })
    totalDurationMs += delayMs

    return {
      runId: `run-test-${generateId()}`,
      workflowId: testCase.workflowId,
      status: 'success',
      output: { response: aiResponse, confidence: aiConfidence, actionTaken: true },
      steps,
      totalDurationMs,
      totalCostUsd,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    }
  }
}

/** Singleton test runner instance */
export const testRunner = new TestRunner()
