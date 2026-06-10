// ─── API Utilities Tests ──────────────────────────
import { describe, it, expect } from 'vitest'
import {
  successResponse,
  errorResponse,
  serializeNode,
  serializeEdge,
  serializeWorkflow,
  serializeExecution,
  parseNodes,
  parseEdges,
} from '@/lib/api-utils'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

// ─── Response Helpers ──────────────────────────────

describe('successResponse', () => {
  it('should return correct format with ok:true and data', () => {
    const response = successResponse({ id: '1', name: 'Test' })
    // NextResponse.json returns a Response object
    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
  })

  it('should return correct status code (default 200)', () => {
    const response = successResponse({ result: 'ok' })
    expect(response.status).toBe(200)
  })

  it('should accept custom status code', () => {
    const response = successResponse({ created: true }, 201)
    expect(response.status).toBe(201)
  })

  it('should serialize the response body correctly', async () => {
    const data = { id: '123', items: [1, 2, 3] }
    const response = successResponse(data)
    const body = await response.json()
    expect(body).toEqual({ ok: true, data })
  })

  it('should handle null data', async () => {
    const response = successResponse(null)
    const body = await response.json()
    expect(body).toEqual({ ok: true, data: null })
  })

  it('should handle array data', async () => {
    const data = [{ id: 1 }, { id: 2 }]
    const response = successResponse(data)
    const body = await response.json()
    expect(body).toEqual({ ok: true, data: [{ id: 1 }, { id: 2 }] })
  })

  it('should handle string data', async () => {
    const response = successResponse('hello')
    const body = await response.json()
    expect(body).toEqual({ ok: true, data: 'hello' })
  })
})

describe('errorResponse', () => {
  it('should return correct format with ok:false and error', () => {
    const response = errorResponse('Something went wrong')
    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toBe('application/json')
  })

  it('should return default status code 400', () => {
    const response = errorResponse('Bad request')
    expect(response.status).toBe(400)
  })

  it('should accept custom status code', () => {
    const response = errorResponse('Not found', 404)
    expect(response.status).toBe(404)
  })

  it('should serialize the error body correctly', async () => {
    const response = errorResponse('Invalid input')
    const body = await response.json()
    expect(body).toEqual({ ok: false, error: 'Invalid input' })
  })

  it('should handle 500 status code', () => {
    const response = errorResponse('Internal server error', 500)
    expect(response.status).toBe(500)
  })

  it('should handle 401 status code', () => {
    const response = errorResponse('Unauthorized', 401)
    expect(response.status).toBe(401)
  })
})

// ─── Serialization Helpers ─────────────────────────

describe('serializeNode', () => {
  it('should convert a Prisma XML node to NodeDefinition', () => {
    const prismaNode = {
      id: 'db-1',
      workflowId: 'wf-1',
      nodeId: 'node-1',
      type: 'llm',
      label: 'LLM Node',
      category: 'ai',
      config: '{"model":"gpt-4o"}',
      positionX: 100,
      positionY: 200,
    }

    const result = serializeNode(prismaNode)

    expect(result.id).toBe('node-1')
    expect(result.type).toBe('llm')
    expect(result.label).toBe('LLM Node')
    expect(result.category).toBe('ai')
    expect(result.config).toEqual({ model: 'gpt-4o' })
    expect(result.position).toEqual({ x: 100, y: 200 })
  })

  it('should parse empty config as empty object', () => {
    const prismaNode = {
      id: 'db-2',
      workflowId: 'wf-1',
      nodeId: 'node-2',
      type: 'condition',
      label: 'Condition',
      category: 'logic',
      config: '{}',
      positionX: 0,
      positionY: 0,
    }

    const result = serializeNode(prismaNode)
    expect(result.config).toEqual({})
  })
})

describe('serializeEdge', () => {
  it('should convert a Prisma edge to EdgeDefinition', () => {
    const prismaEdge = {
      id: 'edge-1',
      workflowId: 'wf-1',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'true',
      targetHandle: 'input',
    }

    const result = serializeEdge(prismaEdge)

    expect(result.id).toBe('edge-1')
    expect(result.source).toBe('node-1')
    expect(result.target).toBe('node-2')
    expect(result.sourceHandle).toBe('true')
    expect(result.targetHandle).toBe('input')
  })
})

