import { useCurrentFileID } from "@/services/tabs"
import { useGetCurrentFileContent } from "./hooks"
import { EditorCore } from "./EditorCore"

export function EditorShell() {
  const fileId = useCurrentFileID()
  const rawContent = useGetCurrentFileContent(fileId)

  // Gate mount until the client collection resolves
  if (!fileId || rawContent === undefined) return null

  const base64Content = typeof rawContent === "string" ? rawContent : null
  return <EditorCore fileId={fileId} base64Content={base64Content} />
}
