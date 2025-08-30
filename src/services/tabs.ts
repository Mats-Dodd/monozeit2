import {
  createCollection,
  eq,
  inArray,
  and,
  localStorageCollectionOptions,
  useLiveQuery,
} from "@tanstack/react-db"
import { z } from "zod"
import { fileCollection } from "@/lib/collections"
import { useMemo } from "react"

export type TabItem = {
  id: string
  name: string
  isActive: boolean
}

export const tabsCollection = createCollection(
  localStorageCollectionOptions({
    id: "tabs",
    storageKey: "app-tabs-v2",
    getKey: (item) => item.fileId,
    schema: z.object({
      projectId: z.string(),
      fileId: z.string(),
      isActive: z.boolean(),
    }),
  })
)

export const handleFileClick = (projectId: string, fileId: string) => {
  setActiveTabFileID(projectId, fileId)
}

export function setActiveTabFileID(projectId: string, fileId: string) {
  if (fileInTabs(fileId)) {
    clearActiveTabs(projectId)
    tabsCollection.update(fileId, (draft) => {
      draft.isActive = true
      draft.projectId = projectId
    })
  } else {
    clearActiveTabs(projectId)
    tabsCollection.insert({ projectId, fileId, isActive: true })
  }
}

const clearActiveTabs = (projectId: string) => {
  tabsCollection.map((item) => {
    if (item.projectId === projectId) {
      tabsCollection.update(item.fileId, (draft) => {
        draft.isActive = false
      })
    }
  })
}

export function clearTabsForProject(projectId: string) {
  tabsCollection.map((item) => {
    if (item.projectId === projectId) {
      const itemID = item.fileId
      tabsCollection.delete(itemID)
    }
  })
}

function fileInTabs(fileId: string) {
  return tabsCollection.get(fileId)
}

export const useActiveTabFileID = (projectId: string | undefined) => {
  const { data: activeTabFileID = [] } = useLiveQuery(
    (query) =>
      query
        .from({ c: tabsCollection })
        .where((refs) =>
          and(eq(refs.c.isActive, true), eq(refs.c.projectId, projectId ?? ""))
        ),
    [projectId]
  )

  return activeTabFileID[0]?.fileId
}

export const useTabItems = (projectId: string | undefined) => {
  const { data: tabs = [] } = useLiveQuery(
    (query) =>
      query
        .from({ c: tabsCollection })
        .where((refs) => eq(refs.c.projectId, projectId ?? "")),
    [projectId]
  )

  const fileIds = useMemo(() => tabs.map((tab) => tab.fileId), [tabs])
  const activeId = useMemo(
    () => tabs.find((tab) => tab.isActive)?.fileId,
    [tabs]
  )

  const { data: files = [] } = useLiveQuery(
    (query) =>
      query
        .from({ c: fileCollection })
        .where((refs) => inArray(refs.c.id, fileIds)),
    [fileIds]
  )

  const idToFile = useMemo(() => {
    return new Map(files.map((f) => [f.id, f] as const))
  }, [files])

  const items: TabItem[] = useMemo(
    () =>
      fileIds
        .map((id) => {
          const f = idToFile.get(id)
          if (!f) return undefined
          return { id: f.id, name: f.name, isActive: id === activeId }
        })
        .filter((v): v is TabItem => Boolean(v)),
    [fileIds, idToFile, activeId]
  )

  return { items, activeId }
}

export const useCloseTab = (projectId: string | undefined) => {
  return (fileId: string) => {
    const currentTab = tabsCollection.get(fileId)
    const wasActive =
      currentTab?.isActive === true && currentTab?.projectId === projectId

    // Get remaining tabs for the same project BEFORE deleting the current one
    const remainingTabs: Array<{ fileId: string; isActive: boolean }> = []
    tabsCollection.map((tab) => {
      if (tab.fileId !== fileId && tab.projectId === projectId) {
        remainingTabs.push(tab)
      }
    })

    // Remove the tab
    tabsCollection.delete(fileId)

    // If the closed tab was active, set another tab as active
    if (wasActive && remainingTabs.length > 0) {
      // Set the first remaining tab as active
      tabsCollection.update(remainingTabs[0].fileId, (draft) => {
        draft.isActive = true
      })
    }
  }
}
