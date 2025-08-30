import {
  createCollection,
  eq,
  inArray,
  localStorageCollectionOptions,
  useLiveQuery,
} from "@tanstack/react-db"
import { z } from "zod"
import { fileCollection } from "@/lib/collections"
import { useMemo } from "react"

export const tabsCollection = createCollection(
  localStorageCollectionOptions({
    id: "tabs",
    storageKey: "app-tabs",
    getKey: (item) => item.fileId,
    schema: z.object({
      fileId: z.string(),
      isActive: z.boolean(),
    }),
  })
)

export const handleFileClick = (fileId: string) => {
  setActiveTabFileID(fileId)
}

export function setActiveTabFileID(fileId: string) {
  if (fileInTabs(fileId)) {
    clearActiveTabs()
    tabsCollection.update(fileId, (draft) => {
      draft.isActive = true
    })
  } else {
    clearActiveTabs()
    tabsCollection.insert({ fileId, isActive: true })
  }
}

const clearActiveTabs = () => {
  tabsCollection.map((item) => {
    tabsCollection.update(item.fileId, (draft) => {
      draft.isActive = false
    })
  })
}

export function clearActiveTabFileID() {
  tabsCollection.map((item) => {
    const itemID = item.fileId
    tabsCollection.delete(itemID)
  })
}

function fileInTabs(fileId: string) {
  return tabsCollection.get(fileId)
}

export const useActiveTabFileID = () => {
  const { data: activeTabFileID } = useLiveQuery((query) =>
    query.from({ c: tabsCollection }).where((refs) => eq(refs.c.isActive, true))
  )

  return activeTabFileID[0]?.fileId
}

export const useTabs = () => {
  const { data: tabs = [] } = useLiveQuery((query) =>
    query.from({ c: tabsCollection })
  )

  const fileIds = useMemo(() => tabs.map((tab) => tab.fileId), [tabs])

  const { data: rawTabContent = [] } = useLiveQuery(
    (query) =>
      query
        .from({ c: fileCollection })
        .where((refs) => inArray(refs.c.id, fileIds)),
    [fileIds]
  )

  const idToFile = useMemo(() => {
    return new Map(rawTabContent.map((f) => [f.id, f] as const))
  }, [rawTabContent])

  const tabContent = useMemo(
    () =>
      fileIds
        .map((id) => idToFile.get(id))
        .filter((f): f is (typeof rawTabContent)[number] => Boolean(f)),
    [fileIds, idToFile]
  )

  return { tabs, tabContent }
}

export const useCloseTab = () => {
  return (fileId: string) => {
    const currentTab = tabsCollection.get(fileId)
    const wasActive = currentTab?.isActive

    // Get remaining tabs BEFORE deleting the current one
    const remainingTabs: Array<{ fileId: string; isActive: boolean }> = []
    tabsCollection.map((tab) => {
      if (tab.fileId !== fileId) {
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
