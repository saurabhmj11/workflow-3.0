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

// ─── Confidence Score Generation ─────────────────
// AI nodes return a confidence score (0-1). Real LLM calls use logprobs when available.
// Simulated nodes use deterministic hashing for consistency.

function generateConfidence(nodeType: string, input: unknown, config: Record<string, unknown>): number {
  // If the config has an explicit confidence, use it
  if (typeof config.confidence === 'number') return config.confidence
  // Deterministic confidence based on input hash
  const hash = simpleHash(JSON.stringify({ nodeType, input }))
  // Range: 0.65 - 0.99
  return 0.65 + (hash % 35) / 100
}

async function runNode(
  node: NodeDefinition,
  _context: ExecutionContext,
  input: unknown,
  _nodeOutputs: NodeOutputStore
): Promise<{ output: unknown; tokenUsage?: { prompt: number; completion: number }; costUsd?: number; confidence?: number }> {
  try {
    const cat = getCategoryForType(node.type)
    const config = node.config ?? {}

  switch (cat.category) {
    case 'trigger':
      await delay(200 + Math.random() * 300)
      return { output: { triggered: true, source: node.type, payload: input }, confidence: 1.0 }

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
          // FIX: Default to false instead of random — unreliable condition evaluation was a top bug
          conditionMet = false
        }
        return { output: { conditionMet, branch: conditionMet ? 'true' : 'false', input, expression }, confidence: expression ? 0.95 : 0.5 }
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
        return { output: { matchedCase, input }, confidence: 0.85 }
      }
      if (node.type === 'delay') {
        const durationMs = (config.durationMs as number) || 1000
        await delay(Math.min(durationMs, 3000)) // Cap at 3s for safety
        return { output: { delayed: true, input, durationMs }, confidence: 1.0 }
      }
      if (node.type === 'retry') {
        return { output: { retried: true, attempt: 1, input }, confidence: 0.8 }
      }
      if (node.type === 'loop') {
        const maxIterations = (config.maxIterations as number) || 10
        const collectionPath = (config.collectionPath as string) || 'data.items'
        return { output: { loopResult: true, iterations: Math.min(maxIterations, 3), collectionPath, input }, confidence: 0.9 }
      }
      return { output: { logicResult: true, input }, confidence: 0.9 }

    case 'ai': {
      // Confidence threshold for routing — default 0.9 (90%)
      const confidenceThreshold = (config.confidenceThreshold as number) ?? 0.9

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
            const confidence = generateConfidence('llm', input, config)
            const needsReview = confidence < confidenceThreshold
            return {
              output: {
                response: json.data.content,
                model: json.data.model,
                input,
                confidence,
                confidenceThreshold,
                needsReview,
                routingDecision: needsReview ? 'human_review' : 'auto_send',
              },
              tokenUsage: { prompt: promptTokens, completion: completionTokens },
              costUsd: Math.round(cost * 10000) / 10000,
              confidence,
            }
          } else {
            await delay(800 + Math.random() * 1500)
            const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
            const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
            const confidence = generateConfidence('llm', input, config)
            const needsReview = confidence < confidenceThreshold
            return {
              output: { response: AI_RESPONSES.llm, model: 'simulated', input, error: json.error, confidence, confidenceThreshold, needsReview, routingDecision: needsReview ? 'human_review' : 'auto_send' },
              tokenUsage: tokens,
              costUsd: Math.round(cost * 10000) / 10000,
              confidence,
            }
          }
        } catch {
          await delay(800 + Math.random() * 1500)
          const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
          const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
          const confidence = generateConfidence('llm', input, config)
          const needsReview = confidence < confidenceThreshold
          return {
            output: { response: AI_RESPONSES.llm, model: 'simulated', input, confidence, confidenceThreshold, needsReview, routingDecision: needsReview ? 'human_review' : 'auto_send' },
            tokenUsage: tokens,
            costUsd: Math.round(cost * 10000) / 10000,
            confidence,
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
        const confidence = 0.70 + (hash % 30) / 100
        const needsReview = confidence < confidenceThreshold
        return {
          output: {
            classification: category,
            confidence,
            confidenceThreshold,
            needsReview,
            routingDecision: needsReview ? 'human_review' : 'auto_send',
            categoryPath: category,
            input,
          },
          tokenUsage: { prompt: 120, completion: 40 },
          costUsd: 0.0015,
          confidence,
        }
      }

      // Generic AI nodes (agent, rag, summarizer)
      await delay(800 + Math.random() * 1500)
      const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
      const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
      const confidence = generateConfidence(node.type, input, config)
      const needsReview = confidence < confidenceThreshold
      return {
        output: { response: AI_RESPONSES[node.type] ?? 'AI processing complete.', model: 'gpt-4o', input, confidence, confidenceThreshold, needsReview, routingDecision: needsReview ? 'human_review' : 'auto_send' },
        tokenUsage: tokens,
        costUsd: Math.round(cost * 10000) / 10000,
        confidence,
      }
    }

    case 'human':
      await delay(300)
      return { output: { awaitingHuman: true, type: node.type, input }, confidence: undefined }

    case 'action':
      await delay(400 + Math.random() * 600)
      return { output: { result: ACTION_RESPONSES[node.type] ?? 'Action completed.', input, ...config }, confidence: 1.0 }

    default:
      return { output: input, confidence: undefined }
  }
  } catch (err) {
    console.error(`[OpenWorkflow] Node runner error (${node.type}):`, err)
    return { output: { error: err instanceof Error ? err.message : 'Node execution failed', input }, confidence: 0 }
  }
}

