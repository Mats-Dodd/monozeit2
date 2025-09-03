"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PaneId, WorkbenchState, WorkbenchTab } from "./types"
import { getDragData, setDragData } from "./dnd"

type WorkbenchPanesProps = {
  projectId: string
  renderContent: (tab: WorkbenchTab) => React.ReactNode
}

export function WorkbenchPanes({
  projectId,
  renderContent,
}: WorkbenchPanesProps) {
  const [state, setState] = usePersistedState(projectId)

  const handleSizeChange = useCallback(
    (sizes: number[]) => {
      try {
        localStorage.setItem(sizeKey(projectId), JSON.stringify(sizes))
      } catch {
        // ignore
      }
    },
    [projectId]
  )

  const defaultSizes = useMemo(() => {
    try {
      const raw = localStorage.getItem(sizeKey(projectId))
      return raw ? (JSON.parse(raw) as number[]) : [60, 40]
    } catch {
      return [60, 40]
    }
  }, [projectId])

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup direction="horizontal" onLayout={handleSizeChange}>
        <ResizablePanel minSize={20} defaultSize={defaultSizes[0]}>
          <PaneView
            paneId="left"
            state={state}
            setState={setState}
            renderContent={renderContent}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={20} defaultSize={defaultSizes[1]}>
          <PaneView
            paneId="right"
            state={state}
            setState={setState}
            renderContent={renderContent}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

function sizeKey(projectId: string) {
  return `workbench:sizes:${projectId}`
}

function stateKey(projectId: string) {
  return `workbench:state:${projectId}`
}

function usePersistedState(projectId: string) {
  const [state, setState] = useState<WorkbenchState>(() => {
    try {
      const raw = localStorage.getItem(stateKey(projectId))
      if (raw) return JSON.parse(raw) as WorkbenchState
    } catch {
      // ignore
    }
    return {
      panes: {
        left: { tabs: [], activeTabId: undefined },
        right: { tabs: [], activeTabId: undefined },
      },
    }
  })

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(stateKey(projectId), JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [projectId, state])

  return [state, setState] as const
}

function PaneView({
  paneId,
  state,
  setState,
  renderContent,
}: {
  paneId: PaneId
  state: WorkbenchState
  setState: React.Dispatch<React.SetStateAction<WorkbenchState>>
  renderContent: (tab: WorkbenchTab) => React.ReactNode
}) {
  const pane = state.panes[paneId]
  const activeTabId = pane.activeTabId ?? pane.tabs[0]?.id

  const setActive = useCallback(
    (id: string) =>
      setState((prev) => ({
        panes: {
          ...prev.panes,
          [paneId]: { ...prev.panes[paneId], activeTabId: id },
        },
      })),
    [paneId, setState]
  )

  const closeTab = useCallback(
    (tabId: string) =>
      setState((prev) => {
        const tabs = prev.panes[paneId].tabs.filter((t) => t.id !== tabId)
        const nextActive =
          prev.panes[paneId].activeTabId === tabId
            ? tabs[0]?.id
            : prev.panes[paneId].activeTabId
        return {
          panes: {
            ...prev.panes,
            [paneId]: { tabs, activeTabId: nextActive },
          },
        }
      }),
    [paneId, setState]
  )

  const onDragStartTab = useCallback(
    (e: React.DragEvent, tabId: string) => {
      setDragData(e, "tab", { tabId, fromPaneId: paneId })
    },
    [paneId]
  )

  const onDropOnList = useCallback(
    (e: React.DragEvent, targetIndex?: number) => {
      e.preventDefault()
      // Move tab
      const tabPayload = getDragData<{ tabId: string; fromPaneId: PaneId }>(
        e,
        "tab"
      )
      if (tabPayload?.tabId) {
        const { tabId, fromPaneId } = tabPayload
        setState((prev) => {
          const source = prev.panes[fromPaneId]
          const moving = source.tabs.find((t) => t.id === tabId)
          if (!moving) return prev

          const sourceTabs = source.tabs.filter((t) => t.id !== tabId)
          const destTabs = [...prev.panes[paneId].tabs]
          const insertAt =
            typeof targetIndex === "number" ? targetIndex : destTabs.length
          destTabs.splice(insertAt, 0, moving)

          const next: WorkbenchState = {
            panes: {
              ...prev.panes,
              [fromPaneId]: {
                tabs: sourceTabs,
                activeTabId:
                  fromPaneId === paneId &&
                  prev.panes[paneId].activeTabId === moving.id
                    ? sourceTabs[0]?.id
                    : prev.panes[fromPaneId].activeTabId,
              },
              [paneId]: {
                tabs: destTabs,
                activeTabId: moving.id,
              },
            },
          }
          return next
        })
        return
      }

      // Open external file payloads (future)
      const filePayload = getDragData<{ fileId: string; title: string }>(
        e,
        "file"
      )
      if (filePayload) {
        const { fileId, title } = filePayload
        const newTab: WorkbenchTab = { id: `file:${fileId}`, title, fileId }
        setState((prev) => {
          const exists = prev.panes[paneId].tabs.find((t) => t.id === newTab.id)
          const destTabs = exists
            ? prev.panes[paneId].tabs
            : [...prev.panes[paneId].tabs, newTab]
          return {
            panes: {
              ...prev.panes,
              [paneId]: { tabs: destTabs, activeTabId: newTab.id },
            },
          }
        })
      }
    },
    [paneId, setState]
  )

  const allowDrop = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes("application/x-workbench-tab") ||
      e.dataTransfer.types.includes("application/x-stones-file")
    ) {
      e.preventDefault()
    }
  }, [])

  // const onReorder = useCallback(
  //   (fromIndex: number, toIndex: number) => {
  //     setState((prev) => {
  //       const arr = [...prev.panes[paneId].tabs]
  //       const [item] = arr.splice(fromIndex, 1)
  //       arr.splice(toIndex, 0, item)
  //       return { panes: { ...prev.panes, [paneId]: { ...prev.panes[paneId], tabs: arr } } }
  //     })
  //   },
  //   [paneId, setState]
  // )

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div
        className="flex h-9 items-center gap-1 border-b px-1"
        onDragOver={allowDrop}
        onDrop={(e) => onDropOnList(e)}
      >
        {pane.tabs.map((tab, index) => (
          <TabChip
            key={tab.id}
            tab={tab}
            active={activeTabId === tab.id}
            onActivate={() => setActive(tab.id)}
            onClose={() => closeTab(tab.id)}
            onDragStart={(e) => onDragStartTab(e, tab.id)}
            onDropBefore={(e) => onDropOnList(e, index)}
            onDropAfter={(e) => onDropOnList(e, index + 1)}
          />
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {activeTabId ? (
          renderContent(pane.tabs.find((t) => t.id === activeTabId)!)
        ) : (
          <EmptyPane />
        )}
      </div>
    </div>
  )
}

function TabChip({
  tab,
  active,
  onActivate,
  onClose,
  onDragStart,
  onDropBefore,
  onDropAfter,
}: {
  tab: WorkbenchTab
  active: boolean
  onActivate: () => void
  onClose: () => void
  onDragStart: (e: React.DragEvent) => void
  onDropBefore: (e: React.DragEvent) => void
  onDropAfter: (e: React.DragEvent) => void
}) {
  return (
    <div
      className={cn(
        "inline-flex select-none items-center gap-1 rounded-md px-2 text-sm h-7",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
      draggable
      onDragStart={onDragStart}
      onClick={onActivate}
      onDragOver={(e) => {
        if (
          e.dataTransfer.types.includes("application/x-workbench-tab") ||
          e.dataTransfer.types.includes("application/x-stones-file")
        ) {
          e.preventDefault()
        }
      }}
    >
      <div onDrop={onDropBefore} className="h-5 w-1" />
      <span className="truncate max-w-[180px]">{tab.title}</span>
      <button
        className="ml-1 rounded-sm hover:bg-muted/70"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label={`Close ${tab.title}`}
      >
        <XIcon className="size-3.5" />
      </button>
      <div onDrop={onDropAfter} className="h-5 w-1" />
    </div>
  )
}

function EmptyPane() {
  return (
    <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">
      Drop a file or tab here
    </div>
  )
}

export default WorkbenchPanes
