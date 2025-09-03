import type * as React from "react"

export const DND_MIME = {
  tab: "application/x-workbench-tab",
  file: "application/x-stones-file",
} as const

export type DragTabPayload = {
  tabId: string
  fromPaneId: "left" | "right"
}

export type DragFilePayload = {
  fileId: string
  title: string
}

export function setDragData(
  e: React.DragEvent,
  type: keyof typeof DND_MIME,
  data: object
) {
  try {
    e.dataTransfer.setData(DND_MIME[type], JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function getDragData<T>(
  e: React.DragEvent,
  type: keyof typeof DND_MIME
): T | null {
  try {
    const raw = e.dataTransfer.getData(DND_MIME[type])
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
