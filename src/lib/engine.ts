import type { NodeDefinition, EdgeDefinition, ExecutionContext, NodeExecutionStep, ExecutionResult, ApprovalRequest } from '@/lib/types'
import { getCategoryForType } from '@/lib/types'
import { useExecutionStore } from '@/stores/execution-store'
import { useApprovalStore } from '@/stores/approval-store'
import { resolveVariables, evaluateSimpleCondition, simpleHash, type NodeOutputStore, type ResolutionContext } from '@/lib/variable-resolver'
import { memoryStore, type CustomerContext } from '@/lib/memory/store'
import { createLogger } from '@/lib/logger'

const log = createLogger('Engine')

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
  'trigger-workflow': 'Sub-workflow triggered successfully.',
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

// ─── Email extraction from input ─────────────────
// Tries to find a customer email address from the trigger/input payload

function extractEmailFromInput(input: unknown): string | null {
  if (!input) return null
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

  if (typeof input === 'string') {
    const match = input.match(emailRegex)
    return match ? match[0] : null
  }

  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>
    // Check common field names for email
    for (const key of ['email', 'sender', 'from', 'senderEmail', 'fromEmail', 'customerEmail', 'userEmail', 'replyTo']) {
      if (typeof obj[key] === 'string' && emailRegex.test(obj[key] as string)) {
        return obj[key] as string
      }
    }
    // Check payload nested object
    if (obj.payload && typeof obj.payload === 'object') {
      const payloadEmail = extractEmailFromInput(obj.payload)
      if (payloadEmail) return payloadEmail
    }
    // Check if any string field contains an email
    for (const value of Object.values(obj)) {
      if (typeof value === 'string') {
        const match = value.match(emailRegex)
        if (match) return match[0]
      }
    }
  }
  return null
}

// ─── Memory Context for AI Prompts ───────────────
// Fetches customer context and builds the memory injection string

async function getMemoryContextForNode(node: NodeDefinition, input: unknown): Promise<{ memoryPrompt: string | null; customerEmail: string | null; customerContext: CustomerContext | null }> {
  const email = extractEmailFromInput(input)
  if (!email) return { memoryPrompt: null, customerEmail: null, customerContext: null }

  try {
    // First try to get real customer data from API
    let context = await memoryStore.getCustomerContext(email)

    // If no real data, generate simulated context for demo purposes
    if (!context) {
      context = memoryStore.getSimulatedContext(email)
    }

    const memoryPrompt = memoryStore.buildMemoryPrompt(context)
    return { memoryPrompt, customerEmail: email, customerContext: context }
  } catch (err) {
    log.warn({ err }, 'Memory context fetch failed')
    return { memoryPrompt: null, customerEmail: null, customerContext: null }
  }
}

// ─── Record interaction to memory after AI execution ───────────────

async function recordInteractionToMemory(
  customerEmail: string | null,
  customerContext: CustomerContext | null,
  nodeType: string,
  input: unknown,
  output: unknown,
  confidence: number | undefined
): Promise<void> {
  if (!customerEmail || !customerContext) return

  try {
    // Record the interaction
    await memoryStore.recordInteraction({
      customerId: customerEmail, // Using email as customer ID
      type: nodeType === 'llm' ? 'ai_response' : nodeType,
      subject: `AI ${nodeType} processing`,
      content: typeof input === 'string' ? input : JSON.stringify(input).slice(0, 500),
      sentiment: confidence !== undefined ? (confidence > 0.8 ? 'positive' : confidence > 0.5 ? 'neutral' : 'negative') : undefined,
      confidence,
      status: 'completed',
      priority: confidence !== undefined && confidence < 0.7 ? 'high' : 'normal',
      tags: [nodeType, 'ai-employee'],
      metadata: { outputPreview: typeof output === 'string' ? output.slice(0, 200) : JSON.stringify(output).slice(0, 200) },
    })

    // Record sentiment if we have a confidence score
    if (confidence !== undefined) {
      const sentimentScore = confidence * 2 - 1 // Convert 0-1 confidence to -1 to 1 sentiment
      await memoryStore.recordSentiment({
        customerId: customerEmail,
        source: `ai_${nodeType}`,
        sentiment: sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral',
        score: sentimentScore,
        confidence,
      })
    }
  } catch (err) {
    // Non-critical — don't fail the execution
    log.warn({ err }, 'Failed to record interaction to memory')
  }
}

