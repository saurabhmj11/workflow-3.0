import type { NodeDefinition, EdgeDefinition, ExecutionContext, NodeExecutionStep, ExecutionResult, ApprovalRequest } from '@/lib/types'
import { getCategoryForType } from '@/lib/types'
import { useExecutionStore } from '@/stores/execution-store'
import { useApprovalStore } from '@/stores/approval-store'
import { resolveVariables, evaluateSimpleCondition, simpleHash, type NodeOutputStore, type ResolutionContext } from '@/lib/variable-resolver'

// ─── Simulated Node Runners ──────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const AI_RESPONSES: Record<string, string> = {
  llm: 'Generated response based on input context. The analysis indicates a positive trend with 87% confidence.',
  agent: 'Agent executed 3 tool calls: searched knowledge base, retrieved customer data, composed response. Task completed successfully.',
  rag: 'Retrieved 5 relevant documents from vector store. Synthesized answer with citations from sources [1][2][3].',
  classifier: 'Classification result: "urgent" (confidence: 94.2%). Category path: Support > Billing > Escalation Required.',
  summarizer: 'Summary: The customer reported a billing discrepancy of $47.50 on their March invoice. They requested a review and correction within 48 hours. Previous interactions suggest this is a recurring issue.',
}

const ACTION_RESPONSES: Record<string, string> = {
  crm: 'CRM record updated: Contact "john@example.com" status changed to "qualified". Deal value set to $12,000.',
  email: 'Email sent to "john@example.com" with subject "Your Request Has Been Processed". Delivery confirmed.',
  slack: 'Message posted to #support-queue: "New urgent ticket requires human review — billing discrepancy reported."',
  whatsapp: 'WhatsApp message delivered to +1-555-0142: "Your appointment has been confirmed for Thursday at 2:00 PM."',
  database: 'Database query executed: INSERT INTO tickets (status, priority, assignee) VALUES ("open", "high", "agent-1"). 1 row affected.',
}

