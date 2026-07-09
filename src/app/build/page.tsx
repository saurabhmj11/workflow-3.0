'use client'

import { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type ReactFlowInstance,
  type NodeChange,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes } from '@/components/workflow/agent-node'
import { FlowEdge } from '@/components/edges/flow-edge'
import { NodePalette } from '@/components/palette/node-palette'
import { ApprovalQueue } from '@/components/approval/approval-queue'
import { ExecutionReplay } from '@/components/execution/execution-replay'
import { NodeConfigPanel } from '@/components/config/node-config-panel'
import { useWorkflowStore, nodeToFlow } from '@/stores/workflow-store'
import { useExecutionStore } from '@/stores/execution-store'
import { executeWorkflow } from '@/lib/engine'
import { getCategoryForType, type NodeType, type NodeCategory, type NodeDefinition } from '@/lib/types'
import { TemplateGallery } from '@/components/workflow/template-gallery'
import { WorkflowGenerator } from '@/components/workflow/workflow-generator'
import { AIEmployeeDemo } from '@/components/workflow/ai-employee-demo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Square,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Upload,
  Workflow,
  Lightbulb,
  Save,
  LayoutGrid,
  GitCommitHorizontal,
  Plug,
  Wand2,
  Headphones,
  Rocket,
  Star,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { LoadWorkflowDialog } from '@/components/workflow/load-workflow-dialog'
import { VersionHistory } from '@/components/workflow/version-history'
import { autoLayout } from '@/lib/auto-layout'
import { ToolBrowser } from '@/components/mcp/tool-browser'
import { ErrorBoundary } from '@/components/error-boundary'
import { TutorialLayer } from '@/components/tutorial/tutorial-layer'

let nodeIdCounter = 0

const edgeTypes = { flow: FlowEdge }

