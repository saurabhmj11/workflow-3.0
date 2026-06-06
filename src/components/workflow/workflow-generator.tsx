'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2, Wand2, AlertCircle } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { toast } from '@/hooks/use-toast'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

const EXAMPLES = [
  'When a customer emails, classify the issue, search docs, draft a response, and escalate if confidence is below 80%',
  'Build a support workflow that classifies tickets as urgent or normal, routes urgent ones to a human, and auto-replies to normal ones',
  'Create a lead qualification workflow: webhook trigger, classify by company size, enrich in CRM, notify sales on Slack',
  'Build an incident response workflow: API trigger, classify severity, notify the right team, create a ticket, escalate if unresolved',
]

interface WorkflowGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowGenerator({ open, onOpenChange }: WorkflowGeneratorProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addNode = useWorkflowStore((s) => s.addNode)
  const addEdge = useWorkflowStore((s) => s.addEdge)
  const setName = useWorkflowStore((s) => s.setName)
  const reset = useWorkflowStore((s) => s.reset)

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })

      const json = await res.json()

      if (!json.ok) {
        setError(json.error || 'Generation failed')
        return
      }

      const workflow = json.data as {
        name?: string
        description?: string
        nodes: NodeDefinition[]
        edges: EdgeDefinition[]
      }

      // Clear existing workflow and load the generated one
      reset()

      // Set workflow name
      if (workflow.name) {
        setName(workflow.name)
      }

      // Add all nodes
      for (const node of workflow.nodes) {
        addNode({
          id: node.id,
          type: node.type as NodeDefinition['type'],
          label: node.label,
          category: node.category as NodeDefinition['category'],
          config: node.config ?? {},
          position: node.position ?? { x: 250, y: 50 },
        })
      }

      // Add all edges
      for (const edge of workflow.edges) {
        addEdge({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: (edge.sourceHandle ?? 'default') as EdgeDefinition['sourceHandle'],
          targetHandle: (edge.targetHandle ?? 'input') as EdgeDefinition['targetHandle'],
        })
      }

      toast({
        title: 'Workflow generated',
        description: `Created ${workflow.nodes.length} nodes and ${workflow.edges.length} connections`,
      })

      // Close dialog and reset form
      onOpenChange(false)
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [description, addNode, addEdge, setName, reset, onOpenChange])

  const handleExampleClick = useCallback((example: string) => {
    setDescription(example)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-violet-400" />
            </div>
            Generate Workflow
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Describe the workflow you want in plain English. AI will create the nodes and connections for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Input */}
          <div className="space-y-2">
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setError(null)
              }}
              placeholder="Describe your workflow... e.g., 'When a customer emails, classify the issue, search docs, and draft a response'"
              rows={4}
              className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-violet-600 resize-none"
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Examples */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 font-medium">Try an example:</p>
            <div className="grid gap-1.5">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  className="text-left text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-md border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-colors"
                  disabled={loading}
                >
                  <span className="text-violet-400 mr-1.5">→</span>
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!description.trim() || loading}
            className="w-full h-10 gap-2 bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating workflow...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Workflow
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
