'use client'

import { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type ReactFlowInstance,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes } from '@/components/workflow/agent-node'
import { NodePalette } from '@/components/palette/node-palette'
import { ApprovalQueue } from '@/components/approval/approval-queue'
import { ExecutionPanel } from '@/components/execution/execution-panel'
import { NodeConfigPanel } from '@/components/config/node-config-panel'
import { useWorkflowStore, nodeToFlow } from '@/stores/workflow-store'
import { useExecutionStore } from '@/stores/execution-store'
import { executeWorkflow } from '@/lib/engine'
import { getCategoryForType, type NodeType, type NodeCategory, type NodeExecutionStatus } from '@/lib/types'
import { TemplateGallery } from '@/components/workflow/template-gallery'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Upload,
  Workflow,
  Lightbulb,
  Save,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { LoadWorkflowDialog } from '@/components/workflow/load-workflow-dialog'

let nodeIdCounter = 0

export default function WorkflowBuilder() {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const [templateOpen, setTemplateOpen] = useState(false)

  const storeNodes = useWorkflowStore((s) => s.nodes)
  const storeEdges = useWorkflowStore((s) => s.edges)
  const workflowName = useWorkflowStore((s) => s.name)
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const selectNode = useWorkflowStore((s) => s.selectNode)
  const addEdgeToStore = useWorkflowStore((s) => s.addEdge)
  const addNode = useWorkflowStore((s) => s.addNode)
  const removeNode = useWorkflowStore((s) => s.removeNode)
  const updateNodePosition = useWorkflowStore((s) => s.updateNodePosition)
  const undo = useWorkflowStore((s) => s.undo)
  const redo = useWorkflowStore((s) => s.redo)
  const reset = useWorkflowStore((s) => s.reset)
  const workflowId = useWorkflowStore((s) => s.workflowId)
  const setWorkflowId = useWorkflowStore((s) => s.setWorkflowId)
  const setName = useWorkflowStore((s) => s.setName)

  // Read execution state for edge coloring
  const executionSteps = useExecutionStore((state) => {
    const activeResult = state.results.find((r) => r.runId === state.activeResultId)
    if (!activeResult) return null
    // Return a simple map of nodeId → status for fast lookup
    const map: Record<string, NodeExecutionStatus> = {}
    for (const step of activeResult.steps) {
      map[step.nodeId] = step.status
    }
    return map
  })

  const flowNodes = useMemo(() => storeNodes.map(nodeToFlow), [storeNodes])
  const flowEdges = useMemo(
    () =>
      storeEdges.map((e) => {
        const sourceStatus = executionSteps?.[e.source]
        let stroke = '#64748b' // default gray
        let strokeWidth = 2
        let animated = true

        if (sourceStatus === 'success') {
          stroke = '#10b981' // emerald
          strokeWidth = 2.5
          animated = true
        } else if (sourceStatus === 'running') {
          stroke = '#3b82f6' // blue
          strokeWidth = 2.5
          animated = true
        } else if (sourceStatus === 'error') {
          stroke = '#ef4444' // red
          strokeWidth = 2.5
          animated = false
        }

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: 'smoothstep' as const,
          animated,
          style: { stroke, strokeWidth },
        }
      }),
    [storeEdges, executionSteps]
  )

  const [, , onNodesChange] = useNodesState(flowNodes)
  const [, , onEdgesChange] = useEdgesState(flowEdges)

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes)
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position)
        }
        if (change.type === 'remove') {
          removeNode(change.id)
        }
      }
    },
    [onNodesChange, updateNodePosition, removeNode]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdgeToStore({
          id: `edge-${++nodeIdCounter}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: (connection.sourceHandle ?? 'default') as 'default' | 'true' | 'false' | 'error' | 'approved' | 'rejected',
          targetHandle: (connection.targetHandle ?? 'input') as 'default' | 'input',
        })
      }
    },
    [addEdgeToStore]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const data = event.dataTransfer.getData('application/openworkflow')
      if (!data) return

      const { type, category } = JSON.parse(data) as { type: NodeType; category: NodeCategory }
      const position = reactFlowInstance.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      if (position) {
        addNode({
          id: `node-${++nodeIdCounter}-${Date.now()}`,
          type,
          label: `${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}`,
          category,
          config: {},
          position,
        })
      }
    },
    [addNode]
  )

  const handleRun = useCallback(() => {
    if (storeNodes.length === 0) return
    executeWorkflow('wf-demo', storeNodes, storeEdges)
  }, [storeNodes, storeEdges])

  const handleExport = useCallback(() => {
    const data = JSON.stringify({ name: workflowName, nodes: storeNodes, edges: storeEdges }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [storeNodes, storeEdges, workflowName])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (data.nodes && data.edges) {
            reset()
            for (const node of data.nodes) addNode(node)
            for (const edge of data.edges) addEdgeToStore(edge)
          }
        } catch {
          /* invalid json */
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [reset, addNode, addEdgeToStore])

  // ─── Keyboard shortcuts ────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT'

      if (isInput) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault()
          removeNode(selectedNodeId)
          selectNode(null)
        }
      }
      if (e.key === 'Escape') {
        selectNode(null)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, removeNode, selectNode, undo, redo])

  // ─── Save workflow ────────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      if (workflowId) {
        const res = await fetch(`/api/workflows/${workflowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: workflowName, nodes: storeNodes, edges: storeEdges }),
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
        toast({ title: 'Workflow saved', description: 'Changes saved successfully' })
      } else {
        const res = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: workflowName, nodes: storeNodes, edges: storeEdges }),
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
        setWorkflowId(json.data.id)
        toast({ title: 'Workflow saved', description: 'Created new saved workflow' })
      }
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    }
  }, [workflowId, workflowName, storeNodes, storeEdges, setWorkflowId])

  const nodeCount = storeNodes.length
  const edgeCount = storeEdges.length
  const hasTrigger = storeNodes.some((n) => getCategoryForType(n.type).category === 'trigger')

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <Workflow className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-zinc-100">OpenWorkflow Builder</h1>
            <p className="text-[10px] text-zinc-500 font-mono">{nodeCount} nodes · {edgeCount} edges</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={undo} title="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={redo} title="Redo">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={() => setTemplateOpen(true)} title="Templates">
            <Lightbulb className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={handleImport} title="Import">
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={handleExport} title="Export">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={handleSave} title="Save">
            <Save className="h-3.5 w-3.5" />
          </Button>
          <LoadWorkflowDialog />
          <div className="w-px h-5 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={reset} title="Clear">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-zinc-700 mx-1" />
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={handleRun}
            disabled={nodeCount === 0}
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          {!hasTrigger && nodeCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
              Add a trigger node
            </Badge>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <NodePalette />

        {/* Canvas */}
        <div className="flex-1 relative">
          {/* Empty state overlay */}
          {storeNodes.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-3 text-center pointer-events-auto">
                <div className="h-14 w-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <Workflow className="h-7 w-7 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Start building your workflow
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Drag nodes from the palette, or pick a template
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-zinc-600 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-500"
                  onClick={() => setTemplateOpen(true)}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Browse Templates
                </Button>
              </div>
            </div>
          )}
          <ReactFlow
            onInit={(instance) => { reactFlowInstance.current = instance }}
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={handleNodesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={(_event, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            proOptions={{ hideAttribution: true }}
            className="bg-zinc-950"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
            <Controls className="!bg-zinc-800 !border-zinc-700 [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700" />
            <MiniMap
              nodeColor={(n) => {
                const cat = getCategoryForType(n.data?.nodeType as NodeType)
                return cat.category === 'trigger' ? '#3b82f6' :
                  cat.category === 'logic' ? '#10b981' :
                  cat.category === 'ai' ? '#8b5cf6' :
                  cat.category === 'human' ? '#f59e0b' : '#06b6d4'
              }}
              className="!bg-zinc-900 !border-zinc-700"
              maskColor="rgba(0,0,0,0.7)"
            />
          </ReactFlow>

          {/* Template Gallery Dialog */}
          <TemplateGallery open={templateOpen} onOpenChange={setTemplateOpen} />
        </div>

        {/* Right panels */}
        <div className="w-72 border-l border-zinc-800 bg-zinc-900/80 flex flex-col">
          {selectedNodeId ? (
            <NodeConfigPanel />
          ) : (
            <>
              <div className="flex-1 overflow-hidden">
                <ApprovalQueue />
              </div>
              <div className="border-t border-zinc-800 flex-1 overflow-hidden">
                <ExecutionPanel />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
