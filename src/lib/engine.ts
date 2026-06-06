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
  try {
    const cat = getCategoryForType(node.type)
    const config = node.config ?? {}

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
            conditionMet = evaluateSimpleCondition(expression, config)
          } catch {
            conditionMet = false
          }
        } else {
          conditionMet = Math.random() > 0.4
        }
        return { output: { conditionMet, branch: conditionMet ? 'true' : 'false', input, expression } }
      }
      if (node.type === 'switch') {
        let matchedCase = 'default'
        const rawCases = config.cases

        try {
          if (Array.isArray(rawCases) && rawCases.length > 0) {
            for (const c of rawCases) {
              if (c && typeof c === 'object') {
                const caseExpr = (c as Record<string, unknown>).expression
                const caseLabel = (c as Record<string, unknown>).label
                if (typeof caseExpr === 'string' && evaluateSimpleCondition(caseExpr, config)) {
                  matchedCase = typeof caseLabel === 'string' ? caseLabel : String(caseExpr)
                  break
                }
              }
            }
          } else if (rawCases && typeof rawCases === 'object' && !Array.isArray(rawCases)) {
            for (const [caseName, caseExpr] of Object.entries(rawCases as Record<string, unknown>)) {
              if (typeof caseExpr === 'string' && evaluateSimpleCondition(caseExpr, config)) {
                matchedCase = caseName
                break
              }
            }
          } else {
            const inputHash = simpleHash(JSON.stringify(input))
            matchedCase = inputHash % 2 === 0 ? 'case1' : 'case2'
          }
        } catch {
          matchedCase = 'default'
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

      if (node.type === 'classifier') {
        const rawCategories = config.categories
        let categories: string[]
        if (Array.isArray(rawCategories)) {
          categories = rawCategories.map(String)
        } else if (typeof rawCategories === 'string' && rawCategories.length > 0) {
          categories = rawCategories.split(',').map((s: string) => s.trim()).filter(Boolean)
        } else {
          categories = ['positive', 'negative', 'neutral']
        }
        if (categories.length === 0) categories = ['positive', 'negative', 'neutral']

        const inputStr = JSON.stringify(input)
        const hash = simpleHash(inputStr)
        const category = categories[hash % categories.length] ?? categories[0] ?? 'unknown'
        const confidence = 70 + (hash % 30)
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
  } catch (err) {
    console.error(`[OpenWorkflow] Node runner error (${node.type}):`, err)
    return { output: { error: err instanceof Error ? err.message : 'Node execution failed', input } }
  }
}

// ─── Topological Executor ─────────────────────────

export async function executeWorkflow(
  workflowId: string,
  nodes: NodeDefinition[],
  edges: EdgeDefinition[],
  variables: Record<string, unknown> = {}
): Promise<void> {
  // Access stores — use .getState() for latest state each time to avoid stale closures
  let runId: string
  try {
    runId = useExecutionStore.getState().startRun(workflowId)
  } catch (err) {
    console.error('[OpenWorkflow] Failed to start run:', err)
    return
  }

  // Wrap entire execution in try/catch to prevent unhandled crashes
  try {
  // Yield to the main thread so React can process the isRunning state change
  // before we start flooding with updateStep calls
  await new Promise((r) => setTimeout(r, 50))

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
  const triggerNodes = nodes.filter((n) => {
    try {
      return getCategoryForType(n.type).category === 'trigger'
    } catch {
      return false
    }
  })
  if (triggerNodes.length === 0) {
    useExecutionStore.getState().completeRun(runId, { status: 'error', output: { error: 'No trigger node found' }, totalDurationMs: 0 })
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
    useExecutionStore.getState().updateStep(runId, stepRunning)

    // Yield to the main thread so React can process the state change
    // 100ms minimum between step updates to avoid overwhelming the renderer
    await new Promise((r) => setTimeout(r, 100))

    try {
      // Resolve template variables in the node's config before execution
      const resolutionContext: ResolutionContext = {
        nodeOutputs,
        input,
        variables: context.variables,
        config: node.config ?? {},
      }
      const resolvedConfig = resolveVariables(node.config ?? {}, resolutionContext) as Record<string, unknown>

      const result = await runNode({ ...node, config: resolvedConfig }, context, input, nodeOutputs)

      const stepDone: NodeExecutionStep = {
        ...stepRunning,
        finishedAt: new Date().toISOString(),
        output: result.output,
        status: 'success',
        tokenUsage: result.tokenUsage,
        costUsd: result.costUsd,
      }
      useExecutionStore.getState().updateStep(runId, stepDone)

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
        useApprovalStore.getState().addRequest(approval)
        useExecutionStore.getState().completeRun(runId, { status: 'awaiting_approval' })
        return
      }

      // Follow edges
      const nodeEdges = outEdges.get(node.id) ?? []
      for (const edge of nodeEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target)
        if (targetNode) {
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
      useExecutionStore.getState().updateStep(runId, stepError)
      useExecutionStore.getState().completeRun(runId, { status: 'error', output: { error: stepError.error }, totalDurationMs: 0 })
      return
    }
  }

  // Calculate totals — re-read store to get latest state
  const finalResult = useExecutionStore.getState().results.find((r) => r.runId === runId)
  const totalDuration = finalResult?.steps.reduce((acc, s) => {
    if (s.startedAt && s.finishedAt) return acc + (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime())
    return acc
  }, 0) ?? 0

  const totalCost = finalResult?.steps.reduce((acc, s) => acc + (s.costUsd ?? 0), 0) ?? 0

  useExecutionStore.getState().completeRun(runId, {
    status: 'success',
    totalDurationMs: totalDuration,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
  })

  } catch (err) {
    // Top-level catch for any unhandled error during execution
    console.error('[OpenWorkflow] Unhandled execution error:', err)
    try {
      useExecutionStore.getState().completeRun(runId, {
        status: 'error',
        output: { error: err instanceof Error ? err.message : 'Unknown execution error' },
        totalDurationMs: 0,
      })
    } catch {
      // Last resort — store might be in a bad state
    }
  }
}
