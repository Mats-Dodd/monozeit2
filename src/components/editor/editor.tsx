import { useEditor, EditorContent } from "@tiptap/react"
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus"
import { extensions } from "./extensions"
import { useCurrentFileID } from "@/services/tabs"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { fileCollection } from "@/lib/collections"
import { updateFile } from "@/services/files"
import { useCallback, useRef } from "react"

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
      }, 500)
    },
    [currentFileID]
  )

  console.log("currentFileData?.content", currentFileData?.content)
  const editor = useEditor(
    {
      extensions,
      content: currentFileData?.content || "<p>Hello World!</p>",
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        debouncedSave(html)
      },
    },
    [currentFileID, currentFileData?.content]
  )

  return (
    <>
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
    </>
  )
}

export default Tiptap
