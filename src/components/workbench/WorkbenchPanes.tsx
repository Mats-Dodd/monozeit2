"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PaneId, WorkbenchState, WorkbenchTab } from "./types"
import { getDragData, setDragData } from "./dnd"
import { useCurrentFileID } from "@/services/tabs"
import { fileCollection } from "@/lib/collections"
import { eq, useLiveQuery } from "@tanstack/react-db"

type WorkbenchPanesProps = {
  projectId: string
  renderContent: (tab: WorkbenchTab) => React.ReactNode
}

export function WorkbenchPanes({
  projectId,
  renderContent,
}: WorkbenchPanesProps) {
  const [state, setState] = usePersistedState(projectId)
  const lastActivePaneRef = useRef<PaneId>("left")

  // Observe sidebar selection and open/focus in the last active pane
  const currentFileId = useCurrentFileID()
  const { data: fileRows = [] } = currentFileId
    ? useLiveQuery(
        (q) =>
          q
            .from({ c: fileCollection })
            .where(({ c }) => eq(c.id, currentFileId)),
        [currentFileId]
      )
    : { data: [] }
  const currentFileName = fileRows?.[0]?.name as string | undefined

  useEffect(() => {
    if (!currentFileId) return
    const tabId = `file:${currentFileId}`
    const title = currentFileName ?? currentFileId

    setState((prev) => {
      let titleChanged = false

      const updateTitles = (tabs: WorkbenchTab[]) =>
        tabs.map((t) => {
          if (
            t.id === tabId &&
            currentFileName &&
            t.title !== currentFileName
          ) {
            titleChanged = true
            return { ...t, title: currentFileName }
          }
          return t
        })

      const leftTabs = updateTitles(prev.panes.left.tabs)
      const rightTabs = updateTitles(prev.panes.right.tabs)

      const leftHas = leftTabs.some((t) => t.id === tabId)
      const rightHas = rightTabs.some((t) => t.id === tabId)

      if (leftHas || rightHas) {
        const focusPane: PaneId = leftHas ? "left" : "right"
        const next: WorkbenchState = {
          panes: {
            left: {
              tabs: leftTabs,
              activeTabId:
                focusPane === "left" ? tabId : prev.panes.left.activeTabId,
            },
            right: {
              tabs: rightTabs,
              activeTabId:
                focusPane === "right" ? tabId : prev.panes.right.activeTabId,
            },
          },
        }
        if (
          (focusPane === "left" && prev.panes.left.activeTabId !== tabId) ||
          (focusPane === "right" && prev.panes.right.activeTabId !== tabId) ||
          titleChanged
        ) {
          lastActivePaneRef.current = focusPane
          return next
        }
        return prev
      }

      const target = lastActivePaneRef.current
      const newTab: WorkbenchTab = { id: tabId, title, fileId: currentFileId }
      const next: WorkbenchState = {
        panes: {
          left: {
            tabs: target === "left" ? [...leftTabs, newTab] : leftTabs,
            activeTabId:
              target === "left" ? newTab.id : prev.panes.left.activeTabId,
          },
          right: {
            tabs: target === "right" ? [...rightTabs, newTab] : rightTabs,
            activeTabId:
              target === "right" ? newTab.id : prev.panes.right.activeTabId,
          },
        },
      }
      lastActivePaneRef.current = target
      return next
    })
  }, [currentFileId, currentFileName, setState])

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
            onFocusPane={(id) => (lastActivePaneRef.current = id)}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={20} defaultSize={defaultSizes[1]}>
          <PaneView
            paneId="right"
            state={state}
            setState={setState}
            renderContent={renderContent}
            onFocusPane={(id) => (lastActivePaneRef.current = id)}
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
  onFocusPane,
}: {
  paneId: PaneId
  state: WorkbenchState
  setState: React.Dispatch<React.SetStateAction<WorkbenchState>>
  renderContent: (tab: WorkbenchTab) => React.ReactNode
  onFocusPane: (paneId: PaneId) => void
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
        onMouseDown={() => onFocusPane(paneId)}
      >
        {pane.tabs.map((tab, index) => (
          <TabChip
            key={tab.id}
            tab={tab}
            active={activeTabId === tab.id}
            onActivate={() => {
              onFocusPane(paneId)
              setActive(tab.id)
            }}
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
