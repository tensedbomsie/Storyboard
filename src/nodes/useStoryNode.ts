import { useReactFlow } from '@xyflow/react'
import type { StoryNode } from '../types'

export function useStoryNode(id: string) {
  const { setNodes } = useReactFlow()

  const update = (patch: Partial<StoryNode['data']>) => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  const togglePin = () => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? { ...n, draggable: !!n.data.pinned, data: { ...n.data, pinned: !n.data.pinned } }
          : n,
      ),
    )
  }

  return { update, togglePin }
}
