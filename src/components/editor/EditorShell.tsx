import { useActiveTabFileID } from "@/services/tabs"
import { useGetCurrentFileContent, useGetCurrentFileName } from "./hooks"
import { EditorCore } from "./EditorCore"

export function EditorShell() {
  const fileId = useActiveTabFileID()
  const rawContent = useGetCurrentFileContent(fileId)
  const fileName = useGetCurrentFileName(fileId)

  console.log("Current file name", fileName)

  // Gate mount until the client collection resolves
  if (!fileId || rawContent === undefined) return null

  const base64Content = typeof rawContent === "string" ? rawContent : null
  return <EditorCore fileId={fileId} base64Content={base64Content} />
}
