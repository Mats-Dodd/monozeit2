export type PaneId = "left" | "right"

export type WorkbenchTab = {
  id: string
  title: string
  fileId?: string
}

export type PaneState = {
  tabs: WorkbenchTab[]
  activeTabId?: string
}

export type WorkbenchState = {
  panes: Record<PaneId, PaneState>
}
