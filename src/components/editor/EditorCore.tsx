import { useEditor, EditorContent } from "@tiptap/react"
import { extensions as baseExtensions } from "./extensions"
import { getLoroExtensions } from "./hooks"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { registerEditor, unregisterEditor } from "./editor-registry"
import { LoroDoc } from "loro-crdt"
import { getDefaultSlashItems, filterSlashItems } from "./slash/suggestions"

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

  const containerRef = useRef<HTMLDivElement>(null)
  const isSlashOpenRef = useRef(false)
  const filteredItemsRef = useRef<ReturnType<typeof filterSlashItems>>([])
  const activeIndexRef = useRef(0)
  const slashRangeRef = useRef<{ from: number; to: number } | null>(null)

  const [isSlashOpen, setIsSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState("")
  const [slashRange, setSlashRange] = useState<{
    from: number
    to: number
  } | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  })
  const allItems = useMemo(() => getDefaultSlashItems(), [])
  const filteredItems = useMemo(
    () => filterSlashItems(allItems, slashQuery),
    [allItems, slashQuery]
  )
  const [activeIndex, setActiveIndex] = useState(0)

  // keep refs synchronized for reliable keydown handling
  useEffect(() => {
    isSlashOpenRef.current = isSlashOpen
  }, [isSlashOpen])
  useEffect(() => {
    filteredItemsRef.current = filteredItems
  }, [filteredItems])
  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])
  useEffect(() => {
    slashRangeRef.current = slashRange
  }, [slashRange])

  const editor = useEditor(
    {
      extensions,
      onUpdate: () => {
        if (markDirty) markDirty()
      },
      editorProps: {
        handleDOMEvents: {
          keydown: (_view, e) => {
            const event = e as KeyboardEvent
            if (
              !isSlashOpenRef.current ||
              filteredItemsRef.current.length === 0
            )
              return false
            const key = event.key
            const len = filteredItemsRef.current.length
            if (key === "ArrowDown") {
              const next = (activeIndexRef.current + 1) % len
              setActiveIndex(next)
              activeIndexRef.current = next
              event.preventDefault()
              event.stopPropagation()
              return true
            }
            if (key === "ArrowUp") {
              const next = (activeIndexRef.current - 1 + len) % len
              setActiveIndex(next)
              activeIndexRef.current = next
              event.preventDefault()
              event.stopPropagation()
              return true
            }
            if (key === "Home") {
              setActiveIndex(0)
              activeIndexRef.current = 0
              event.preventDefault()
              event.stopPropagation()
              return true
            }
            if (key === "End") {
              const last = len - 1
              setActiveIndex(last)
              activeIndexRef.current = last
              event.preventDefault()
              event.stopPropagation()
              return true
            }
            if (key === "Enter") {
              const item = filteredItemsRef.current[activeIndexRef.current]
              const range = slashRangeRef.current
              if (editor && item && range) {
                item.run({ editor, range })
                setIsSlashOpen(false)
                setSlashQuery("")
                setSlashRange(null)
                event.preventDefault()
                event.stopPropagation()
                queueMicrotask(() => editor.chain().focus().run())
                return true
              }
            }
            if (key === "Escape") {
              setIsSlashOpen(false)
              setSlashQuery("")
              setSlashRange(null)
              event.preventDefault()
              event.stopPropagation()
              queueMicrotask(() => editor?.chain().focus().run())
              return true
            }
            return false
          },
        },
      },
    },
    [fileId, loroDoc]
  )

  const detectSlash = useCallback(() => {
    if (!editor) return
    const { state, view } = editor
    const { from } = state.selection
    const $from = state.doc.resolve(from)
    const blockStart = $from.start()
    const text = state.doc.textBetween(blockStart, from, "\n", "\n")
    const lastSlash = text.lastIndexOf("/")
    if (lastSlash === -1) {
      setIsSlashOpen(false)
      setSlashRange(null)
      setSlashQuery("")
      return
    }
    const after = text.slice(lastSlash)
    if (!/^\/[^\s]*$/.test(after)) {
      setIsSlashOpen(false)
      setSlashRange(null)
      setSlashQuery("")
      return
    }
    const rangeFrom = blockStart + lastSlash
    const rangeTo = from
    setSlashRange({ from: rangeFrom, to: rangeTo })
    setSlashQuery(after.slice(1))
    setIsSlashOpen(true)
    try {
      const coords = view.coordsAtPos(rangeTo)
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        setMenuPos({
          top: coords.bottom - rect.top + 4,
          left: coords.left - rect.left,
        })
      } else {
        setMenuPos({ top: coords.bottom + 4, left: coords.left })
      }
    } catch {
      // ignore coord errors
    }
    setActiveIndex(0)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    registerEditor(fileId, editor)
    const onSelectionUpdate = () => detectSlash()
    const onTransaction = () => detectSlash()
    const onUpdate = () => detectSlash()
    editor.on("selectionUpdate", onSelectionUpdate)
    editor.on("transaction", onTransaction)
    editor.on("update", onUpdate)
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate)
      editor.off("transaction", onTransaction)
      editor.off("update", onUpdate)
      unregisterEditor(fileId)
    }
  }, [editor, fileId, detectSlash])

  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      <div
        className="flex-1 min-h-0 overflow-auto thin-scrollbar relative"
        ref={containerRef}
      >
        <EditorContent editor={editor} className="tiptap" />
        {isSlashOpen && filteredItems.length > 0 ? (
          <div
            className="absolute z-50 bg-white border rounded-md shadow-md min-w-56 py-1"
            style={{ top: menuPos.top, left: menuPos.left }}
            onMouseDown={(e) => e.preventDefault()}
            role="listbox"
            aria-activedescendant={`slash-option-${activeIndex}`}
          >
            {filteredItems.map((item, idx) => (
              <button
                key={item.title}
                className={
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent " +
                  (idx === activeIndex ? "bg-accent" : "")
                }
                id={`slash-option-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  if (!editor || !slashRange) return
                  item.run({ editor, range: slashRange })
                  setIsSlashOpen(false)
                  setSlashQuery("")
                  setSlashRange(null)
                  queueMicrotask(() => editor.chain().focus().run())
                }}
              >
                {item.title}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