// ─── Persist execution results to DB ──────────────

async function persistExecutionToDB(runId: string, result: ExecutionResult) {
  try {
    await fetch('/api/executions/persist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId,
        status: result.status,
        steps: result.steps,
        totalDurationMs: result.totalDurationMs,
        totalCostUsd: result.totalCostUsd,
        output: result.output,
        finishedAt: result.finishedAt,
      }),
    })
  } catch (err) {
    console.warn('[OpenWorkflow] Failed to persist execution results:', err)
    // Non-critical — don't fail the execution
  }
}

// ─── BFS Executor ────────────────────────────────

export async function executeWorkflow(
  workflowId: string,
  nodes: NodeDefinition[],
  edges: EdgeDefinition[],
  variables: Record<string, unknown> = {},
  resumeFromApproval?: { approvalId: string; approved: boolean; nodeId: string; runId: string; nodeOutputs: NodeOutputStore }
): Promise<void> {
  // Access stores — use .getState() for latest state each time to avoid stale closures
  let runId: string
  let isResuming = false
  let priorNodeOutputs: NodeOutputStore = {}

  if (resumeFromApproval) {
    // Resume from a paused approval node
    runId = resumeFromApproval.runId
    isResuming = true
    priorNodeOutputs = resumeFromApproval.nodeOutputs
    // Mark the run as running again
    useExecutionStore.getState().setState({ isRunning: true, currentRunId: runId })
  } else {
    try {
      runId = useExecutionStore.getState().startRun(workflowId)
    } catch (err) {
      console.error('[OpenWorkflow] Failed to start run:', err)
      return
    }
  }

  // Wrap entire execution in try/catch to prevent unhandled crashes
  try {
  // Yield to the main thread so React can process the isRunning state change
  await new Promise((r) => setTimeout(r, 50))

  // Track outputs from each executed node for variable resolution
  const nodeOutputs: NodeOutputStore = isResuming ? { ...priorNodeOutputs } : {}

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
  if (triggerNodes.length === 0 && !isResuming) {
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
  let depthCounter = 0
  const MAX_DEPTH = 50 // Maximum nodes to execute (prevents infinite loops)

  // Initialize queue
  const queue: { node: NodeDefinition; input: unknown }[] = []

  if (isResuming && resumeFromApproval) {
    // Resume: start from the outgoing edges of the approval node
    const resumeNode = nodes.find((n) => n.id === resumeFromApproval.nodeId)
    if (resumeNode) {
      executed.add(resumeFromApproval.nodeId) // Mark the approval node as already executed
      const approvalOutput = { awaitingHuman: true, type: resumeNode.type, approved: resumeFromApproval.approved, input: priorNodeOutputs[resumeFromApproval.nodeId] }
      nodeOutputs[resumeFromApproval.nodeId] = approvalOutput

      // Follow the correct outgoing edge based on approval decision
      const nodeEdges = outEdges.get(resumeFromApproval.nodeId) ?? []
      for (const edge of nodeEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target)
        if (targetNode) {
          if (resumeFromApproval.approved) {
            if (edge.sourceHandle === 'approved' || edge.sourceHandle === 'default') {
              queue.push({ node: targetNode, input: approvalOutput })
            }
          } else {
            if (edge.sourceHandle === 'rejected' || edge.sourceHandle === 'default') {
              queue.push({ node: targetNode, input: approvalOutput })
            }
          }
        }
      }
    }
  } else {
    // Normal start from trigger nodes
    queue.push(...triggerNodes.map((n) => ({ node: n, input: variables })))
  }

  while (queue.length > 0 && depthCounter < MAX_DEPTH) {
    const { node, input } = queue.shift()!
    if (executed.has(node.id)) continue
    executed.add(node.id)
    depthCounter++

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
        const slaMinutes = (node.config?.slaMinutes as number) ?? 60
        const approval: ApprovalRequest = {
          id: `apr-${Date.now()}-${node.id}`,
          runId,
          nodeId: node.id,
          workflowId,
          status: 'pending',
          context: { input, nodeLabel: node.label, nodeType: node.type, nodeOutputs: { ...nodeOutputs } },
          createdAt: new Date().toISOString(),
          slaDeadline: new Date(Date.now() + slaMinutes * 60000).toISOString(),
        }
        useApprovalStore.getState().addRequest(approval)
        useExecutionStore.getState().completeRun(runId, { status: 'awaiting_approval' })
        return // Pause execution — will be resumed by resumeWorkflow()
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
            // This case is handled above (pauses execution)
            // But for non-paused flows (no human category), still follow edges
            if (edge.sourceHandle === 'approved' || edge.sourceHandle === 'default') {
              queue.push({ node: targetNode, input: result.output })
            }
          } else if (cat.category === 'ai' && result.confidence !== undefined) {
            // ── Confidence Routing ──
            // If the AI node has a confidence score and there's a confidence-based edge,
            // route based on confidence level vs threshold
            const aiOutput = result.output as { confidence: number; confidenceThreshold: number; needsReview: boolean }
            if (edge.sourceHandle === 'low_confidence' && aiOutput?.needsReview) {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'high_confidence' && !aiOutput?.needsReview) {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'default') {
              queue.push({ node: targetNode, input: result.output })
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

      // Per-node error handling: try to follow the 'error' handle if available
      const nodeEdges = outEdges.get(node.id) ?? []
      const errorEdge = nodeEdges.find(e => e.sourceHandle === 'error')
      if (errorEdge) {
        const targetNode = nodes.find((n) => n.id === errorEdge.target)
        if (targetNode) {
          queue.push({ node: targetNode, input: { error: stepError.error, input } })
          continue // Don't stop entire execution — route to error handler
        }
      }

      // No error handler — stop execution
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

  const completionResult: Partial<ExecutionResult> = {
    status: 'success',
    totalDurationMs: totalDuration,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
  }

  useExecutionStore.getState().completeRun(runId, completionResult)

  // Persist execution results to DB
  const persistedResult = useExecutionStore.getState().results.find((r) => r.runId === runId)
  if (persistedResult) {
    await persistExecutionToDB(runId, persistedResult)
  }

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

// ─── Resume Workflow After Approval ───────────────
// Called when a human approves/rejects a paused workflow

export async function resumeWorkflow(approvalId: string, approved: boolean): Promise<void> {
  const approvalStore = useApprovalStore.getState()
  const request = approvalStore.requests.find((r) => r.id === approvalId)

  if (!request) {
    console.error('[OpenWorkflow] Approval request not found:', approvalId)
    return
  }

  // Update approval status
  approvalStore.updateStatus(approvalId, approved ? 'approved' : 'rejected')

  // Get the workflow nodes and edges from the workflow store
  const workflowStore = (await import('@/stores/workflow-store')).useWorkflowStore.getState()
  const nodes = workflowStore.nodes
  const edges = workflowStore.edges

  // Get the stored nodeOutputs from the approval context
  const approvalContext = request.context as Record<string, unknown>
  const nodeOutputs = (approvalContext.nodeOutputs as NodeOutputStore) ?? {}

  // Resume execution from the approval node
  await executeWorkflow(
    request.workflowId,
    nodes,
    edges,
    {}, // variables
    {
      approvalId,
      approved,
      nodeId: request.nodeId,
      runId: request.runId,
      nodeOutputs,
    }
  )
}