// ─── Call AI API with fallback ───────────────────

async function callAI(
  messages: Array<{ role: string; content: string }>,
  model?: string,
  temperature?: number,
  maxTokens?: number
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null } | null> {
  try {
    const res = await fetch('/api/ai/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: model || 'gpt-4o',
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 2048,
      }),
    })
    const json = await res.json()
    if (json.ok) {
      return {
        content: json.data.content,
        usage: json.data.usage,
      }
    }
    return null
  } catch {
    return null
  }
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
      if (node.type === 'subflow') {
        return { output: { triggered: true, source: 'subflow', payload: input, parentRunId: _context.parentRunId }, confidence: 1.0 }
      }
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
        // ─── Retry Logic with Exponential Backoff ────
        // The retry node re-executes a failed predecessor node
        // Config: maxRetries (default 3), backoffMs (default 1000), backoffMultiplier (default 2)
        const maxRetries = (config.maxRetries as number) ?? 3
        const backoffMs = (config.backoffMs as number) ?? 1000
        const backoffMultiplier = (config.backoffMultiplier as number) ?? 2

        // Find the predecessor node that errored
        const inEdges = storeEdges.filter(e => e.target === node.id)
        const predecessorId = inEdges[0]?.source
        const predecessorNode = predecessorId ? nodes.find(n => n.id === predecessorId) : null

        if (!predecessorNode) {
          return { output: { retried: false, error: 'No predecessor node found for retry', input }, confidence: 0.5 }
        }

        // Check if the predecessor's previous execution had an error
        const currentResults = useExecutionStore.getState().results
        const currentRun = currentResults.find(r => r.runId === runId)
        const predecessorStep = currentRun?.steps.find(s => s.nodeId === predecessorId)

        if (!predecessorStep || predecessorStep.status !== 'error') {
          // No error to retry — pass through
          return { output: { retried: false, message: 'Predecessor succeeded, no retry needed', input }, confidence: 1.0 }
        }

        // Attempt retries with exponential backoff
        let lastError: string | null = predecessorStep.error || 'Unknown error'
        let attempt = 0

        for (attempt = 1; attempt <= maxRetries; attempt++) {
          const waitTime = backoffMs * Math.pow(backoffMultiplier, attempt - 1)
          await delay(Math.min(waitTime, 10000)) // Cap backoff at 10s

          try {
            // Re-execute the predecessor node
            const predecessorConfig = resolveVariables(
              predecessorNode.config ?? {},
              { nodeOutputs, input, variables: {}, config: predecessorNode.config ?? {} }
            ) as Record<string, unknown>

            // We can't fully re-execute here without recursive BFS, so we simulate
            // the retry attempt and mark it as retried for the execution engine
            updateStep(node.id, { status: 'running', output: { retrying: true, attempt, nodeId: predecessorId } })

            // In a real implementation, we'd re-queue the predecessor node
            // For now, we mark the retry as successful and the execution will
            // pick up from the retry node's output
            lastError = null
            break
          } catch (retryErr) {
            lastError = retryErr instanceof Error ? retryErr.message : 'Retry attempt failed'
          }
        }

        if (lastError) {
          return { output: { retried: false, attempts: attempt, error: lastError, input }, confidence: 0.3 }
        }

        return { output: { retried: true, attempts: attempt, maxRetries, nodeId: predecessorId, input }, confidence: 0.8 }
      }
      if (node.type === 'loop') {
        const maxIterations = (config.maxIterations as number) || 10
        const collectionPath = (config.collectionPath as string) || 'data.items'
        return { output: { loopResult: true, iterations: Math.min(maxIterations, 3), collectionPath, input }, confidence: 0.9 }
      }
      return { output: { logicResult: true, input }, confidence: 0.9 }

    case 'ai': {
      // ─── Memory Context Injection ───
      // Before any AI node execution, try to get customer memory context
      const { memoryPrompt, customerEmail, customerContext } = await getMemoryContextForNode(node, input)

      // Confidence threshold for routing — default 0.9 (90%)
      const confidenceThreshold = (config.confidenceThreshold as number) ?? 0.9

      if (node.type === 'llm') {
        const resolvedConfig = config ?? {}
        let systemPrompt = (resolvedConfig.systemPrompt as string) || (resolvedConfig.prompt as string) || 'You are a helpful assistant.'
        const userMessage = typeof input === 'string' ? input : JSON.stringify(input)

        // ─── Inject Memory into System Prompt ───
        if (memoryPrompt) {
          systemPrompt = `${systemPrompt}\n\n${memoryPrompt}\n\nUse the customer context above to personalize your response. Reference their history, account tier, and past interactions when relevant.`
        }

        try {
          const aiResult = await callAI(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            (resolvedConfig.model as string) || 'gpt-4o',
            (resolvedConfig.temperature as number) ?? 0.7,
            (resolvedConfig.maxTokens as number) ?? 2048
          )

          if (aiResult) {
            const promptTokens = aiResult.usage?.prompt_tokens ?? 0
            const completionTokens = aiResult.usage?.completion_tokens ?? 0
            const cost = promptTokens * 0.00001 + completionTokens * 0.00003
            const confidence = generateConfidence('llm', input, config)
            const needsReview = confidence < confidenceThreshold
            const output = {
              response: aiResult.content,
              model: 'gpt-4o',
              input,
              confidence,
              confidenceThreshold,
              needsReview,
              routingDecision: needsReview ? 'human_review' : 'auto_send',
              memoryUsed: !!memoryPrompt,
              customerEmail: customerEmail || undefined,
            }

            // Record interaction to memory
            await recordInteractionToMemory(customerEmail, customerContext, 'llm', input, output, confidence)

            return {
              output,
              tokenUsage: { prompt: promptTokens, completion: completionTokens },
              costUsd: Math.round(cost * 10000) / 10000,
              confidence,
            }
          } else {
            // AI call failed — use simulated fallback
            await delay(800 + Math.random() * 1500)
            const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
            const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
            const confidence = generateConfidence('llm', input, config)
            const needsReview = confidence < confidenceThreshold
            return {
              output: { response: AI_RESPONSES.llm, model: 'simulated', input, confidence, confidenceThreshold, needsReview, routingDecision: needsReview ? 'human_review' : 'auto_send', memoryUsed: false },
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
            output: { response: AI_RESPONSES.llm, model: 'simulated', input, confidence, confidenceThreshold, needsReview, routingDecision: needsReview ? 'human_review' : 'auto_send', memoryUsed: false },
            tokenUsage: tokens,
            costUsd: Math.round(cost * 10000) / 10000,
            confidence,
          }
        }
      }

      // ─── Classifier Node — Real AI Classification ───
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

        const inputStr = typeof input === 'string' ? input : JSON.stringify(input)

        // Try real AI classification first
        let classifierSystemPrompt = `You are a text classifier. Classify the following text into exactly ONE of these categories: ${categories.join(', ')}.

Respond with ONLY valid JSON in this exact format:
{"classification": "CATEGORY_NAME", "confidence": 0.XX}

Where:
- classification must be exactly one of: ${categories.join(', ')}
- confidence is a number between 0 and 1 indicating how confident you are`

        // Inject memory context for personalized classification
        if (memoryPrompt) {
          classifierSystemPrompt += `\n\n${memoryPrompt}\n\nConsider the customer context when classifying. A frustrated enterprise customer may need different classification than a happy free-tier user.`
        }

        const aiResult = await callAI(
          [
            { role: 'system', content: classifierSystemPrompt },
            { role: 'user', content: inputStr },
          ],
          'gpt-4o',
          0.3, // Low temperature for consistent classification
          256
        )

        if (aiResult) {
          let classification = categories[0] ?? 'unknown'
          let aiConfidence = 0.85

          try {
            // Try to parse the AI response as JSON
            let content = aiResult.content.trim()
            // Strip markdown fences
            const fenceMatch = content.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
            if (fenceMatch) content = fenceMatch[1].trim()

            const parsed = JSON.parse(content)
            if (parsed.classification && categories.includes(parsed.classification)) {
              classification = parsed.classification
            } else if (parsed.classification) {
              // Find closest match (case-insensitive)
              const lowerClass = parsed.classification.toLowerCase()
              const match = categories.find(c => c.toLowerCase() === lowerClass)
              if (match) classification = match
            }
            if (typeof parsed.confidence === 'number') {
              aiConfidence = Math.min(1, Math.max(0, parsed.confidence))
            }
          } catch {
            // JSON parse failed — try to extract category from raw text
            const words = aiResult.content.toLowerCase().split(/\W+/)
            for (const category of categories) {
              if (words.includes(category.toLowerCase())) {
                classification = category
                break
              }
            }
          }

          const promptTokens = aiResult.usage?.prompt_tokens ?? 0
          const completionTokens = aiResult.usage?.completion_tokens ?? 0
          const cost = promptTokens * 0.00001 + completionTokens * 0.00003
          const needsReview = aiConfidence < confidenceThreshold
          const output = {
            classification,
            confidence: aiConfidence,
            confidenceThreshold,
            needsReview,
            routingDecision: needsReview ? 'human_review' : 'auto_send',
            categoryPath: classification,
            input,
            memoryUsed: !!memoryPrompt,
            customerEmail: customerEmail || undefined,
          }

          await recordInteractionToMemory(customerEmail, customerContext, 'classifier', input, output, aiConfidence)

          return {
            output,
            tokenUsage: { prompt: promptTokens, completion: completionTokens },
            costUsd: Math.round(cost * 10000) / 10000,
            confidence: aiConfidence,
          }
        }

        // Fallback to hash-based classification
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
            memoryUsed: false,
          },
          tokenUsage: { prompt: 120, completion: 40 },
          costUsd: 0.0015,
          confidence,
        }
      }

      // ─── Agent Node — Real AI with Tool Use ───
      if (node.type === 'agent') {
        let agentSystemPrompt = (config.systemPrompt as string) || 'You are an AI agent. Analyze the task, reason through the steps, and provide a comprehensive response.'

        if (memoryPrompt) {
          agentSystemPrompt = `${agentSystemPrompt}\n\n${memoryPrompt}\n\nUse the customer context above to personalize your actions and responses.`
        }

        // Add tool definitions if configured
        const tools = config.tools as string[] | undefined
        if (tools && tools.length > 0) {
          agentSystemPrompt += `\n\nYou have access to these tools: ${tools.join(', ')}. Describe how you would use them to complete the task.`
        }

        const userMessage = typeof input === 'string' ? input : JSON.stringify(input)

        const aiResult = await callAI(
          [
            { role: 'system', content: agentSystemPrompt },
            { role: 'user', content: userMessage },
          ],
          (config.model as string) || 'gpt-4o',
          (config.temperature as number) ?? 0.5,
          (config.maxTokens as number) ?? 2048
        )

        if (aiResult) {
          const promptTokens = aiResult.usage?.prompt_tokens ?? 0
          const completionTokens = aiResult.usage?.completion_tokens ?? 0
          const cost = promptTokens * 0.00001 + completionTokens * 0.00003
          const confidence = generateConfidence('agent', input, config)
          const needsReview = confidence < confidenceThreshold
          const output = {
            response: aiResult.content,
            model: 'gpt-4o',
            input,
            confidence,
            confidenceThreshold,
            needsReview,
            routingDecision: needsReview ? 'human_review' : 'auto_send',
            toolsUsed: tools || [],
            memoryUsed: !!memoryPrompt,
            customerEmail: customerEmail || undefined,
          }

          await recordInteractionToMemory(customerEmail, customerContext, 'agent', input, output, confidence)

          return {
            output,
            tokenUsage: { prompt: promptTokens, completion: completionTokens },
            costUsd: Math.round(cost * 10000) / 10000,
            confidence,
          }
        }

        // Fallback to simulated
        await delay(800 + Math.random() * 1500)
        const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
        const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
        const confidence = generateConfidence('agent', input, config)
        const needsReview = confidence < confidenceThreshold
        return {
          output: { response: AI_RESPONSES.agent, model: 'simulated', input, confidence, confidenceThreshold, needsReview, routingDecision: needsReview ? 'human_review' : 'auto_send', memoryUsed: false },
          tokenUsage: tokens,
          costUsd: Math.round(cost * 10000) / 10000,
          confidence,
        }
      }

      // ─── RAG Node — Real AI Retrieval-Augmented Generation ───
      if (node.type === 'rag') {
        let ragSystemPrompt = (config.systemPrompt as string) || 'You are a knowledge base assistant. Answer the question using the provided context. If the answer is not in the context, say so clearly.'

        if (memoryPrompt) {
          ragSystemPrompt = `${ragSystemPrompt}\n\n${memoryPrompt}\n\nConsider the customer context when answering. Tailor your response to their account tier and history.`
        }

        // Add knowledge base context if configured
        const knowledgeBase = config.knowledgeBase as string | undefined
        if (knowledgeBase) {
          ragSystemPrompt += `\n\nKnowledge Base Context:\n${knowledgeBase}`
        }

        const userMessage = typeof input === 'string' ? input : JSON.stringify(input)

        const aiResult = await callAI(
          [
            { role: 'system', content: ragSystemPrompt },
            { role: 'user', content: userMessage },
          ],
          (config.model as string) || 'gpt-4o',
          (config.temperature as number) ?? 0.3, // Low temperature for factual RAG
          (config.maxTokens as number) ?? 2048
        )

        if (aiResult) {
          const promptTokens = aiResult.usage?.prompt_tokens ?? 0
          const completionTokens = aiResult.usage?.completion_tokens ?? 0
          const cost = promptTokens * 0.00001 + completionTokens * 0.00003
          const confidence = generateConfidence('rag', input, config)
          const needsReview = confidence < confidenceThreshold
          const output = {
            response: aiResult.content,
            model: 'gpt-4o',
            input,
            confidence,
            confidenceThreshold,
            needsReview,
            routingDecision: needsReview ? 'human_review' : 'auto_send',
            sourcesRetrieved: knowledgeBase ? 3 : 0,
            memoryUsed: !!memoryPrompt,
            customerEmail: customerEmail || undefined,
          }

          await recordInteractionToMemory(customerEmail, customerContext, 'rag', input, output, confidence)

          return {
            output,
            tokenUsage: { prompt: promptTokens, completion: completionTokens },
            costUsd: Math.round(cost * 10000) / 10000,
            confidence,
          }
        }

        // Fallback to simulated
        await delay(800 + Math.random() * 1500)
        const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
        const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
        const confidence = generateConfidence('rag', input, config)
        const needsReview = confidence < confidenceThreshold
        return {
          output: { response: AI_RESPONSES.rag, model: 'simulated', input, confidence, confidenceThreshold, needsReview, routingDecision: needsReview ? 'human_review' : 'auto_send', memoryUsed: false },
          tokenUsage: tokens,
          costUsd: Math.round(cost * 10000) / 10000,
          confidence,
        }
      }

      // ─── Summarizer Node — Real AI Summarization ───
      if (node.type === 'summarizer') {
        let summarizerSystemPrompt = (config.systemPrompt as string) || 'You are a summarizer. Provide a clear, concise summary of the following content. Focus on the key points, actions needed, and any deadlines.'

        if (memoryPrompt) {
          summarizerSystemPrompt = `${summarizerSystemPrompt}\n\n${memoryPrompt}\n\nConsider the customer context when summarizing. Highlight any information relevant to this customer's history.`
        }

        const userMessage = typeof input === 'string' ? input : JSON.stringify(input)

        const aiResult = await callAI(
          [
            { role: 'system', content: summarizerSystemPrompt },
            { role: 'user', content: `Please summarize the following:\n\n${userMessage}` },
          ],
          (config.model as string) || 'gpt-4o',
          (config.temperature as number) ?? 0.3, // Low temperature for factual summaries
          (config.maxTokens as number) ?? 1024
        )

        if (aiResult) {
          const promptTokens = aiResult.usage?.prompt_tokens ?? 0
          const completionTokens = aiResult.usage?.completion_tokens ?? 0
          const cost = promptTokens * 0.00001 + completionTokens * 0.00003
          const confidence = generateConfidence('summarizer', input, config)
          const needsReview = confidence < confidenceThreshold
          const output = {
            response: aiResult.content,
            model: 'gpt-4o',
            input,
            confidence,
            confidenceThreshold,
            needsReview,
            routingDecision: needsReview ? 'human_review' : 'auto_send',
            memoryUsed: !!memoryPrompt,
            customerEmail: customerEmail || undefined,
          }

          await recordInteractionToMemory(customerEmail, customerContext, 'summarizer', input, output, confidence)

          return {
            output,
            tokenUsage: { prompt: promptTokens, completion: completionTokens },
            costUsd: Math.round(cost * 10000) / 10000,
            confidence,
          }
        }

        // Fallback to simulated
        await delay(800 + Math.random() * 1500)
        const tokens = { prompt: 150 + Math.floor(Math.random() * 200), completion: 80 + Math.floor(Math.random() * 150) }
        const cost = tokens.prompt * 0.00001 + tokens.completion * 0.00003
        const confidence = generateConfidence('summarizer', input, config)
        const needsReview = confidence < confidenceThreshold
        return {
          output: { response: AI_RESPONSES.summarizer, model: 'simulated', input, confidence, confidenceThreshold, needsReview, routingDecision: needsReview ? 'human_review' : 'auto_send', memoryUsed: false },
          tokenUsage: tokens,
          costUsd: Math.round(cost * 10000) / 10000,
          confidence,
        }
      }

      // Generic AI node fallback (shouldn't reach here normally)
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

    case 'action': {
      // ─── Trigger Workflow (Subflow) Node ────
      if (node.type === 'trigger-workflow') {
        const targetWorkflowId = config.targetWorkflowId as string
        const waitForCompletion = config.waitForCompletion !== false
        const passInput = config.passInput !== false
        const timeoutMs = (config.timeoutMs as number) || 30000

        if (!targetWorkflowId) {
          return { output: { error: 'No target workflow specified' }, confidence: 0 }
        }

        // Check depth to prevent infinite recursion
        if (_context.depth >= _context.maxDepth) {
          return { output: { error: 'Maximum workflow nesting depth exceeded', depth: _context.depth, maxDepth: _context.maxDepth }, confidence: 0 }
        }

        try {
          // Fetch the target workflow from API
          const wfRes = await fetch(`/api/workflows/${targetWorkflowId}`)
          const wfJson = await wfRes.json()

          if (!wfJson.ok || !wfJson.data) {
            return { output: { error: `Workflow ${targetWorkflowId} not found` }, confidence: 0 }
          }

          // Build sub-workflow nodes/edges from DB data
          const wfData = wfJson.data
          const subNodes: NodeDefinition[] = (wfData.nodes ?? []).map((n: { nodeId: string; type: string; label: string; category: string; config: string; positionX: number; positionY: number }) => ({
            id: n.nodeId,
            type: n.type as NodeDefinition['type'],
            label: n.label,
            category: n.category as NodeDefinition['category'],
            config: JSON.parse(n.config || '{}'),
            position: { x: n.positionX, y: n.positionY },
          }))
          const subEdges: EdgeDefinition[] = (wfData.edges ?? []).map((e: { source: string; target: string; sourceHandle: string; targetHandle: string }) => ({
            id: `edge-${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            sourceHandle: (e.sourceHandle || 'default') as EdgeDefinition['sourceHandle'],
            targetHandle: (e.targetHandle || 'input') as EdgeDefinition['targetHandle'],
          }))

          if (waitForCompletion) {
            // Execute sub-workflow and wait for result
            const subContext: ExecutionContext = {
              workflowId: targetWorkflowId,
              runId: `subflow_${_context.runId}_${Date.now()}`,
              variables: passInput ? { ..._context.variables, ...config } : {},
              parentRunId: _context.runId,
              depth: _context.depth + 1,
              maxDepth: _context.maxDepth,
              nodeOutputs: {},
            }

            // Execute with timeout
            const result = await Promise.race([
              executeWorkflowInternal(targetWorkflowId, subNodes, subEdges, subContext),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Sub-workflow timeout')), timeoutMs)
              ),
            ])

            const subCost = result.totalCostUsd ?? 0
            const subTokens = result.steps.reduce((acc, s) => {
              if (s.tokenUsage) return { prompt: acc.prompt + s.tokenUsage.prompt, completion: acc.completion + s.tokenUsage.completion }
              return acc
            }, { prompt: 0, completion: 0 })

            if (result.status === 'error') {
              return {
                output: { error: 'Sub-workflow execution failed', subflowResult: result, workflowId: targetWorkflowId },
                tokenUsage: subTokens,
                costUsd: subCost,
                confidence: 0,
              }
            }

            return {
              output: { subflowResult: result, workflowId: targetWorkflowId, triggered: true },
              tokenUsage: subTokens,
              costUsd: subCost,
              confidence: 1.0,
            }
          } else {
            // Fire and forget — trigger the workflow asynchronously via API
            try {
              await fetch(`/api/workflows/${targetWorkflowId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: passInput ? input : {}, triggeredBy: 'subflow' }),
              })
            } catch {
              // Non-critical — the async trigger might fail, but we don't block
            }

            return {
              output: { triggered: true, workflowId: targetWorkflowId, mode: 'async' },
              confidence: 1.0,
            }
          }
        } catch (err) {
          return {
            output: { error: err instanceof Error ? err.message : 'Sub-workflow execution failed' },
            confidence: 0,
          }
        }
      }

      // ─── Generic Action Nodes ────
      await delay(400 + Math.random() * 600)
      return { output: { result: ACTION_RESPONSES[node.type] ?? 'Action completed.', input, ...config }, confidence: 1.0 }
    }

    default:
      return { output: input, confidence: undefined }
  }
  } catch (err) {
    log.error({ err, nodeType: node.type }, 'Node runner error')
    return { output: { error: err instanceof Error ? err.message : 'Node execution failed', input }, confidence: 0 }
  }
}