export default function WorkflowBuilder() {
  const router = useRouter()
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [toolBrowserOpen, setToolBrowserOpen] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<number | null>(null)
  const templateLoadedRef = useRef(false)

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

  // Read execution state for edge coloring — use the pre-computed stable map from the store
  const nodeStatusMap = useExecutionStore((s) => s.nodeStatusMap)
  const isRunning = useExecutionStore((s) => s.isRunning)

  const flowNodes = useMemo(() => storeNodes.map(nodeToFlow), [storeNodes])
  const flowEdges = useMemo(
    () =>
      storeEdges.map((e) => {
        const sourceStatus = nodeStatusMap[e.source]
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

        // Build a label from the sourceHandle (e.g. "true", "false", "approved")
        const handleLabel = e.sourceHandle && e.sourceHandle !== 'default' ? e.sourceHandle : undefined

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: 'flow' as const,
          animated,
          style: { stroke, strokeWidth },
          data: { label: handleLabel },
        }
      }),
    [storeEdges, nodeStatusMap]
  )

  // ─── Controlled mode: apply node changes directly to store ───
  // Previously used useNodesState/useEdgesState which created conflicting internal state
  // when combined with controlled `nodes={flowNodes}`/`edges={flowEdges}` props.
  // This caused stale state and crashes when nodeStatusMap updated during execution.
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position)
        }
        if (change.type === 'remove') {
          removeNode(change.id)
        }
      }
    },
    [updateNodePosition, removeNode]
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
    if (storeNodes.length === 0) {
      toast({ title: 'No nodes', description: 'Add some nodes to the canvas before running' })
      return
    }
    // Prevent double-execution
    if (isRunning) {
      toast({ title: 'Already running', description: 'A workflow execution is already in progress' })
      return
    }
    // Snapshot nodes/edges immediately to avoid stale closure
    const nodesSnapshot = storeNodes.map(n => ({ ...n, config: { ...n.config } }))
    const edgesSnapshot = [...storeEdges]

    // Fire-and-forget with full error handling
    executeWorkflow('wf-demo', nodesSnapshot, edgesSnapshot).catch((err) => {
      console.error('[OpenWorkflow] Execution failed:', err)
      // Ensure isRunning is reset even if engine crashes
      try {
        const store = useExecutionStore.getState()
        if (store.isRunning) {
          store.forceResetRunning()
        }
        if (store.currentRunId) {
          store.completeRun(store.currentRunId, { status: 'error', output: { error: 'Execution crashed: ' + (err instanceof Error ? err.message : 'Unknown error') }, totalDurationMs: 0 })
        }
      } catch {
        // Last resort — force reset
        useExecutionStore.setState({ isRunning: false, currentRunId: null })
      }
      toast({ title: 'Execution failed', description: err instanceof Error ? err.message : 'An unexpected error occurred', variant: 'destructive' })
    })
  }, [storeNodes, storeEdges, isRunning])

  const handleAutoLayout = useCallback(() => {
    if (storeNodes.length === 0) return
    const layoutedNodes = autoLayout(storeNodes, storeEdges)
    for (const node of layoutedNodes) {
      updateNodePosition(node.id, node.position)
    }
    // Fit view after layout with a short delay to allow React to re-render
    setTimeout(() => reactFlowInstance.current?.fitView({ padding: 0.2, duration: 300 }), 50)
  }, [storeNodes, storeEdges, updateNodePosition])

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

  // ─── Auto-load template from sessionStorage (demo page redirect) ───
  useEffect(() => {
    if (templateLoadedRef.current) return
    const templateId = sessionStorage.getItem('openworkflow-load-template')
    if (templateId) {
      sessionStorage.removeItem('openworkflow-load-template')
      templateLoadedRef.current = true

      const { WORKFLOW_TEMPLATES } = require('@/lib/templates')
      const template = WORKFLOW_TEMPLATES.find((t: { id: string }) => t.id === templateId)
      if (template) {
        reset()
        let counter = 0
        const nodeIdMap: string[] = []
        const nodesToAdd: NodeDefinition[] = []

        for (const node of template.nodes) {
          const id = `node-${++counter}-${Date.now()}`
          nodeIdMap.push(id)
          nodesToAdd.push({
            id,
            type: node.type,
            label: node.label,
            category: node.category,
            config: { ...node.config },
            position: { ...node.position },
          })
        }

        const layoutedNodes = autoLayout(nodesToAdd, template.edges.map((e: { sourceIndex: number; targetIndex: number; sourceHandle: string; targetHandle: string }) => ({
          id: `edge-0`,
          source: nodeIdMap[e.sourceIndex],
          target: nodeIdMap[e.targetIndex],
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })), 'TB', 180, 80)

        for (const node of layoutedNodes) {
          addNode(node)
        }

        for (const edge of template.edges) {
          addEdgeToStore({
            id: `edge-${++counter}-${Date.now()}`,
            source: nodeIdMap[edge.sourceIndex],
            target: nodeIdMap[edge.targetIndex],
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          })
        }

        setName(template.name)

        // Fit view after layout
        setTimeout(() => reactFlowInstance.current?.fitView({ padding: 0.2, duration: 500 }), 100)
        toast({ title: 'AI Support Employee loaded!', description: 'Click Run to test the workflow' })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      let wfId = workflowId

      if (wfId) {
        // Update existing workflow
        const res = await fetch(`/api/workflows/${wfId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: workflowName, nodes: storeNodes, edges: storeEdges }),
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
      } else {
        // Create new workflow
        const res = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: workflowName, nodes: storeNodes, edges: storeEdges }),
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
        wfId = json.data.id
        setWorkflowId(wfId)
      }

      // Create a version snapshot
      const verRes = await fetch(`/api/workflows/${wfId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeNote: 'Manual save',
          nodes: storeNodes,
          edges: storeEdges,
        }),
      })
      const verJson = await verRes.json()
      if (verJson.ok) {
        setCurrentVersion(verJson.data.version)
      }

      toast({ title: 'Workflow saved', description: wfId === workflowId ? 'Changes saved with new version' : 'Created new saved workflow' })
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    }
  }, [workflowId, workflowName, storeNodes, storeEdges, setWorkflowId])

  const handleVersionRestored = useCallback(() => {
    // Refresh current version after restore
    if (workflowId) {
      fetch(`/api/workflows/${workflowId}/versions`)
        .then((r) => r.json())
        .then((json) => {
          if (json.ok && json.data.length > 0) {
            setCurrentVersion(json.data[0].version)
          }
        })
        .catch(() => {})
    }
  }, [workflowId])

  const nodeCount = storeNodes.length
  const edgeCount = storeEdges.length
  const hasTrigger = storeNodes.some((n) => getCategoryForType(n.type).category === 'trigger')

  return (
    <ErrorBoundary>
    <div className="h-screen flex flex-col bg-[#F0F8FF] font-sans">
      {/* Toolbar */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center border border-white shadow-sm">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-tight text-slate-800 tracking-tight">Workflow Builder</h1>
            <p className="text-sm text-slate-500 font-bold">{nodeCount} Blocks · {edgeCount} Connections</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={undo} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={redo} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-slate-200 mx-1" />
          
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={() => router.push('/demo')} title="AI Employee Demo">
            <Headphones className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={() => setGeneratorOpen(true)} title="AI Generate">
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={() => setTemplateOpen(true)} title="Templates">
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={handleAutoLayout} title="Tidy Up" disabled={storeNodes.length === 0}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-slate-200 mx-1" />
          
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={handleImport} title="Import">
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={handleExport} title="Export">
            <Download className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-slate-200 mx-1" />
          
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900" onClick={handleSave} title="Save">
            <Save className="h-4 w-4" />
          </Button>
          <LoadWorkflowDialog />
          
          <div className="w-px h-6 bg-slate-200 mx-1" />
          
          <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700" onClick={reset} title="Clear Everything">
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-slate-200 mx-1" />
          
          <Button
            size="default"
            variant={isRunning ? "destructive" : "default"}
            className="gap-2"
            onClick={isRunning ? () => useExecutionStore.getState().forceResetRunning() : handleRun}
            disabled={nodeCount === 0}
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4 fill-current" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Run Workflow
              </>
            )}
          </Button>
          
          {!hasTrigger && nodeCount > 0 && (
            <Badge variant="outline" className="text-xs text-orange-600 bg-orange-50 border-orange-200">
              Add a Trigger!
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
              <div className="flex flex-col items-center gap-6 text-center pointer-events-auto max-w-lg bg-background p-10 rounded-xl shadow-sm border">
                <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center border">
                  <Star className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    Workflow Canvas
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Drag and drop nodes from the palette to get started.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4 w-full pt-4">
                  <Button
                    size="default"
                    className="gap-2 w-full"
                    onClick={() => setTemplateOpen(true)}
                  >
                    <Lightbulb className="h-4 w-4" />
                    Browse Templates
                  </Button>
                </div>
              </div>
            </div>
          )}
          <ReactFlow
            onInit={(instance) => { reactFlowInstance.current = instance as any }}
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={handleNodesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={(_event, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            className="bg-blue-50/50"
          >
            <Background variant={BackgroundVariant.Dots} gap={30} size={2} color="#cbd5e1" />
            <Controls className="bg-white! border-slate-200! shadow-lg! rounded-xl! overflow-hidden! [&>button]:bg-white! [&>button]:border-slate-200! [&>button]:text-slate-600! [&>button:hover]:bg-slate-100! [&>button]:w-10 [&>button]:h-10" />
            <MiniMap
              nodeColor={(n) => {
                const cat = getCategoryForType(n.data?.nodeType as NodeType)
                return cat.category === 'trigger' ? '#3b82f6' :
                  cat.category === 'logic' ? '#10b981' :
                  cat.category === 'ai' ? '#8b5cf6' :
                  cat.category === 'human' ? '#f59e0b' : '#06b6d4'
              }}
              className="bg-white! border! border-slate-200! rounded-lg! shadow-lg! overflow-hidden"
              maskColor="rgba(240,248,255,0.7)"
            />
          </ReactFlow>

          {/* Add the tutorial layer */}
          <TutorialLayer />

          {/* AI Employee Demo Dialog */}
          <AIEmployeeDemo open={demoOpen} onOpenChange={setDemoOpen} />

          {/* Workflow Generator Dialog */}
          <WorkflowGenerator open={generatorOpen} onOpenChange={setGeneratorOpen} />

          {/* Template Gallery Dialog */}
          <TemplateGallery open={templateOpen} onOpenChange={setTemplateOpen} />

          {/* MCP Tool Browser Dialog */}
          <ToolBrowser
            open={toolBrowserOpen}
            onOpenChange={setToolBrowserOpen}
          />

          {/* Version History Panel */}
          <VersionHistory
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
            currentVersion={currentVersion}
            onVersionRestored={handleVersionRestored}
          />
        </div>

        {/* Right panels */}
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col shadow-sm z-10">
          {selectedNodeId ? (
            <NodeConfigPanel />
          ) : (
            <>
              <div className="flex-1 overflow-hidden">
                <ApprovalQueue />
              </div>
              <div className="border-t border-slate-200 flex-1 overflow-hidden">
                <ExecutionReplay />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}
