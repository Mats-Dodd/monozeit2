import {
  createCollection,
  localStorageCollectionOptions,
  useLiveQuery,
} from "@tanstack/react-db"
import { z } from "zod"

export const currentFileCollection = createCollection(
  localStorageCollectionOptions({
    id: "current-file",
    storageKey: "app-current-file",
    getKey: (item) => item.fileId,
    schema: z.object({
      fileId: z.string(),
    }),
  })
)

export const handleFileClick = (fileId: string) => {
  setCurrentFile(fileId)
}

export function setCurrentFile(fileId: string) {
  clearCurrentFileCollection()
  currentFileCollection.insert({ fileId })
}

export function clearCurrentFileCollection() {
  currentFileCollection.map((item) => {
    const itemID = item.fileId
    currentFileCollection.delete(itemID)
  })
}

export const useCurrentFileID = () => {
  const { data: currentFileID } = useLiveQuery((query) =>
    query
      .from({ c: currentFileCollection })
      .select(({ c }) => ({ fileId: c.fileId }))
  )
  return currentFileID[0]?.fileId
}