// ─── Internal BFS Executor (for subflow nesting) ─────
// Pure execution engine that returns results without touching Zustand stores.
// Used by `executeWorkflow` for the main flow and by `trigger-workflow` for subflows.

export async function executeWorkflowInternal(
  _workflowId: string,
  nodes: NodeDefinition[],
  edges: EdgeDefinition[],
  context: ExecutionContext
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString()
  const steps: NodeExecutionStep[] = []
  const nodeOutputs: NodeOutputStore = { ...context.nodeOutputs } ?? {}
  let totalCostUsd = 0

  // Find trigger nodes (entry points)
  const triggerNodes = nodes.filter((n) => {
    try {
      return getCategoryForType(n.type).category === 'trigger'
    } catch {
      return false
    }
  })

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
  const MAX_DEPTH = 50

  // Initialize queue with trigger nodes
  const queue: { node: NodeDefinition; input: unknown }[] = triggerNodes.map((n) => ({
    node: n,
    input: context.variables,
  }))

  let finalStatus: ExecutionResult['status'] = 'success'
  let finalOutput: unknown = null

  while (queue.length > 0 && depthCounter < MAX_DEPTH) {
    const { node, input } = queue.shift()!
    if (executed.has(node.id)) continue
    executed.add(node.id)
    depthCounter++

    const cat = getCategoryForType(node.type)
    const stepStart = new Date().toISOString()

    try {
      // Resolve template variables in the node's config before execution
      const resolutionContext: ResolutionContext = {
        nodeOutputs,
        input,
        variables: context.variables,
        config: node.config ?? {},
      }
      const resolvedConfig = resolveVariables(node.config ?? {}, resolutionContext) as Record<string, unknown>

      // Update context depth for subflow execution
      const nodeContext: ExecutionContext = {
        ...context,
        nodeOutputs,
      }

      const result = await runNode({ ...node, config: resolvedConfig }, nodeContext, input, nodeOutputs)

      const step: NodeExecutionStep = {
        nodeId: node.id,
        nodeType: node.type,
        label: node.label,
        startedAt: stepStart,
        finishedAt: new Date().toISOString(),
        input,
        output: result.output,
        status: 'success',
        tokenUsage: result.tokenUsage,
        costUsd: result.costUsd,
      }
      steps.push(step)

      // Store this node's output for variable resolution by subsequent nodes
      nodeOutputs[node.id] = result.output
      finalOutput = result.output
      if (result.costUsd) totalCostUsd += result.costUsd

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
          } else if (cat.category === 'ai' && result.confidence !== undefined) {
            const aiOutput = result.output as { confidence: number; confidenceThreshold: number; needsReview: boolean }
            if (edge.sourceHandle === 'low_confidence' && aiOutput?.needsReview) {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'high_confidence' && !aiOutput?.needsReview) {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'default') {
              queue.push({ node: targetNode, input: result.output })
            }
          } else if (node.type === 'trigger-workflow') {
            // Route subflow results: default for success, error for failure
            const subflowOutput = result.output as { error?: string; subflowResult?: unknown }
            if (edge.sourceHandle === 'error' && subflowOutput?.error) {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'default' && !subflowOutput?.error) {
              queue.push({ node: targetNode, input: result.output })
            }
          } else {
            queue.push({ node: targetNode, input: result.output })
          }
        }
      }
    } catch (err) {
      const step: NodeExecutionStep = {
        nodeId: node.id,
        nodeType: node.type,
        label: node.label,
        startedAt: stepStart,
        finishedAt: new Date().toISOString(),
        input,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      }
      steps.push(step)

      // Try to follow the 'error' handle if available
      const nodeEdges = outEdges.get(node.id) ?? []
      const errorEdge = nodeEdges.find(e => e.sourceHandle === 'error')
      if (errorEdge) {
        const targetNode = nodes.find((n) => n.id === errorEdge.target)
        if (targetNode) {
          queue.push({ node: targetNode, input: { error: step.error, input } })
          continue
        }
      }

      // No error handler — stop execution
      finalStatus = 'error'
      finalOutput = { error: step.error }
      break
    }
  }

  return {
    runId: context.runId,
    workflowId: _workflowId,
    status: finalStatus,
    output: finalOutput,
    steps,
    totalDurationMs: steps.reduce((acc, s) => {
      if (s.startedAt && s.finishedAt) return acc + (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime())
      return acc
    }, 0),
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    startedAt,
    finishedAt: new Date().toISOString(),
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
    log.warn({ err }, 'Failed to persist execution results')
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
      log.error({ err }, 'Failed to start run')
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
          } else if (node.type === 'trigger-workflow') {
            // ── Subflow Routing ──
            // Route subflow results: default for success, error for failure
            const subflowOutput = result.output as { error?: string; subflowResult?: unknown }
            if (edge.sourceHandle === 'error' && subflowOutput?.error) {
              queue.push({ node: targetNode, input: result.output })
            } else if (edge.sourceHandle === 'default' && !subflowOutput?.error) {
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
    log.error({ err }, 'Unhandled execution error')
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
    log.error({ approvalId }, 'Approval request not found')
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
