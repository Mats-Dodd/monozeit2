import { fileCollection } from "@/lib/collections"
import { eq, useLiveQuery } from "@tanstack/react-db"
import type { useEditor } from "@tiptap/react"
import { useCallback, useEffect, useRef } from "react"

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
) {
  const timeoutRef = useRef<number | null>(null)

  const debounced = useCallback(
    (...args: Args) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => {
        callback(...args)
      }, delayMs)
    },
    [callback, delayMs]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debounced
}

export function useSyncEditorContent(
  editor: ReturnType<typeof useEditor>,
  content: string
) {
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.getHTML()
    if (currentHtml === content) return

    const wasFocused = editor.isFocused
    const { from, to } = editor.state.selection
    editor.commands.setContent(content, { emitUpdate: false })
    if (wasFocused) {
      editor.view.focus()
      editor.commands.setTextSelection({ from, to })
    }
  }, [editor, content])
}

export function useGetCurrentFileContent(currentFileID: string) {
  const { data: currentFile } = useLiveQuery(
    (q) =>
      q.from({ c: fileCollection }).where(({ c }) => eq(c.id, currentFileID)),
    [currentFileID]
  )

  return currentFile?.[0]?.content
}
