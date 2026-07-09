// ─── OpenWorkflow Shared Types ───────────────────
// The single source of truth for the entire platform.
// Both the builder UI and the engine import from here.

// ─── Node Categories ─────────────────────────────
export const TRIGGER_TYPES = ['api', 'webhook', 'schedule', 'email', 'form', 'voice-call', 'whatsapp', 'subflow'] as const
export const LOGIC_TYPES = ['condition', 'switch', 'loop', 'retry', 'delay', 'parallel', 'merge'] as const
export const AI_TYPES = ['llm', 'agent', 'rag', 'classifier', 'summarizer'] as const
export const HUMAN_TYPES = ['approval', 'review', 'escalation'] as const
export const ACTION_TYPES = ['crm', 'email', 'slack', 'whatsapp', 'database', 'trigger-workflow', 'http-request', 'code'] as const

export type TriggerType = (typeof TRIGGER_TYPES)[number]
export type LogicType = (typeof LOGIC_TYPES)[number]
export type AIType = (typeof AI_TYPES)[number]
export type HumanType = (typeof HUMAN_TYPES)[number]
export type ActionType = (typeof ACTION_TYPES)[number]
export type NodeType = TriggerType | LogicType | AIType | HumanType | ActionType

export type NodeCategory = 'trigger' | 'logic' | 'ai' | 'human' | 'action'

export interface NodeCategoryDef {
  category: NodeCategory
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
  types: readonly string[]
}

export const NODE_CATEGORIES: NodeCategoryDef[] = [
  { category: 'trigger', label: 'Trigger', color: 'text-blue-500', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', icon: 'Zap', types: TRIGGER_TYPES },
  { category: 'logic', label: 'Logic', color: 'text-green-500', bgColor: 'bg-green-100', borderColor: 'border-green-400', icon: 'GitBranch', types: LOGIC_TYPES },
  { category: 'ai', label: 'AI', color: 'text-purple-500', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', icon: 'Brain', types: AI_TYPES },
  { category: 'human', label: 'Human', color: 'text-orange-500', bgColor: 'bg-orange-100', borderColor: 'border-orange-400', icon: 'UserCheck', types: HUMAN_TYPES },
  { category: 'action', label: 'Action', color: 'text-pink-500', bgColor: 'bg-pink-100', borderColor: 'border-pink-400', icon: 'Plug', types: ACTION_TYPES },
]

export function getCategoryForType(type: NodeType): NodeCategoryDef {
  return NODE_CATEGORIES.find(c => c.types.includes(type)) ?? NODE_CATEGORIES[0]
}

// ─── Node Definition ─────────────────────────────
export interface NodeDefinition {
  id: string
  type: NodeType
  label: string
  category: NodeCategory
  config: Record<string, unknown>
  position: { x: number; y: number }
}

// ─── Edge Definition ─────────────────────────────
export type SourceHandle = 'default' | 'true' | 'false' | 'error' | 'approved' | 'rejected' | 'high_confidence' | 'low_confidence' | 'branch_0' | 'branch_1' | 'branch_2' | 'branch_3'
export type TargetHandle = 'default' | 'input'

export interface EdgeDefinition {
  id: string
  source: string
  target: string
  sourceHandle: SourceHandle
  targetHandle: TargetHandle
}

// ─── Workflow ─────────────────────────────────────
export interface Workflow {
  id: string
  name: string
  version: number
  nodes: NodeDefinition[]
  edges: EdgeDefinition[]
  metadata?: Record<string, unknown>
}

// ─── Execution ────────────────────────────────────
export type TriggeredBy = 'api' | 'webhook' | 'schedule' | 'voice'

export interface ExecutionContext {
  workflowId: string
  runId: string
  variables: Record<string, unknown>
  parentRunId?: string
  depth: number
  maxDepth: number
  triggeredBy?: TriggeredBy
  /** Outputs from previously executed nodes, keyed by nodeId. Available for debugging. */
  nodeOutputs?: Record<string, unknown>
  /** If true, skip real external calls and return mock responses (for testing and assertions). */
  mockMode?: boolean
}

export type NodeExecutionStatus = 'success' | 'error' | 'skipped' | 'pending' | 'running'

export interface NodeExecutionStep {
  nodeId: string
  nodeType: NodeType
  label: string
  startedAt: string
  finishedAt?: string
  input: unknown
  output?: unknown
  status: NodeExecutionStatus
  tokenUsage?: { prompt: number; completion: number }
  costUsd?: number
  error?: string
}

export type ExecutionStatus = 'running' | 'success' | 'error' | 'paused' | 'awaiting_approval'

export interface ExecutionResult {
  runId: string
  workflowId: string
  status: ExecutionStatus
  output?: unknown
  steps: NodeExecutionStep[]
  totalDurationMs: number
  totalCostUsd?: number
  startedAt: string
  finishedAt?: string
}

// ─── Approval ─────────────────────────────────────
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface ApprovalRequest {
  id: string
  runId: string
  nodeId: string
  workflowId: string
  assignee?: string
  status: ApprovalStatus
  context: Record<string, unknown>
  createdAt: string
  slaDeadline?: string
  notes?: string
}

// ─── MCP (Model Context Protocol) ──────────────────
export interface MCPToolDefinition {
  id: string
  name: string
  description?: string
  serverName: string
  inputSchema?: Record<string, unknown>
  annotations?: Record<string, unknown>
}

export interface MCPServerDefinition {
  id: string
  name: string
  url: string
  type: 'sse' | 'streamable-http' | 'stdio'
  description?: string
  status: 'connected' | 'disconnected' | 'error'
  toolCount: number
}

// ─── Handle config per node type ──────────────────
export function getSourceHandles(type: NodeType): SourceHandle[] {
  if (type === 'condition') return ['true', 'false']
  if (type === 'approval') return ['approved', 'rejected']
  if (type === 'review') return ['approved', 'rejected']
  if (type === 'escalation') return ['default', 'error']
  // AI nodes with confidence routing
  if (type === 'llm' || type === 'classifier' || type === 'agent') return ['high_confidence', 'low_confidence']
  // Parallel fork node — outputs to multiple branches
  if (type === 'parallel') return ['branch_0', 'branch_1', 'branch_2', 'branch_3']
  // Merge node — single output
  if (type === 'merge') return ['default']
  // Trigger-workflow has success + error outputs
  if (type === 'trigger-workflow') return ['default', 'error']
  // Code and HTTP Request nodes have default + error outputs
  if (type === 'code') return ['default', 'error']
  if (type === 'http-request') return ['default', 'error']
  return ['default']
}

export function getTargetHandles(_type: NodeType): TargetHandle[] {
  return ['input']
}
