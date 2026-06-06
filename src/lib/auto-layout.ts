import dagre from '@dagrejs/dagre'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

export function autoLayout(
  nodes: NodeDefinition[],
  edges: EdgeDefinition[],
  direction: 'TB' | 'LR' = 'LR',
  nodeWidth = 180,
  nodeHeight = 80,
): NodeDefinition[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 })

  for (const node of nodes) {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
    }
  })
}
