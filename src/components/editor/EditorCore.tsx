import { useEditor, EditorContent } from "@tiptap/react"
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus"
import { extensions as baseExtensions } from "./extensions"
import {
  useDebouncedCallback,
  getLoroExtensions,
  useLoroDocForFile,
} from "./hooks"
import { updateFile } from "@/services/files"
import { useCallback, useMemo } from "react"
import { exportLoroSnapshotBase64 } from "./loro"

export function EditorCore({
  fileId,
  base64Content,
}: {
  fileId: string
  base64Content: string | null
}) {
  const { loroDoc, markSnapshotApplied } = useLoroDocForFile(
    fileId,
    base64Content
  )

  const extensions = useMemo(
    () => [...baseExtensions, getLoroExtensions(loroDoc)],
    [loroDoc]
  )

  const saveNow = useCallback(() => {
    const base64 = exportLoroSnapshotBase64(loroDoc)
    // Mark this snapshot as applied to avoid re-importing our own save
    markSnapshotApplied(base64)
    updateFile({ id: fileId, content: base64 })
    if (import.meta.env?.DEV) console.log("saved")
  }, [fileId, loroDoc, markSnapshotApplied])
  const debouncedSave = useDebouncedCallback(saveNow, 500)

  const editor = useEditor(
    {
      extensions,
      onUpdate: () => {
        debouncedSave()
      },
    },
    [fileId]
  )

  return (
    <>
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
    </>
  )
}
