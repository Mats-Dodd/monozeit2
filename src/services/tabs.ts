import {
  createCollection,
  eq,
  inArray,
  localStorageCollectionOptions,
  useLiveQuery,
} from "@tanstack/react-db"
import { z } from "zod"
import { fileCollection } from "@/lib/collections"

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
    console.log("fileInTabs: setting active tab to", fileId)
    clearActiveTabs()
    tabsCollection.update(fileId, (draft) => {
      draft.isActive = true
    })
  } else {
    console.log(
      "fileNotInTabs: setting others to inactive and inserting new tab"
    )
    clearActiveTabs()
    tabsCollection.insert({ fileId, isActive: true })
  }
  // clearActiveTabFileID()
  // tabsCollection.insert({ fileId, isActive: true })
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
  const { data: tabs } = useLiveQuery((query) =>
    query.from({ c: tabsCollection })
  )

  return tabs
}

export const useTabContent = (fileIds: string[]) => {
  const { data: tabContent } = useLiveQuery((query) =>
    query
      .from({ c: fileCollection })
      .where((refs) => inArray(refs.c.id, fileIds))
  )

  return tabContent
}
