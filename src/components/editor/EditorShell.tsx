import { useActiveTabFileID } from "@/services/tabs"
import { useGetCurrentFileContent } from "./hooks"
import { EditorCore } from "./EditorCore"
import { useMatch } from "@tanstack/react-router"

export function EditorShell() {
  const match = useMatch({
    from: "/_authenticated/project/$projectId",
    shouldThrow: false,
  })
  const projectId = (match?.params as { projectId?: string } | undefined)
    ?.projectId
  const fileId = useActiveTabFileID(projectId)
  const rawContent = useGetCurrentFileContent(fileId)
  // Gate mount until the client collection resolves
  if (!fileId || rawContent === undefined) return null

  const base64Content = typeof rawContent === "string" ? rawContent : null
  return <EditorCore fileId={fileId} base64Content={base64Content} />
}
