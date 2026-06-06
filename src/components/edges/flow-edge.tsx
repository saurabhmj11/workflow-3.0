import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  // Guard against missing coordinates during rapid re-renders
  if (sourceX == null || sourceY == null || targetX == null || targetY == null) {
    return null
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const label = data?.label as string | undefined

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border pointer-events-auto ${
              selected ? 'bg-zinc-800 border-zinc-500 text-zinc-200' : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
