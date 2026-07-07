import { useReactFlow } from '@xyflow/react'
import type { StoryNode } from '../types'
import { useBoardActions } from '../BoardActionsContext'

export function useStoryNode(id: string) {
  const { setNodes, getNode } = useReactFlow<StoryNode>()
  const { openSendNode } = useBoardActions()

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

  const sendToAnotherBoard = () => {
    const node = getNode(id)
    if (node) openSendNode(node)
  }

  return { update, togglePin, sendToAnotherBoard }
}