async function runNode(
  node: NodeDefinition,
  _context: ExecutionContext,
  input: unknown,
  _nodeOutputs: NodeOutputStore
): Promise<{ output: unknown; tokenUsage?: { prompt: number; completion: number }; costUsd?: number }> {
  const cat = getCategoryForType(node.type)
  const config = node.config

  switch (cat.category) {
    case 'trigger':
      await delay(200 + Math.random() * 300)
      return { output: { triggered: true, source: node.type, payload: input } }

    case 'logic':
      await delay(100 + Math.random() * 200)
      if (node.type === 'condition') {
        const expression = config.expression as string | undefined
        let conditionMet = false

        if (expression) {
          try {
            // The expression has already been resolved by the variable engine,
            // so {{...}} patterns are replaced with actual values.
            // We pass the resolved config as the context for evaluation.
            conditionMet = evaluateSimpleCondition(expression, config)
          } catch {
            conditionMet = false
          }
        } else {
          conditionMet = Math.random() > 0.4 // fallback for no expression
        }
        return { output: { conditionMet, branch: conditionMet ? 'true' : 'false', input, expression } }
      }
      if (node.type === 'switch') {
        const expression = config.expression as string | undefined
        const cases = config.cases as Record<string, string> | undefined
        let matchedCase = 'default'

        if (expression && cases) {
          try {
            // Evaluate each case condition
            for (const [caseName, caseExpr] of Object.entries(cases)) {
              if (evaluateSimpleCondition(caseExpr, config)) {
                matchedCase = caseName
                break
              }
            }
          } catch {
            matchedCase = 'default'
          }
        } else {
          // Fallback: deterministic based on input hash
          const inputHash = simpleHash(JSON.stringify(input))
          const caseNames = cases ? Object.keys(cases) : ['default']
          matchedCase = caseNames[inputHash % caseNames.length] ?? 'default'
        }
        return { output: { matchedCase, input } }
      }
      if (node.type === 'delay') {
        await delay(1000)
        return { output: { delayed: true, input } }
      }
      if (node.type === 'retry') {
        return { output: { retried: true, attempt: 1, input } }
      }
      return { output: { logicResult: true, input } }

    case 'ai': {
      if (node.type === 'llm') {
        const resolvedConfig = config ?? {}
        const systemPrompt = (resolvedConfig.systemPrompt as string) || (resolvedConfig.prompt as string) || 'You are a helpful assistant.'
        const userMessage = typeof input === 'string' ? input : JSON.stringify(input)

        try {
          const res = await fetch('/api/ai/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
              model: (resolvedConfig.model as string) || 'gpt-4o',
              temperature: (resolvedConfig.temperature as number) ?? 0.7,
              maxTokens: (resolvedConfig.maxTokens as number) ?? 2048,
            }),
          })
          const json = await res.json()
          if (json.ok) {
            const promptTokens = json.data.usage?.prompt_tokens ?? 0
            const completionTokens = json.data.usage?.completion_tokens ?? 0
            const cost = promptTokens * 0.00001 + completionTokens * 0.00003
            return {
              output: { response: json.data.content, model: json.data.model, input },
              tokenUsage: { prompt: promptTokens, completion: completionTokens },
              costUsd: Math.round(cost * 10000) / 10000,
            }
          } else {
            // Fallback to simulated on API error
            await delay(800 + Math.random() * 1500)
            const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
            const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
            return {
              output: { response: AI_RESPONSES.llm, model: 'simulated', input, error: json.error },
              tokenUsage: tokens,
              costUsd: Math.round(cost * 10000) / 10000,
            }
          }
        } catch {
          // Fallback to simulated on network error
          await delay(800 + Math.random() * 1500)
          const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
          const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
          return {
            output: { response: AI_RESPONSES.llm, model: 'simulated', input },
            tokenUsage: tokens,
            costUsd: Math.round(cost * 10000) / 10000,
          }
        }
      }

      // Classifier: deterministic classification using input hash
      if (node.type === 'classifier') {
        const categories = (config.categories as string[]) ?? ['positive', 'negative', 'neutral']
        const inputStr = JSON.stringify(input)
        const hash = simpleHash(inputStr)
        const category = categories[hash % categories.length] ?? categories[0]!
        const confidence = 70 + (hash % 30) // 70-99%
        return {
          output: {
            classification: category,
            confidence,
            categoryPath: category,
            input,
          },
          tokenUsage: { prompt: 120, completion: 40 },
          costUsd: 0.0015,
        }
      }

      // For other AI types (agent, rag, summarizer), keep simulated for now.
      await delay(800 + Math.random() * 1500)
      const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
      const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
      return {
        output: { response: AI_RESPONSES[node.type] ?? 'AI processing complete.', model: 'gpt-4o', input },
        tokenUsage: tokens,
        costUsd: Math.round(cost * 10000) / 10000,
      }
    }

    case 'human':
      await delay(300)
      return { output: { awaitingHuman: true, type: node.type, input } }

    case 'action':
      await delay(400 + Math.random() * 600)
      return { output: { result: ACTION_RESPONSES[node.type] ?? 'Action completed.', input, ...config } }

    default:
      return { output: input }
  }
}

// ─── Topological Executor ─────────────────────────

