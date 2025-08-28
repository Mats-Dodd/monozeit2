import {
  createCollection,
  localStorageCollectionOptions,
} from "@tanstack/react-db"
import { z } from "zod"

export const currentFileCollection = createCollection(
  localStorageCollectionOptions({
    id: "current-file",
    storageKey: "app-current-file", // localStorage key
    getKey: (item) => item.fileId,
    schema: z.object({
      fileId: z.string(),
    }),
  })
)

export const handleFileClick = (fileId: string) => {
  console.log("handleFileClick", fileId)
  currentFileCollection.insert({ fileId })
  console.log("currentFileCollection", currentFileCollection.toArray)
}