describe('serializeWorkflow', () => {
  it('should convert a Prisma workflow to API format', () => {
    const prismaWorkflow = {
      id: 'wf-1',
      name: 'Test Workflow',
      description: 'A test workflow',
      version: 3,
      isActive: true,
      metadata: '{"env":"prod"}',
      nodes: [
        {
          id: 'db-1',
          workflowId: 'wf-1',
          nodeId: 'node-1',
          type: 'llm',
          label: 'LLM',
          category: 'ai',
          config: '{}',
          positionX: 0,
          positionY: 0,
        },
      ],
      edges: [
        {
          id: 'edge-1',
          workflowId: 'wf-1',
          source: 'node-1',
          target: 'node-2',
          sourceHandle: 'default',
          targetHandle: 'input',
        },
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    }

    const result = serializeWorkflow(prismaWorkflow)

    expect(result.id).toBe('wf-1')
    expect(result.name).toBe('Test Workflow')
    expect(result.description).toBe('A test workflow')
    expect(result.version).toBe(3)
    expect(result.isActive).toBe(true)
    expect(result.metadata).toEqual({ env: 'prod' })
    expect(result.nodes).toHaveLength(1)
    expect(result.edges).toHaveLength(1)
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
    expect(result.updatedAt).toBe('2024-01-02T00:00:00.000Z')
  })

  it('should handle null description', () => {
    const prismaWorkflow = {
      id: 'wf-2',
      name: 'No Desc',
      description: null,
      version: 1,
      isActive: false,
      metadata: null,
      nodes: [],
      edges: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }

    const result = serializeWorkflow(prismaWorkflow)
    expect(result.description).toBeUndefined()
    expect(result.metadata).toBeUndefined()
  })
})

describe('serializeExecution', () => {
  it('should convert a Prisma execution to API format', () => {
    const prismaExecution = {
      id: 'exec-1',
      workflowId: 'wf-1',
      runId: 'run-1',
      status: 'success',
      triggeredBy: 'api',
      input: '{"key":"value"}',
      output: '{"result":"done"}',
      steps: '[{"nodeId":"n1","status":"success"}]',
      totalDurationMs: 1500,
      totalCostUsd: 0.003,
      error: null,
      startedAt: new Date('2024-01-01T10:00:00Z'),
      finishedAt: new Date('2024-01-01T10:00:01Z'),
      workflow: { name: 'My Workflow' },
    }

    const result = serializeExecution(prismaExecution)

    expect(result.id).toBe('exec-1')
    expect(result.workflowId).toBe('wf-1')
    expect(result.workflowName).toBe('My Workflow')
    expect(result.runId).toBe('run-1')
    expect(result.status).toBe('success')
    expect(result.triggeredBy).toBe('api')
    expect(result.input).toEqual({ key: 'value' })
    expect(result.output).toEqual({ result: 'done' })
    expect(result.steps).toEqual([{ nodeId: 'n1', status: 'success' }])
    expect(result.totalDurationMs).toBe(1500)
    expect(result.totalCostUsd).toBe(0.003)
    expect(result.error).toBeUndefined()
    expect(result.startedAt).toBe('2024-01-01T10:00:00.000Z')
    expect(result.finishedAt).toBe('2024-01-01T10:00:01.000Z')
  })

  it('should handle null input/output/finishedAt', () => {
    const prismaExecution = {
      id: 'exec-2',
      workflowId: 'wf-1',
      runId: 'run-2',
      status: 'running',
      triggeredBy: 'schedule',
      input: null,
      output: null,
      steps: '[]',
      totalDurationMs: 0,
      totalCostUsd: 0,
      error: 'Something failed',
      startedAt: new Date('2024-01-01'),
      finishedAt: null,
      workflow: null,
    }

    const result = serializeExecution(prismaExecution)

    expect(result.input).toBeUndefined()
    expect(result.output).toBeUndefined()
    expect(result.finishedAt).toBeUndefined()
    expect(result.workflowName).toBeUndefined()
    expect(result.error).toBe('Something failed')
  })
})

// ─── Parsing Helpers ───────────────────────────────

describe('parseNodes', () => {
  it('should convert NodeDefinition[] to Prisma create format', () => {
    const nodes: NodeDefinition[] = [
      {
        id: 'node-1',
        type: 'llm',
        label: 'LLM Node',
        category: 'ai',
        config: { model: 'gpt-4o', temperature: 0.7 },
        position: { x: 100, y: 200 },
      },
    ]

    const result = parseNodes(nodes)

    expect(result).toHaveLength(1)
    expect(result[0].nodeId).toBe('node-1')
    expect(result[0].type).toBe('llm')
    expect(result[0].label).toBe('LLM Node')
    expect(result[0].category).toBe('ai')
    expect(result[0].config).toBe('{"model":"gpt-4o","temperature":0.7}')
    expect(result[0].positionX).toBe(100)
    expect(result[0].positionY).toBe(200)
  })

  it('should handle nodes without config', () => {
    const nodes: NodeDefinition[] = [
      {
        id: 'node-2',
        type: 'condition',
        label: 'Condition',
        category: 'logic',
        config: {},
        position: { x: 0, y: 0 },
      },
    ]

    const result = parseNodes(nodes)
    expect(result[0].config).toBe('{}')
  })

  it('should handle nodes without position (defaults to 0,0)', () => {
    const nodes = [
      {
        id: 'node-3',
        type: 'delay',
        label: 'Delay',
        category: 'logic',
        config: {},
      },
    ] as NodeDefinition[]

    const result = parseNodes(nodes)
    expect(result[0].positionX).toBe(0)
    expect(result[0].positionY).toBe(0)
  })

  it('should handle empty array', () => {
    expect(parseNodes([])).toEqual([])
  })
})

describe('parseEdges', () => {
  it('should convert EdgeDefinition[] to Prisma create format', () => {
    const edges: EdgeDefinition[] = [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'true',
        targetHandle: 'input',
      },
    ]

    const result = parseEdges(edges)

    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('node-1')
    expect(result[0].target).toBe('node-2')
    expect(result[0].sourceHandle).toBe('true')
    expect(result[0].targetHandle).toBe('input')
  })

  it('should default sourceHandle to "default" when not provided', () => {
    const edges = [
      {
        id: 'edge-2',
        source: 'node-1',
        target: 'node-2',
        targetHandle: 'input',
      },
    ] as EdgeDefinition[]

    const result = parseEdges(edges)
    expect(result[0].sourceHandle).toBe('default')
  })

  it('should default targetHandle to "input" when not provided', () => {
    const edges = [
      {
        id: 'edge-3',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'default',
      },
    ] as EdgeDefinition[]

    const result = parseEdges(edges)
    expect(result[0].targetHandle).toBe('input')
  })

  it('should handle empty array', () => {
    expect(parseEdges([])).toEqual([])
  })
})
