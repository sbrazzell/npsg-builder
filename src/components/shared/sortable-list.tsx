'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { toast } from 'sonner'

// ─── Drag handle ─────────────────────────────────────────────────────────────

export function DragHandle({ listeners, attributes }: {
  listeners?: DraggableSyntheticListeners
  attributes?: DraggableAttributes
}) {
  return (
    <button
      type="button"
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing touch-none shrink-0 flex items-center justify-center"
      style={{ color: 'var(--ink-4)', padding: '2px' }}
      title="Drag to reorder"
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
}

// ─── Sortable item wrapper ────────────────────────────────────────────────────

export function SortableItem({
  id,
  children,
}: {
  id: string
  children: (props: { dragHandleProps: { listeners?: DraggableSyntheticListeners; attributes?: DraggableAttributes }; isDragging: boolean }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { listeners, attributes }, isDragging })}
    </div>
  )
}

// ─── Sortable list container ──────────────────────────────────────────────────

interface SortableListProps<T extends { id: string }> {
  items: T[]
  onReorder: (siteId: string, orderedIds: string[]) => Promise<{ success: boolean; error?: string }>
  siteId: string
  renderItem: (
    item: T,
    dragHandleProps: { listeners?: DraggableSyntheticListeners; attributes?: DraggableAttributes },
    isDragging: boolean,
    index: number,
  ) => React.ReactNode
}

export function SortableList<T extends { id: string }>({
  items: initialItems,
  onReorder,
  siteId,
  renderItem,
}: SortableListProps<T>) {
  const [items, setItems] = useState(initialItems)
  // True while a drag-reorder is in flight — prevents props sync from overwriting optimistic order
  const reorderInFlight = useRef(false)

  // Sync internal state when the server refreshes data (e.g. after editing an item).
  // Skipped while a drag reorder is in flight to preserve the optimistic order.
  useEffect(() => {
    if (!reorderInFlight.current) {
      setItems(initialItems)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    reorderInFlight.current = true
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        reorderInFlight.current = false
        return
      }

      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      const reordered = arrayMove(items, oldIndex, newIndex)

      setItems(reordered) // optimistic update
      const result = await onReorder(siteId, reordered.map((i) => i.id))
      reorderInFlight.current = false
      if (!result.success) {
        setItems(items) // revert
        toast.error(result.error || 'Failed to save order')
      }
    },
    [items, onReorder, siteId],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item, idx) => (
          <SortableItem key={item.id} id={item.id}>
            {({ dragHandleProps, isDragging }) => renderItem(item, dragHandleProps, isDragging, idx)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  )
}
