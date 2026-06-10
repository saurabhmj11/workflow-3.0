// ─── Demo Data for Observability ─────────────────
// Seeds sample trace and log data for the UI demo.

import { tracer } from './tracer'
import { executionLogger } from './logger'

/** Generate demo traces and logs */
export function seedDemoObservabilityData(): void {
  // Create a few sample traces
  const workflows = ['wf-email-support', 'wf-lead-qualifier', 'wf-ticket-router']
  const nodeTypes = ['webhook', 'llm', 'classifier', 'condition', 'email', 'slack']

  for (let i = 0; i < 5; i++) {
    const workflowId = workflows[i % workflows.length] ?? 'wf-demo'
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

    const trace = tracer.startTrace(workflowId, runId)

    // Create spans for a typical workflow
    const rootSpan = tracer.startSpan(trace.id, 'workflow.execute', undefined, { workflowId })

    const triggerSpan = tracer.startSpan(trace.id, 'node.execute', rootSpan.id, {
      nodeId: 'trigger-1',
      nodeType: 'webhook',
      handler: 'webhook.receive',
    })
    tracer.endSpan(triggerSpan.id, 'ok')

    const aiSpan = tracer.startSpan(trace.id, 'node.execute', rootSpan.id, {
      nodeId: 'ai-1',
      nodeType: 'llm',
      handler: 'llm.complete',
      tokenUsage: { prompt: 120 + Math.floor(Math.random() * 200), completion: 60 + Math.floor(Math.random() * 120) },
      costUsd: Math.round((0.002 + Math.random() * 0.005) * 10000) / 10000,
    })
    tracer.endSpan(aiSpan.id, Math.random() > 0.15 ? 'ok' : 'error')

    const classifySpan = tracer.startSpan(trace.id, 'node.execute', rootSpan.id, {
      nodeId: 'classify-1',
      nodeType: 'classifier',
      handler: 'classifier.classify',
      tokenUsage: { prompt: 80, completion: 20 },
      costUsd: 0.001,
    })
    tracer.endSpan(classifySpan.id, 'ok')

    const actionSpan = tracer.startSpan(trace.id, 'node.execute', rootSpan.id, {
      nodeId: 'action-1',
      nodeType: i % 3 === 0 ? 'email' : 'slack',
      handler: i % 3 === 0 ? 'email.send' : 'slack.postMessage',
    })
    tracer.endSpan(actionSpan.id, 'ok')

    tracer.endSpan(rootSpan.id, 'ok')

    const status = Math.random() > 0.2 ? 'ok' as const : 'error' as const
    tracer.endTrace(trace.id, status)

    // Add some logs for each trace
    executionLogger.info(trace.id, 'Workflow execution started', {
      runId,
      workflowId,
      nodeType: 'webhook',
      nodeId: 'trigger-1',
    })

    executionLogger.info(trace.id, 'AI node processing input', {
      runId,
      workflowId,
      nodeType: 'llm',
      nodeId: 'ai-1',
    })

    if (Math.random() > 0.6) {
      executionLogger.warn(trace.id, 'AI confidence below threshold', {
        runId,
        workflowId,
        nodeType: 'classifier',
        nodeId: 'classify-1',
        data: { confidence: 0.72, threshold: 0.9 },
      })
    }

    if (status === 'error') {
      executionLogger.error(trace.id, 'Action node failed', {
        runId,
        workflowId,
        nodeType: 'email',
        nodeId: 'action-1',
        data: { error: 'SMTP connection timeout' },
      })
    }

    executionLogger.info(trace.id, 'Workflow execution completed', {
      runId,
      workflowId,
    })
  }

  // Add a few standalone debug logs
  executionLogger.debug('system', 'Observability system initialized')
  executionLogger.info('system', 'Demo data seeded successfully')
}
