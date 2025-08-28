import { useEditor, EditorContent } from "@tiptap/react"
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus"
import { extensions as baseExtensions } from "./extensions"
import { useDebouncedCallback } from "./hooks"
import { updateFile } from "@/services/files"
import { useCallback } from "react"
import {
  getLoroExtensions,
  exportLoroSnapshotBase64,
  useLoroDocForFile,
} from "./loro"

export function EditorCore({
  fileId,
  base64Content,
}: {
  fileId: string
  base64Content: string | null
}) {
  const loroDoc = useLoroDocForFile(fileId, base64Content)

  const extensions = [...baseExtensions, getLoroExtensions(loroDoc)]

  const saveNow = useCallback(() => {
    const base64 = exportLoroSnapshotBase64(loroDoc)
    updateFile({ id: fileId, content: base64 })
    if (import.meta.env?.DEV) console.log("saved")
  }, [fileId, loroDoc])
  const debouncedSave = useDebouncedCallback(saveNow, 500)

  const editor = useEditor(
    {
      extensions,
      onUpdate: () => {
        debouncedSave()
      },
    },
    [fileId, loroDoc]
  )

  return (
    <>
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
    </>
  )
}
