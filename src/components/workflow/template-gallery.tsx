'use client'

import { useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Headset,
  UserSearch,
  ShieldAlert,
  FileCheck,
  Zap,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from '@/lib/templates'
import { useWorkflowStore } from '@/stores/workflow-store'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

// ─── Icon mapping ─────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Headset,
  UserSearch,
  ShieldAlert,
  FileCheck,
}

// ─── Category styling ─────────────────────────────
const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  support: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Support' },
  sales: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Sales' },
  devops: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'DevOps' },
  general: { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', label: 'General' },
}

// ─── Difficulty styling ────────────────────────────
const DIFFICULTY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  beginner: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  intermediate: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  advanced: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
}

// ─── ID generator ─────────────────────────────────
let templateIdCounter = 0
function generateId(prefix: string): string {
  return `${prefix}-${++templateIdCounter}-${Date.now()}`
}

interface TemplateGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplateGallery({ open, onOpenChange }: TemplateGalleryProps) {
  const addNode = useWorkflowStore((s) => s.addNode)
  const addEdgeToStore = useWorkflowStore((s) => s.addEdge)
  const reset = useWorkflowStore((s) => s.reset)
  const setName = useWorkflowStore((s) => s.setName)

  const loadTemplate = useCallback(
    (template: WorkflowTemplate) => {
      // Reset current workflow
      reset()

      // Generate unique IDs for all nodes and keep a mapping of index → id
      const nodeIdMap: string[] = []
      for (const node of template.nodes) {
        const id = generateId('node')
        nodeIdMap.push(id)
        const fullNode: NodeDefinition = {
          id,
          type: node.type,
          label: node.label,
          category: node.category,
          config: { ...node.config },
          position: { ...node.position },
        }
        addNode(fullNode)
      }

      // Create edges using the index → id mapping
      for (const edge of template.edges) {
        const edgeId = generateId('edge')
        const fullEdge: EdgeDefinition = {
          id: edgeId,
          source: nodeIdMap[edge.sourceIndex],
          target: nodeIdMap[edge.targetIndex],
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        }
        addEdgeToStore(fullEdge)
      }

      // Set the workflow name
      setName(template.name)

      // Close the dialog
      onOpenChange(false)
    },
    [reset, addNode, addEdgeToStore, setName, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Workflow Templates
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Choose a pre-built workflow blueprint to get started quickly. You can customize everything after loading.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {WORKFLOW_TEMPLATES.map((template) => {
            const IconComp = ICON_MAP[template.icon] || Zap
            const catStyle = CATEGORY_STYLES[template.category]
            const diffStyle = DIFFICULTY_STYLES[template.difficulty]

            return (
              <div
                key={template.id}
                className="group relative rounded-xl border border-zinc-700 bg-zinc-800/60 p-5 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:shadow-lg hover:shadow-black/20"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`shrink-0 h-10 w-10 rounded-lg ${catStyle.bg} ${catStyle.border} border flex items-center justify-center`}>
                    <IconComp className={`h-5 w-5 ${catStyle.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-zinc-100 leading-tight">{template.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 ${catStyle.bg} ${catStyle.border} ${catStyle.color}`}
                      >
                        {catStyle.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 ${diffStyle.bg} ${diffStyle.border} ${diffStyle.color}`}
                      >
                        {template.difficulty}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 bg-zinc-700/50 border-zinc-600 text-zinc-300"
                      >
                        {template.nodes.length} nodes
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-3">
                  {template.description}
                </p>

                {/* Node flow preview */}
                <div className="flex items-center gap-1 mb-4 flex-wrap">
                  {template.nodes.slice(0, 5).map((node, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ArrowRight className="h-2.5 w-2.5 text-zinc-600" />}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-300 border border-zinc-600/50 whitespace-nowrap">
                        {node.label}
                      </span>
                    </span>
                  ))}
                  {template.nodes.length > 5 && (
                    <span className="text-[10px] text-zinc-500 ml-1">
                      +{template.nodes.length - 5} more
                    </span>
                  )}
                </div>

                {/* Action */}
                <Button
                  size="sm"
                  className="w-full h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  onClick={() => loadTemplate(template)}
                >
                  Use Template
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
