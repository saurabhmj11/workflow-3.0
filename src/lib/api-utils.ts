import { NextResponse } from 'next/server'
import type { NodeDefinition, EdgeDefinition, NodeType, NodeCategory, SourceHandle, TargetHandle } from '@/lib/types'

// ─── Response Helpers ──────────────────────────────

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

// ─── Serialization ─────────────────────────────────
// Converts a Prisma workflow record (with included nodes/edges)
// into the API response format matching our TypeScript interfaces.

interface PrismaXmlNode {
  id: string
  workflowId: string
  nodeId: string
  type: string
  label: string
  category: string
  config: string
  positionX: number
  positionY: number
}

interface PrismaEdge {
  id: string
  workflowId: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}

interface PrismaWorkflow {
  id: string
  name: string
  description: string | null
  version: number
  isActive: boolean
  metadata: string | null
  nodes: PrismaXmlNode[]
  edges: PrismaEdge[]
  createdAt: Date
  updatedAt: Date
}

interface PrismaExecution {
  id: string
  workflowId: string
  runId: string
  status: string
  triggeredBy: string
  input: string | null
  output: string | null
  steps: string
  totalDurationMs: number
  totalCostUsd: number
  error: string | null
  startedAt: Date
  finishedAt: Date | null
}

export function serializeWorkflow(workflow: PrismaWorkflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? undefined,
    version: workflow.version,
    isActive: workflow.isActive,
    metadata: workflow.metadata ? JSON.parse(workflow.metadata) : undefined,
    nodes: workflow.nodes.map(serializeNode),
    edges: workflow.edges.map(serializeEdge),
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  }
}

export function serializeNode(node: PrismaXmlNode): NodeDefinition {
  return {
    id: node.nodeId,
    type: node.type as NodeType,
    label: node.label,
    category: node.category as NodeCategory,
    config: JSON.parse(node.config),
    position: { x: node.positionX, y: node.positionY },
  }
}

export function serializeEdge(edge: PrismaEdge): EdgeDefinition {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle as SourceHandle,
    targetHandle: edge.targetHandle as TargetHandle,
  }
}

export function serializeExecution(execution: PrismaExecution & { workflow?: { name: string } | null }) {
  return {
    id: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflow?.name ?? undefined,
    runId: execution.runId,
    status: execution.status,
    triggeredBy: execution.triggeredBy,
    input: execution.input ? JSON.parse(execution.input) : undefined,
    output: execution.output ? JSON.parse(execution.output) : undefined,
    steps: JSON.parse(execution.steps),
    totalDurationMs: execution.totalDurationMs,
    totalCostUsd: execution.totalCostUsd,
    error: execution.error ?? undefined,
    startedAt: execution.startedAt.toISOString(),
    finishedAt: execution.finishedAt?.toISOString() ?? undefined,
  }
}

// ─── Parsing Helpers ───────────────────────────────
// Converts API format (NodeDefinition[]) to Prisma create format.

export function parseNodes(nodes: NodeDefinition[]) {
  return nodes.map((node) => ({
    nodeId: node.id,
    type: node.type,
    label: node.label,
    category: node.category,
    config: JSON.stringify(node.config ?? {}),
    positionX: node.position?.x ?? 0,
    positionY: node.position?.y ?? 0,
  }))
}

export function parseEdges(edges: EdgeDefinition[]) {
  return edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? 'default',
    targetHandle: edge.targetHandle ?? 'input',
  }))
}
