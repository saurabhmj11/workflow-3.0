import { create } from 'zustand'
import {
  type NodeDefinition,
  type EdgeDefinition,
  type NodeType,
  type NodeCategory,
  type SourceHandle,
  type TargetHandle,
  getCategoryForType,
} from '@/lib/types'
import type { Node, Edge } from '@xyflow/react'

// ─── Convert between our types and React Flow ─────

export function nodeToFlow(node: NodeDefinition): Node {
  const cat = getCategoryForType(node.type)
  return {
    id: node.id,
    type: 'agent', // our custom node type
    position: node.position,
    data: {
      label: node.label,
      nodeType: node.type,
      category: node.category,
      color: cat.color,
      bgColor: cat.bgColor,
      borderColor: cat.borderColor,
      config: node.config,
    },
  }
}

export function flowToNode(node: Node): NodeDefinition {
  return {
    id: node.id,
    type: node.data.nodeType as NodeType,
    label: node.data.label as string,
    category: node.data.category as NodeCategory,
    config: node.data.config ?? {},
    position: node.position,
  }
}

export function edgeToFlow(edge: EdgeDefinition): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#64748b', strokeWidth: 2 },
  }
}

export function flowToEdge(edge: Edge): EdgeDefinition {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: (edge.sourceHandle ?? 'default') as SourceHandle,
    targetHandle: (edge.targetHandle ?? 'input') as TargetHandle,
  }
}

// ─── Store ────────────────────────────────────────

interface WorkflowState {
  nodes: NodeDefinition[]
  edges: EdgeDefinition[]
  name: string
  selectedNodeId: string | null
  workflowId: string | null

  // History for undo/redo
  history: { nodes: NodeDefinition[]; edges: EdgeDefinition[] }[]
  historyIndex: number

  setName: (name: string) => void
  addNode: (node: NodeDefinition) => void
  removeNode: (id: string) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void
  updateNodeLabel: (id: string, label: string) => void
  selectNode: (id: string | null) => void
  addEdge: (edge: EdgeDefinition) => void
  removeEdge: (id: string) => void
  setNodes: (nodes: NodeDefinition[]) => void
  setEdges: (edges: EdgeDefinition[]) => void
  setWorkflowId: (id: string | null) => void
  undo: () => void
  redo: () => void
  pushHistory: () => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  name: 'Untitled Workflow',
  selectedNodeId: null,
  workflowId: null,
  history: [{ nodes: [], edges: [] }],
  historyIndex: 0,

  setName: (name) => set({ name }),

  addNode: (node) => {
    const state = get()
    set({ nodes: [...state.nodes, node] })
    get().pushHistory()
  },

  removeNode: (id) => {
    const state = get()
    set({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })
    get().pushHistory()
  },

  updateNodePosition: (id, position) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
    }))
  },

  updateNodeConfig: (id, config) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, config: { ...n.config, ...config } } : n)),
    }))
    get().pushHistory()
  },

  updateNodeLabel: (id, label) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    }))
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  addEdge: (edge) => {
    const state = get()
    // Prevent duplicate edges
    const exists = state.edges.some(
      (e) => e.source === edge.source && e.target === edge.target && e.sourceHandle === edge.sourceHandle
    )
    if (!exists) {
      set({ edges: [...state.edges, edge] })
      get().pushHistory()
    }
  },

  removeEdge: (id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }))
    get().pushHistory()
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setWorkflowId: (id) => set({ workflowId: id }),

  pushHistory: () => {
    const state = get()
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push({ nodes: [...state.nodes], edges: [...state.edges] })
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const state = get()
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1
      const snapshot = state.history[newIndex]
      set({ nodes: [...snapshot.nodes], edges: [...snapshot.edges], historyIndex: newIndex })
    }
  },

  redo: () => {
    const state = get()
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1
      const snapshot = state.history[newIndex]
      set({ nodes: [...snapshot.nodes], edges: [...snapshot.edges], historyIndex: newIndex })
    }
  },

  reset: () => set({ nodes: [], edges: [], name: 'Untitled Workflow', selectedNodeId: null, workflowId: null, history: [{ nodes: [], edges: [] }], historyIndex: 0 }),
}))
