import { useEditor, EditorContent } from "@tiptap/react"
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus"
import { extensions } from "./extensions"
import { useCurrentFileID } from "@/services/tabs"
import { updateFile } from "@/services/files"
import { useCallback } from "react"
import {
  useDebouncedCallback,
  useGetCurrentFileContent,
  useSyncEditorContent,
} from "./hooks"

const Tiptap = () => {
  const currentFileID = useCurrentFileID()

  const content = useGetCurrentFileContent(currentFileID)

  const saveNow = useCallback(
    (content: string) => {
      if (!currentFileID) return
      updateFile({ id: currentFileID, content })
      if (import.meta.env?.DEV) console.log("saved")
    },
    [currentFileID]
  )
  const debouncedSave = useDebouncedCallback(saveNow, 500)

  const editor = useEditor(
    {
      extensions,
      content,
      onUpdate: ({ editor }) => {
        debouncedSave(editor.getHTML())
      },
    },
    [currentFileID]
  )

  useSyncEditorContent(editor, content)

  return (
    <>
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
    </>
  )
}

export default Tiptap
