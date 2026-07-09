// ─── Workflow Store Tests ─────────────────────────
import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from '@/stores/workflow-store'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

function makeNode(overrides: Partial<NodeDefinition> = {}): NodeDefinition {
  return {
    id: 'node-1',
    type: 'llm',
    label: 'LLM Node',
    category: 'ai',
    config: {},
    position: { x: 100, y: 100 },
    ...overrides,
  }
}

function makeEdge(overrides: Partial<EdgeDefinition> = {}): EdgeDefinition {
  return {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    sourceHandle: 'default',
    targetHandle: 'input',
    ...overrides,
  }
}

describe('WorkflowStore', () => {
  beforeEach(() => {
    // Reset the store to initial state
    useWorkflowStore.getState().reset()
  })

  // ─── addNode ───────────────────────────────────

  describe('addNode', () => {
    it('should add a node to the canvas', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)

      const store = useWorkflowStore.getState()
      expect(store.nodes).toHaveLength(1)
      expect(store.nodes[0].id).toBe('node-1')
    })

    it('should add nodes at the end of the list', () => {
      const node1 = makeNode({ id: 'node-a' })
      const node2 = makeNode({ id: 'node-b' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)

      const store = useWorkflowStore.getState()
      expect(store.nodes).toHaveLength(2)
      expect(store.nodes[0].id).toBe('node-a')
      expect(store.nodes[1].id).toBe('node-b')
    })

    it('should push history when adding a node', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)

      const store = useWorkflowStore.getState()
      // Initial history entry + 1 add = 2 entries
      expect(store.historyIndex).toBe(1)
      expect(store.history).toHaveLength(2)
    })
  })

  // ─── removeNode ────────────────────────────────

  describe('removeNode', () => {
    it('should remove a node by id', () => {
      const node = makeNode({ id: 'node-1' })
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().removeNode('node-1')

      const store = useWorkflowStore.getState()
      expect(store.nodes).toHaveLength(0)
    })

    it('should remove connected edges when removing a node', () => {
      const node1 = makeNode({ id: 'node-1' })
      const node2 = makeNode({ id: 'node-2' })
      const edge = makeEdge({ source: 'node-1', target: 'node-2' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(edge)

      useWorkflowStore.getState().removeNode('node-1')

      const store = useWorkflowStore.getState()
      expect(store.nodes).toHaveLength(1)
      expect(store.edges).toHaveLength(0)
    })

    it('should clear selectedNodeId if the removed node was selected', () => {
      const node = makeNode({ id: 'node-1' })
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().selectNode('node-1')

      expect(useWorkflowStore.getState().selectedNodeId).toBe('node-1')

      useWorkflowStore.getState().removeNode('node-1')
      expect(useWorkflowStore.getState().selectedNodeId).toBeNull()
    })

    it('should not affect other nodes when removing one', () => {
      const node1 = makeNode({ id: 'node-1' })
      const node2 = makeNode({ id: 'node-2' })
      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)

      useWorkflowStore.getState().removeNode('node-1')

      const store = useWorkflowStore.getState()
      expect(store.nodes).toHaveLength(1)
      expect(store.nodes[0].id).toBe('node-2')
    })

    it('should remove edges where the node is the source', () => {
      const node1 = makeNode({ id: 'src' })
      const node2 = makeNode({ id: 'tgt' })
      const edge = makeEdge({ id: 'e1', source: 'src', target: 'tgt' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(edge)

      useWorkflowStore.getState().removeNode('src')
      expect(useWorkflowStore.getState().edges).toHaveLength(0)
    })

    it('should remove edges where the node is the target', () => {
      const node1 = makeNode({ id: 'src' })
      const node2 = makeNode({ id: 'tgt' })
      const edge = makeEdge({ id: 'e1', source: 'src', target: 'tgt' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(edge)

      useWorkflowStore.getState().removeNode('tgt')
      expect(useWorkflowStore.getState().edges).toHaveLength(0)
    })
  })

  // ─── updateNodeConfig ──────────────────────────

  describe('updateNodeConfig', () => {
    it('should update node configuration', () => {
      const node = makeNode({ config: { model: 'gpt-3.5' } })
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().updateNodeConfig('node-1', { model: 'gpt-4o' })

      const store = useWorkflowStore.getState()
      expect(store.nodes[0].config.model).toBe('gpt-4o')
    })

    it('should merge config instead of replacing', () => {
      const node = makeNode({ config: { model: 'gpt-3.5', temperature: 0.7 } })
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().updateNodeConfig('node-1', { model: 'gpt-4o' })

      const store = useWorkflowStore.getState()
      expect(store.nodes[0].config.model).toBe('gpt-4o')
      expect(store.nodes[0].config.temperature).toBe(0.7)
    })

    it('should not affect other nodes', () => {
      const node1 = makeNode({ id: 'n1', config: { model: 'gpt-3.5' } })
      const node2 = makeNode({ id: 'n2', config: { model: 'claude' } })
      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)

      useWorkflowStore.getState().updateNodeConfig('n1', { model: 'gpt-4o' })

      const store = useWorkflowStore.getState()
      expect(store.nodes.find((n) => n.id === 'n2')?.config.model).toBe('claude')
    })

    it('should push history when updating config', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)
      const prevIndex = useWorkflowStore.getState().historyIndex

      useWorkflowStore.getState().updateNodeConfig('node-1', { key: 'value' })

      expect(useWorkflowStore.getState().historyIndex).toBe(prevIndex + 1)
    })
  })

  // ─── addEdge / removeEdge ──────────────────────

  describe('addEdge', () => {
    it('should add an edge', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      const edge = makeEdge({ source: 'n1', target: 'n2' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(edge)

      expect(useWorkflowStore.getState().edges).toHaveLength(1)
    })

    it('should prevent duplicate edges', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      const edge1 = makeEdge({ id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'default' })
      const edge2 = makeEdge({ id: 'e2', source: 'n1', target: 'n2', sourceHandle: 'default' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(edge1)
      useWorkflowStore.getState().addEdge(edge2)

      // Second duplicate should be ignored
      expect(useWorkflowStore.getState().edges).toHaveLength(1)
    })

    it('should allow edges with same source/target but different handles', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      const edgeTrue = makeEdge({ id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'true' })
      const edgeFalse = makeEdge({ id: 'e2', source: 'n1', target: 'n2', sourceHandle: 'false' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(edgeTrue)
      useWorkflowStore.getState().addEdge(edgeFalse)

      expect(useWorkflowStore.getState().edges).toHaveLength(2)
    })

    it('should push history when adding an edge', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)

      const prevIndex = useWorkflowStore.getState().historyIndex
      const edge = makeEdge({ source: 'n1', target: 'n2' })
      useWorkflowStore.getState().addEdge(edge)

      expect(useWorkflowStore.getState().historyIndex).toBe(prevIndex + 1)
    })
  })

  describe('removeEdge', () => {
    it('should remove an edge by id', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      const edge = makeEdge({ id: 'e1', source: 'n1', target: 'n2' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(edge)
      useWorkflowStore.getState().removeEdge('e1')

      expect(useWorkflowStore.getState().edges).toHaveLength(0)
    })

    it('should not affect other edges', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      const node3 = makeNode({ id: 'n3' })
      const edge1 = makeEdge({ id: 'e1', source: 'n1', target: 'n2' })
      const edge2 = makeEdge({ id: 'e2', source: 'n2', target: 'n3' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addNode(node3)
      useWorkflowStore.getState().addEdge(edge1)
      useWorkflowStore.getState().addEdge(edge2)

      useWorkflowStore.getState().removeEdge('e1')

      const store = useWorkflowStore.getState()
      expect(store.edges).toHaveLength(1)
      expect(store.edges[0].id).toBe('e2')
    })

    it('should push history when removing an edge', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      const edge = makeEdge({ id: 'e1', source: 'n1', target: 'n2' })

      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(edge)

      const prevIndex = useWorkflowStore.getState().historyIndex
      useWorkflowStore.getState().removeEdge('e1')

      expect(useWorkflowStore.getState().historyIndex).toBe(prevIndex + 1)
    })
  })

  // ─── setNodes / setEdges ───────────────────────

  describe('setNodes', () => {
    it('should replace all nodes', () => {
      const node1 = makeNode({ id: 'old-1' })
      const node2 = makeNode({ id: 'old-2' })
      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)

      const newNodes = [makeNode({ id: 'new-1' }), makeNode({ id: 'new-2' }), makeNode({ id: 'new-3' })]
      useWorkflowStore.getState().setNodes(newNodes)

      const store = useWorkflowStore.getState()
      expect(store.nodes).toHaveLength(3)
      expect(store.nodes.map((n) => n.id)).toEqual(['new-1', 'new-2', 'new-3'])
    })

    it('should set nodes to empty array', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().setNodes([])

      expect(useWorkflowStore.getState().nodes).toEqual([])
    })
  })

  describe('setEdges', () => {
    it('should replace all edges', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)

      const edge1 = makeEdge({ id: 'e1', source: 'n1', target: 'n2' })
      useWorkflowStore.getState().addEdge(edge1)

      const newEdges = [makeEdge({ id: 'ne1', source: 'n1', target: 'n2', sourceHandle: 'true' })]
      useWorkflowStore.getState().setEdges(newEdges)

      const store = useWorkflowStore.getState()
      expect(store.edges).toHaveLength(1)
      expect(store.edges[0].id).toBe('ne1')
    })

    it('should set edges to empty array', () => {
      const node1 = makeNode({ id: 'n1' })
      const node2 = makeNode({ id: 'n2' })
      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)
      useWorkflowStore.getState().addEdge(makeEdge({ source: 'n1', target: 'n2' }))

      useWorkflowStore.getState().setEdges([])
      expect(useWorkflowStore.getState().edges).toEqual([])
    })
  })

  // ─── clearCanvas (reset) ───────────────────────

  describe('clearCanvas (reset)', () => {
    it('should reset all state', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().addEdge(makeEdge())
      useWorkflowStore.getState().selectNode('node-1')
      useWorkflowStore.getState().setWorkflowId('wf-123')

      useWorkflowStore.getState().reset()

      const store = useWorkflowStore.getState()
      expect(store.nodes).toEqual([])
      expect(store.edges).toEqual([])
      expect(store.selectedNodeId).toBeNull()
      expect(store.workflowId).toBeNull()
      expect(store.name).toBe('Untitled Workflow')
    })

    it('should reset history', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)

      useWorkflowStore.getState().reset()

      const store = useWorkflowStore.getState()
      expect(store.history).toHaveLength(1)
      expect(store.historyIndex).toBe(0)
    })
  })

  // ─── workflowId / setWorkflowId ────────────────

  describe('workflowId', () => {
    it('should start as null', () => {
      expect(useWorkflowStore.getState().workflowId).toBeNull()
    })

    it('should set workflow ID', () => {
      useWorkflowStore.getState().setWorkflowId('wf-abc')
      expect(useWorkflowStore.getState().workflowId).toBe('wf-abc')
    })

    it('should clear workflow ID', () => {
      useWorkflowStore.getState().setWorkflowId('wf-abc')
      useWorkflowStore.getState().setWorkflowId(null)
      expect(useWorkflowStore.getState().workflowId).toBeNull()
    })

    it('should be cleared on reset', () => {
      useWorkflowStore.getState().setWorkflowId('wf-xyz')
      useWorkflowStore.getState().reset()
      expect(useWorkflowStore.getState().workflowId).toBeNull()
    })
  })

  // ─── Name ──────────────────────────────────────

  describe('setName', () => {
    it('should default to "Untitled Workflow"', () => {
      expect(useWorkflowStore.getState().name).toBe('Untitled Workflow')
    })

    it('should update the workflow name', () => {
      useWorkflowStore.getState().setName('My Custom Workflow')
      expect(useWorkflowStore.getState().name).toBe('My Custom Workflow')
    })
  })

  // ─── Undo / Redo ──────────────────────────────

  describe('undo/redo', () => {
    it('should undo adding a node', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)
      expect(useWorkflowStore.getState().nodes).toHaveLength(1)

      useWorkflowStore.getState().undo()
      expect(useWorkflowStore.getState().nodes).toHaveLength(0)
    })

    it('should redo after undo', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().undo()
      expect(useWorkflowStore.getState().nodes).toHaveLength(0)

      useWorkflowStore.getState().redo()
      expect(useWorkflowStore.getState().nodes).toHaveLength(1)
    })

    it('should not undo past the beginning', () => {
      useWorkflowStore.getState().undo()
      expect(useWorkflowStore.getState().historyIndex).toBe(0)
    })

    it('should not redo past the end', () => {
      const node = makeNode()
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().redo()
      // historyIndex should not exceed the length
      expect(useWorkflowStore.getState().historyIndex).toBe(useWorkflowStore.getState().history.length - 1)
    })
  })

  // ─── updateNodePosition ────────────────────────

  describe('updateNodePosition', () => {
    it('should update node position', () => {
      const node = makeNode({ position: { x: 0, y: 0 } })
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().updateNodePosition('node-1', { x: 200, y: 300 })

      const store = useWorkflowStore.getState()
      expect(store.nodes[0].position).toEqual({ x: 200, y: 300 })
    })

    it('should not affect other nodes', () => {
      const node1 = makeNode({ id: 'n1', position: { x: 0, y: 0 } })
      const node2 = makeNode({ id: 'n2', position: { x: 50, y: 50 } })
      useWorkflowStore.getState().addNode(node1)
      useWorkflowStore.getState().addNode(node2)

      useWorkflowStore.getState().updateNodePosition('n1', { x: 100, y: 100 })

      const store = useWorkflowStore.getState()
      expect(store.nodes.find((n) => n.id === 'n2')?.position).toEqual({ x: 50, y: 50 })
    })
  })

  // ─── updateNodeLabel ───────────────────────────

  describe('updateNodeLabel', () => {
    it('should update node label', () => {
      const node = makeNode({ label: 'Old Label' })
      useWorkflowStore.getState().addNode(node)
      useWorkflowStore.getState().updateNodeLabel('node-1', 'New Label')

      const store = useWorkflowStore.getState()
      expect(store.nodes[0].label).toBe('New Label')
    })
  })

  // ─── selectNode ────────────────────────────────

  describe('selectNode', () => {
    it('should select a node', () => {
      useWorkflowStore.getState().selectNode('node-1')
      expect(useWorkflowStore.getState().selectedNodeId).toBe('node-1')
    })

    it('should deselect by passing null', () => {
      useWorkflowStore.getState().selectNode('node-1')
      useWorkflowStore.getState().selectNode(null)
      expect(useWorkflowStore.getState().selectedNodeId).toBeNull()
    })
  })
})