export async function executeWorkflow(
  workflowId: string,
  nodes: NodeDefinition[],
  edges: EdgeDefinition[],
  variables: Record<string, unknown> = {}
): Promise<void> {
  const executionStore = useExecutionStore.getState()
  const approvalStore = useApprovalStore.getState()

  const runId = executionStore.startRun(workflowId)

  // Track outputs from each executed node for variable resolution
  const nodeOutputs: NodeOutputStore = {}

  const context: ExecutionContext = {
    workflowId,
    runId,
    variables,
    depth: 0,
    maxDepth: 10,
    triggeredBy: 'api',
    nodeOutputs,
  }

  // Find trigger nodes (entry points)
  const triggerNodes = nodes.filter((n) => getCategoryForType(n.type).category === 'trigger')
  if (triggerNodes.length === 0) {
    executionStore.completeRun(runId, { status: 'error', output: { error: 'No trigger node found' }, totalDurationMs: 0 })
    return
  }

  // Build adjacency list
  const outEdges = new Map<string, EdgeDefinition[]>()
  for (const edge of edges) {
    const list = outEdges.get(edge.source) ?? []
    list.push(edge)
    outEdges.set(edge.source, list)
  }

  // BFS execution
  const executed = new Set<string>()
  const queue: { node: NodeDefinition; input: unknown }[] = triggerNodes.map((n) => ({ node: n, input: variables }))

  while (queue.length > 0) {
    const { node, input } = queue.shift()!
    if (executed.has(node.id)) continue
    executed.add(node.id)

    const cat = getCategoryForType(node.type)

    // Mark as running
    const stepRunning: NodeExecutionStep = {
      nodeId: node.id,
      nodeType: node.type,
      label: node.label,
      startedAt: new Date().toISOString(),
      input,
      status: 'running',
    }
    executionStore.updateStep(runId, stepRunning)

    try {
      // Resolve template variables in the node's config before execution
      const resolutionContext: ResolutionContext = {
        nodeOutputs,
        input,
        variables: context.variables,
        config: node.config,
      }
      const resolvedConfig = resolveVariables(node.config, resolutionContext) as Record<string, unknown>

      const result = await runNode({ ...node, config: resolvedConfig }, context, input, nodeOutputs)

      const stepDone: NodeExecutionStep = {
        ...stepRunning,
        finishedAt: new Date().toISOString(),
        output: result.output,
        status: 'success',
        tokenUsage: result.tokenUsage,
        costUsd: result.costUsd,
      }
      executionStore.updateStep(runId, stepDone)

      // Store this node's output for variable resolution by subsequent nodes
      nodeOutputs[node.id] = result.output
      context.nodeOutputs = nodeOutputs

      // If human node, create approval request and pause
      if (cat.category === 'human') {
        const approval: ApprovalRequest = {
          id: `apr-${Date.now()}-${node.id}`,
          runId,
          nodeId: node.id,
          workflowId,
          status: 'pending',
          context: { input, nodeLabel: node.label, nodeType: node.type },
          createdAt: new Date().toISOString(),
          slaDeadline: new Date(Date.now() + 3600000).toISOString(),
        }
        approvalStore.addRequest(approval)
        executionStore.completeRun(runId, { status: 'awaiting_approval' })
        return
      }

      // Follow edges
      const nodeEdges = outEdges.get(node.id) ?? []
      for (const edge of nodeEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target)
        if (targetNode) {
          // For condition/approval nodes, only follow matching handle
          if (node.type === 'condition') {
            const conditionResult = result.output as { conditionMet: boolean }
            if (edge.sourceHandle === 'true' && conditionResult?.conditionMet) {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'false' && !conditionResult?.conditionMet) {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'default') {
              queue.push({ node: targetNode, input: result.output })
            }
          } else if (node.type === 'switch') {
            const switchResult = result.output as { matchedCase: string }
            if (edge.sourceHandle === switchResult?.matchedCase || edge.sourceHandle === 'default') {
              queue.push({ node: targetNode, input: result.output })
            }
          } else if (node.type === 'approval' || node.type === 'review') {
            const approvalResult = result.output as { awaitingHuman: boolean }
            if (edge.sourceHandle === 'approved' || edge.sourceHandle === 'default') {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'rejected') {
              // Skip rejected path in auto-simulation
            }
          } else {
            queue.push({ node: targetNode, input: result.output })
          }
        }
      }
    } catch (err) {
      const stepError: NodeExecutionStep = {
        ...stepRunning,
        finishedAt: new Date().toISOString(),
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      }
      executionStore.updateStep(runId, stepError)
      executionStore.completeRun(runId, { status: 'error', output: { error: stepError.error }, totalDurationMs: 0 })
      return
    }
  }

  // Calculate totals
  const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
  const totalDuration = result?.steps.reduce((acc, s) => {
    if (s.startedAt && s.finishedAt) return acc + (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime())
    return acc
  }, 0) ?? 0

  const totalCost = result?.steps.reduce((acc, s) => acc + (s.costUsd ?? 0), 0) ?? 0

  executionStore.completeRun(runId, {
    status: 'success',
    totalDurationMs: totalDuration,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
  })
}
