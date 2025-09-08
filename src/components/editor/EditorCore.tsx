import { useEditor, EditorContent } from "@tiptap/react"
import { extensions as baseExtensions } from "./extensions"
import { getLoroExtensions } from "./hooks"
import { useEffect, useMemo } from "react"
import { registerEditor, unregisterEditor } from "./editor-registry"
import { LoroDoc } from "loro-crdt"

export function EditorCore({
  fileId,
  loroDoc,
  markDirty,
}: {
  fileId: string
  loroDoc: LoroDoc
  markDirty?: () => void
}) {
  const extensions = useMemo(
    () => [...baseExtensions, getLoroExtensions(loroDoc)],
    [loroDoc]
  )

  const editor = useEditor(
    {
      extensions,
      onUpdate: () => {
        if (markDirty) markDirty()
      },
    },
    [fileId, loroDoc]
  )

  useEffect(() => {
    if (!editor) return
    registerEditor(fileId, editor)
    return () => unregisterEditor(fileId)
  }, [editor, fileId])

  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto thin-scrollbar">
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  )
}
