"use client"

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

type DraggableTreeItemProps = {
  children: ReactNode
  id: string
  data: {
    type: "file" | "folder"
    name: string
    id: string
    parentId: string | null
  }
  canDrop?: boolean
  className?: string
  disabled?: boolean
}

export function DraggableTreeItem({
  children,
  id,
  data,
  canDrop = true,
  className,
  disabled = false,
}: DraggableTreeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data,
    disabled,
  })

  const {
    setNodeRef: setDroppableRef,
    isOver,
    active,
  } = useDroppable({
    id: `droppable-${id}`,
    data: {
      ...data,
      accepts: ["file", "folder"],
    },
    disabled: !canDrop,
  })

  // Only log when actually relevant to avoid clutter
  if (isOver && active) {
    console.log(`🎯 DROPPABLE ACTIVE ${id}:`, {
      type: data.type,
      canDrop,
      isOver,
      isFolder: data.type === "folder",
    })
  }

  // Only folders can accept drops of other items
  const isFolder = data.type === "folder"
  const isDragTarget = isOver && active && isFolder
  const isBeingDragged = isDragging

  // Prevent dropping a folder into itself or its descendants
  const isInvalidDrop =
    isOver &&
    active?.data.current?.type === "folder" &&
    (active.id === id || isDescendantOf(active.id as string, id))

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  function setNodeRef(element: HTMLElement | null) {
    setDraggableRef(element)
    if (isFolder) {
      setDroppableRef(element)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        className,
        isBeingDragged && "opacity-50",
        isDragTarget && !isInvalidDrop && "bg-accent/50",
        isInvalidDrop && "bg-destructive/20"
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

// Helper function to check if a folder is a descendant of another folder
// In a real implementation, this would need access to the folder hierarchy
function isDescendantOf(_childId: string, _parentId: string): boolean {
  // This is a placeholder - in the actual implementation, we would
  // traverse the folder tree to check if childId is a descendant of parentId
  // For now, we'll implement this logic in the main component where we have
  // access to the full folder tree
  return false
}

type DroppableAreaProps = {
  children: ReactNode
  id: string
  position: "before" | "after"
  targetType: "file" | "folder"
  className?: string
}

export function DroppableArea({
  children,
  id,
  position,
  targetType,
  className,
}: DroppableAreaProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `${position}-${id}`,
    data: {
      type: "insertion-point",
      position,
      targetId: id,
      targetType,
    },
  })

  const showDropIndicator = isOver && active

  return (
    <div ref={setNodeRef} className={cn(className)}>
      {showDropIndicator && position === "before" && (
        <div className="h-0.5 bg-primary mx-2 mb-1" />
      )}
      {children}
      {showDropIndicator && position === "after" && (
        <div className="h-0.5 bg-primary mx-2 mt-1" />
      )}
    </div>
  )
}
