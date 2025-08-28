import { useEditor, EditorContent } from "@tiptap/react"
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus"
import { extensions } from "./extensions"
import { useCurrentFileID } from "@/services/tabs"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { fileCollection } from "@/lib/collections"
import { updateFile } from "@/services/files"
import { useCallback, useEffect, useRef } from "react"

const Tiptap = () => {
  const currentFileID = useCurrentFileID()
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const { data: currentFile } = useLiveQuery(
    (q) =>
      q.from({ c: fileCollection }).where(({ c }) => eq(c.id, currentFileID)),
    [currentFileID]
  )

  const currentFileData = currentFile?.[0]

  // Debounced save function
  const debouncedSave = useCallback(
    (content: string) => {
      if (!currentFileID) return

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        updateFile({ id: currentFileID, content })
        console.log("saved")
      }, 500)
    },
    [currentFileID]
  )

  const editor = useEditor(
    {
      extensions,
      content: currentFileData?.content,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        if (html !== (currentFileData?.content ?? "")) {
          debouncedSave(html)
        }
      },
    },
    [currentFileID]
  )

  // Sync external content changes without re-creating the editor or stealing focus
  useEffect(() => {
    if (!editor) return
    const newContent = currentFileData?.content ?? ""
    const currentHtml = editor.getHTML()
    if (newContent === currentHtml) return

    const wasFocused = editor.isFocused
    const { from, to } = editor.state.selection
    editor.commands.setContent(newContent, { emitUpdate: false })
    if (wasFocused) {
      editor.view.focus()
      editor.commands.setTextSelection({ from, to })
    }
  }, [editor, currentFileData?.content])

  return (
    <>
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
    </>
  )
}

export default Tiptap
