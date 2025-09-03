"use client"

import { useEffect, useRef } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import type { PaneId, WorkbenchState, WorkbenchTab } from "./types"
import { useCurrentFileID } from "@/services/tabs"
import { fileCollection } from "@/lib/collections"
import { eq, useLiveQuery } from "@tanstack/react-db"
import WorkbenchPane from "./WorkbenchPane"
import EmptyPane from "./EmptyPane"
import { useWorkbenchPersistedState } from "./hooks/useWorkbenchPersistedState"
import { usePaneSizes } from "./hooks/usePaneSizes"

type WorkbenchPanesProps = {
  projectId: string
  renderContent: (tab: WorkbenchTab) => React.ReactNode
}

export function WorkbenchPanes({
  projectId,
  renderContent,
}: WorkbenchPanesProps) {
  const [state, setState] = useWorkbenchPersistedState(projectId)
  const lastActivePaneRef = useRef<PaneId>("left")

  // Observe sidebar selection and open/focus in the last active pane
  const currentFileId = useCurrentFileID()
  const fileIdForQuery = currentFileId ?? "__none__"
  const { data: fileRows = [] } = useLiveQuery(
    (q) =>
      q.from({ c: fileCollection }).where(({ c }) => eq(c.id, fileIdForQuery)),
    [fileIdForQuery]
  )
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

  const { defaultSizes, handleSizeChange } = usePaneSizes(projectId)

  const leftHasTabs = state.panes.left.tabs.length > 0
  const rightHasTabs = state.panes.right.tabs.length > 0

  return (
    <div className="h-full min-h-0 w-full">
      {leftHasTabs && rightHasTabs ? (
        <ResizablePanelGroup direction="horizontal" onLayout={handleSizeChange}>
          <ResizablePanel minSize={20} defaultSize={defaultSizes[0]}>
            <WorkbenchPane
              paneId="left"
              state={state}
              setState={setState}
              renderContent={renderContent}
              onFocusPane={(id) => (lastActivePaneRef.current = id)}
              currentFileId={currentFileId}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize={20} defaultSize={defaultSizes[1]}>
            <WorkbenchPane
              paneId="right"
              state={state}
              setState={setState}
              renderContent={renderContent}
              onFocusPane={(id) => (lastActivePaneRef.current = id)}
              currentFileId={currentFileId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : leftHasTabs ? (
        <div className="h-full w-full">
          <WorkbenchPane
            paneId="left"
            state={state}
            setState={setState}
            renderContent={renderContent}
            onFocusPane={(id) => (lastActivePaneRef.current = id)}
            currentFileId={currentFileId}
          />
        </div>
      ) : rightHasTabs ? (
        <div className="h-full w-full">
          <WorkbenchPane
            paneId="right"
            state={state}
            setState={setState}
            renderContent={renderContent}
            onFocusPane={(id) => (lastActivePaneRef.current = id)}
            currentFileId={currentFileId}
          />
        </div>
      ) : (
        <EmptyPane />
      )}
    </div>
  )
}

export default WorkbenchPanes
