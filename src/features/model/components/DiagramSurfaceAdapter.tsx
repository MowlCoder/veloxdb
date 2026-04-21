import { ReactFlowCanvas } from '@/features/model/components/ReactFlowCanvas'
import type { DiagramSurfaceProps } from '@/features/model/components/diagram-surface-types'

type DiagramSurfaceAdapterProps = DiagramSurfaceProps

export function DiagramSurfaceAdapter(props: DiagramSurfaceAdapterProps) {
  return <ReactFlowCanvas {...props} />
}
