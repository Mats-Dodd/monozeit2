import {
  createCollection,
  localStorageCollectionOptions,
  useLiveQuery,
} from "@tanstack/react-db"
import { z } from "zod"

export const tabsCollection = createCollection(
  localStorageCollectionOptions({
    id: "tabs",
    storageKey: "app-tabs",
    getKey: (item) => item.fileId,
    schema: z.object({
      fileId: z.string(),
    }),
  })
)

export const handleFileClick = (fileId: string) => {
  setActiveTabFileID(fileId)
}

export function setActiveTabFileID(fileId: string) {
  clearActiveTabFileID()
  tabsCollection.insert({ fileId })
}

export function clearActiveTabFileID() {
  tabsCollection.map((item) => {
    const itemID = item.fileId
    tabsCollection.delete(itemID)
  })
}

export const useActiveTabFileID = () => {
  const { data: activeTabFileID } = useLiveQuery((query) =>
    query.from({ c: tabsCollection }).select(({ c }) => ({ fileId: c.fileId }))
  )
  return activeTabFileID[0]?.fileId
}
