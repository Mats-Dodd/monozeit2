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
  currentFileCollection.map((item) => {
    const itemID = item.fileId
    currentFileCollection.delete(itemID)
  })
  currentFileCollection.insert({ fileId })
}

export const useCurrentFileID = () => {
  const { data: currentFileID } = useLiveQuery((query) =>
    query
      .from({ c: currentFileCollection })
      .select(({ c }) => ({ fileId: c.fileId }))
  )
  return currentFileID[0]?.fileId
}
