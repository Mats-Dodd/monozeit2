import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import type { PaneId, WorkbenchState, WorkbenchTab } from "./types"
import { getDragData, setDragData } from "./dnd"
import { WORKBENCH_TAB_MIME, STONES_FILE_MIME } from "./dnd/constants"
import { clearCurrentFile } from "@/services/tabs"
import EmptyPane from "./EmptyPane"
import TabChip from "./TabChip"

export default function WorkbenchPane({
  paneId,
  state,
  setState,
  renderContent,
  onFocusPane,
  currentFileId,
}: {
  paneId: PaneId
  state: WorkbenchState
  setState: React.Dispatch<React.SetStateAction<WorkbenchState>>
  renderContent: (tab: WorkbenchTab) => React.ReactNode
  onFocusPane: (paneId: PaneId) => void
  currentFileId: string | undefined
}) {
  const pane = state.panes[paneId]
  const activeTabId = pane.activeTabId ?? pane.tabs[0]?.id
  const [isCrossPaneDragOver, setIsCrossPaneDragOver] = useState(false)

  const getCrossIntent = useCallback(
    (e: React.DragEvent): boolean => {
      const hasTab = e.dataTransfer.types.includes(WORKBENCH_TAB_MIME)
      const hasFile = e.dataTransfer.types.includes(STONES_FILE_MIME)
      if (!hasTab && !hasFile) return false
      const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const relativeX = e.clientX - bounds.left
      const overRightHalf = relativeX > bounds.width * 0.5
      const overLeftHalf = relativeX < bounds.width * 0.5
      const wantsOther = paneId === "left" ? overRightHalf : overLeftHalf
      return wantsOther
    },
    [paneId]
  )

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
    (tabId: string) => {
      let shouldClear = false
      setState((prev) => {
        const tabs = prev.panes[paneId].tabs.filter((t) => t.id !== tabId)
        const nextActive =
          prev.panes[paneId].activeTabId === tabId
            ? tabs[0]?.id
            : prev.panes[paneId].activeTabId
        const next: WorkbenchState = {
          panes: {
            ...prev.panes,
            [paneId]: { tabs, activeTabId: nextActive },
          },
        }
        const removed = prev.panes[paneId].tabs.find((t) => t.id === tabId)
        const removedFileId = removed?.fileId
        if (removedFileId) {
          const stillOpen =
            (paneId === "left"
              ? next.panes.right.tabs
              : next.panes.left.tabs
            ).some((t) => t.fileId === removedFileId) ||
            next.panes[paneId].tabs.some((t) => t.fileId === removedFileId)
          if (!stillOpen && currentFileId === removedFileId) {
            shouldClear = true
          }
        }
        return next
      })
      if (shouldClear) {
        setTimeout(() => clearCurrentFile(), 0)
      }
    },
    [paneId, setState, currentFileId]
  )

  const onDragStartTab = useCallback(
    (e: React.DragEvent, tabId: string) => {
      setDragData(e, "tab", { tabId, fromPaneId: paneId })
    },
    [paneId]
  )

  const onDropOnList = useCallback(
    (e: React.DragEvent, targetIndex?: number, forceToOtherPane?: boolean) => {
      e.preventDefault()
      let destinationPaneId: PaneId = paneId
      if (forceToOtherPane || getCrossIntent(e)) {
        destinationPaneId = paneId === "left" ? "right" : "left"
      }
      // Move tab
      const tabPayload = getDragData<{ tabId: string; fromPaneId: PaneId }>(
        e,
        "tab"
      )
      if (tabPayload?.tabId) {
        const { tabId, fromPaneId } = tabPayload
        if (fromPaneId === destinationPaneId) {
          // Reorder within the same pane
          setState((prev) => {
            const arr = [...prev.panes[destinationPaneId].tabs]
            const fromIndex = arr.findIndex((t) => t.id === tabId)
            if (fromIndex === -1) return prev
            const [moving] = arr.splice(fromIndex, 1)
            let insertAt: number
            if (typeof targetIndex === "number") {
              insertAt = targetIndex > fromIndex ? targetIndex - 1 : targetIndex
            } else {
              insertAt = arr.length
            }
            if (insertAt === fromIndex) return prev
            arr.splice(insertAt, 0, moving)
            return {
              panes: {
                ...prev.panes,
                [destinationPaneId]: { tabs: arr, activeTabId: moving.id },
              },
            }
          })
        } else {
          // Move across panes
          setState((prev) => {
            const source = prev.panes[fromPaneId]
            const moving = source.tabs.find((t) => t.id === tabId)
            if (!moving) return prev
            const sourceTabs = source.tabs.filter((t) => t.id !== tabId)
            const destTabs = [...prev.panes[destinationPaneId].tabs]
            if (destTabs.some((t) => t.id === tabId)) return prev
            const insertAt =
              typeof targetIndex === "number" ? targetIndex : destTabs.length
            destTabs.splice(insertAt, 0, moving)
            const next: WorkbenchState = {
              panes: {
                ...prev.panes,
                [fromPaneId]: {
                  tabs: sourceTabs,
                  activeTabId:
                    prev.panes[fromPaneId].activeTabId === moving.id
                      ? sourceTabs[0]?.id
                      : prev.panes[fromPaneId].activeTabId,
                },
                [destinationPaneId]: {
                  tabs: destTabs,
                  activeTabId: moving.id,
                },
              },
            }
            return next
          })
        }
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
    [paneId, setState, getCrossIntent]
  )

  const allowDrop = useCallback((e: React.DragEvent) => {
    const hasTab = e.dataTransfer.types.includes(WORKBENCH_TAB_MIME)
    const hasFile = e.dataTransfer.types.includes(STONES_FILE_MIME)
    if (hasTab || hasFile) {
      e.preventDefault()
    }
  }, [])

  const handleDragOverPane = useCallback(
    (e: React.DragEvent) => {
      const crossIntent = getCrossIntent(e)
      setIsCrossPaneDragOver(crossIntent)
    },
    [getCrossIntent]
  )

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div
        className="relative flex h-9 items-center gap-1.5 px-2 overflow-x-auto overflow-y-hidden thin-scrollbar scrollbar-gutter-stable scroll-shadows-x"
        onDragOver={(e) => {
          allowDrop(e)
          handleDragOverPane(e)
        }}
        onDrop={(e) => onDropOnList(e)}
        onMouseDown={() => onFocusPane(paneId)}
        onDragLeave={() => setIsCrossPaneDragOver(false)}
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
      <div
        className="flex-1 overflow-auto"
        onDragOver={(e) => {
          allowDrop(e)
          handleDragOverPane(e)
        }}
        onDragLeave={() => setIsCrossPaneDragOver(false)}
        onDrop={(e) => {
          onDropOnList(e, undefined, isCrossPaneDragOver)
          setIsCrossPaneDragOver(false)
        }}
      >
        {(() => {
          const tab = pane.tabs.find((t) => t.id === activeTabId)
          return tab ? renderContent(tab) : <EmptyPane />
        })()}
      </div>
      {isCrossPaneDragOver ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0",
            paneId === "left" ? "right-0" : "left-0"
          )}
        >
          <div className="w-0.5 h-full bg-primary/60" />
        </div>
      ) : null}
    </div>
  )
}
