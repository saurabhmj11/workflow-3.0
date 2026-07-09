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
  support: { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300', label: 'Helping' },
  sales: { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300', label: 'Selling' },
  devops: { color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300', label: 'Building' },
  general: { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-300', label: 'Fun' },
}

// ─── Difficulty styling ────────────────────────────
const DIFFICULTY_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  beginner: { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', label: 'Easy Peasy' },
  intermediate: { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', label: 'Little Tricky' },
  advanced: { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300', label: 'Super Smart' },
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
      <DialogContent className="bg-slate-50 border-slate-200 text-slate-800 sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-[2rem] shadow-xl [&>button]:right-6 [&>button]:top-6 [&>button]:rounded-full [&>button]:bg-slate-200 [&>button]:p-2 [&>button]:text-slate-600 hover:[&>button]:bg-slate-300">
        <DialogHeader className="pt-2 pb-4">
          <DialogTitle className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <div className="bg-purple-100 p-2.5 rounded-lg border-2 border-purple-200">
              <Layers className="h-7 w-7 text-purple-600" />
            </div>
            Magic Blueprints!
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium text-base mt-3">
            Pick a cool starting idea to build your amazing robot machine! You can change anything you want later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2 pb-4 px-1">
          {WORKFLOW_TEMPLATES.map((template) => {
            const IconComp = ICON_MAP[template.icon] || Zap
            const catStyle = CATEGORY_STYLES[template.category]
            const diffStyle = DIFFICULTY_STYLES[template.difficulty]

            return (
              <div
                key={template.id}
                className="group relative rounded-[1.5rem] border-2 border-slate-200 border-b-[6px] bg-white p-6 transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl active:scale-[0.98] active:border-b-2"
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`shrink-0 h-12 w-12 rounded-lg ${catStyle.bg} ${catStyle.border} border-2 flex items-center justify-center shadow-sm`}>
                    <IconComp className={`h-6 w-6 ${catStyle.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-slate-800 leading-tight mb-2">{template.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border-2 ${catStyle.bg} ${catStyle.border} ${catStyle.color}`}
                      >
                        {catStyle.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border-2 ${diffStyle.bg} ${diffStyle.border} ${diffStyle.color}`}
                      >
                        {diffStyle.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full border-2 bg-slate-100 border-slate-200 text-slate-600"
                      >
                        {template.nodes.length} blocks
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6 line-clamp-3">
                  {template.description}
                </p>

                {/* Node flow preview */}
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  {template.nodes.slice(0, 4).map((node, i) => (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <ArrowRight className="h-4 w-4 text-slate-300 font-bold" strokeWidth={3} />}
                      <span className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 border-2 border-slate-200 whitespace-nowrap shadow-sm">
                        {node.label}
                      </span>
                    </span>
                  ))}
                  {template.nodes.length > 4 && (
                    <span className="text-xs font-bold text-slate-400 ml-1">
                      +{template.nodes.length - 4} more
                    </span>
                  )}
                </div>

                {/* Action */}
                <Button
                  size="sm"
                  className="w-full h-12 gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold text-base rounded-xl border-b border-purple-700 active:border-b-0 active:scale-[0.98] transition-all"
                  onClick={() => loadTemplate(template)}
                >
                  Let's Build It!
                  <Zap className="h-5 w-5 fill-current" />
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
