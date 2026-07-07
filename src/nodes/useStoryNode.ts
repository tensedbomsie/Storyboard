import type { StoryNodeData } from '../types'
import { useBoardActions } from '../BoardActionsContext'
import { useNodesContext } from '../NodesContext'

export function useStoryNode(id: string) {
  const { setNodes } = useNodesContext()
  const { openSendNode } = useBoardActions()

  const update = (patch: Partial<StoryNodeData>) => {
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
    setNodes((nodes) => {
      const node = nodes.find((n) => n.id === id)
      if (node) openSendNode(node)
      return nodes
    })
  }

  return { update, togglePin, sendToAnotherBoard }
}
