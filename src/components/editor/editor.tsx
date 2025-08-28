import { useEditor, EditorContent } from "@tiptap/react"
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus"
import { extensions } from "./extensions"
import { useCurrentFileID } from "@/services/tabs"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { fileCollection } from "@/lib/collections"

const Tiptap = () => {
  const currentFileID = useCurrentFileID()

  const { data: currentFile } = useLiveQuery(
    (q) =>
      q.from({ c: fileCollection }).where(({ c }) => eq(c.id, currentFileID)),
    [currentFileID]
  )

  console.log("currentFile", currentFile?.[0]?.name)

  const editor = useEditor({
    extensions,
    content: "<p>Hello World!</p>",
  })

  return (
    <>
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
    </>
  )
}

export default Tiptap
