// ─── Demo Data for Testing Framework ─────────────
// Seeds sample test cases for the UI demo.

import { testRunner } from './framework'

/** Seed demo test cases */
export function seedDemoTestData(): void {
  // Only seed if no test cases exist
  if (testRunner.getTestCases().length > 0) return

  testRunner.createTestCase({
    name: 'Email Classification Test',
    description: 'Verifies that incoming support emails are classified correctly with high confidence',
    workflowId: 'wf-email-support',
    input: {
      email: 'customer@example.com',
      subject: 'Billing issue on March invoice',
      body: 'I noticed a $47.50 discrepancy on my March invoice. Please review.',
      priority: 'high',
    },
    assertions: [
      { type: 'status_equals', expected: 'success', message: 'Workflow should complete successfully' },
      { type: 'output_contains', expected: 'billing', message: 'Should classify as billing category' },
      { type: 'confidence_greater_than', expected: 0.8, message: 'Classification confidence should be above 80%' },
      { type: 'duration_less_than', expected: 5000, message: 'Should complete within 5 seconds' },
      { type: 'cost_less_than', expected: 0.01, message: 'Cost should be under $0.01' },
    ],
    mockConfig: {
      delayMs: 50,
      skipHumanNodes: true,
    },
    tags: ['smoke', 'classification', 'billing'],
  })

  testRunner.createTestCase({
    name: 'Lead Qualification Test',
    description: 'Ensures that leads with enterprise email domains are routed to the sales team',
    workflowId: 'wf-lead-qualifier',
    input: {
      leadEmail: 'cto@enterprise.com',
      companyName: 'Enterprise Corp',
      annualRevenue: 5000000,
      employeeCount: 500,
    },
    assertions: [
      { type: 'status_equals', expected: 'success', message: 'Should complete successfully for enterprise leads' },
      { type: 'node_executed', nodeId: 'ai-1', message: 'AI classifier should run' },
      { type: 'output_path_equals', path: 'response.confidence', expected: 0.92, message: 'Should have high confidence' },
    ],
    mockConfig: {
      delayMs: 30,
      aiResponses: { llm: 'Enterprise lead detected. Routing to sales team.' },
    },
    tags: ['integration', 'sales'],
  })

  testRunner.createTestCase({
    name: 'Error Handling Test',
    description: 'Validates that the workflow handles API errors gracefully with retries',
    workflowId: 'wf-ticket-router',
    input: {
      ticketId: 'TKT-12345',
      subject: 'Service outage in EU region',
      severity: 'critical',
    },
    assertions: [
      { type: 'status_equals', expected: 'success', message: 'Should recover from errors' },
      { type: 'cost_less_than', expected: 0.05, message: 'Retry cost should stay under budget' },
      { type: 'duration_less_than', expected: 10000, message: 'Should complete within 10s even with retries' },
    ],
    mockConfig: {
      delayMs: 100,
      skipHumanNodes: true,
    },
    tags: ['resilience', 'error-handling'],
  })
}
