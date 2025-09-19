import { useEditor, EditorContent } from "@tiptap/react"
import { extensions as baseExtensions } from "./extensions"
import { getLoroExtensions } from "./hooks"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { registerEditor, unregisterEditor } from "./editor-registry"
import { LoroDoc } from "loro-crdt"
import { getDefaultSlashItems, filterSlashItems } from "./slash/suggestions"
import { SlashMenu } from "./slash/Menu"
import { SelectionMenu } from "./SelectionMenu"

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
  const [showSelectionMenu, setShowSelectionMenu] = useState(false)
  const [selectionMenuPos, setSelectionMenuPos] = useState<{
    top: number
    left: number
  }>({ top: 0, left: 0 })

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

  const detectSelection = useCallback(() => {
    if (!editor || isSlashOpen) {
      setShowSelectionMenu(false)
      return
    }

    const { state, view } = editor
    const { from, to } = state.selection

    // Don't show if no selection
    if (from === to) {
      setShowSelectionMenu(false)
      return
    }

    // Don't show if selection is empty
    const text = state.doc.textBetween(from, to, " ")
    if (!text || !text.trim()) {
      setShowSelectionMenu(false)
      return
    }

    // Don't show in code blocks
    const $from = state.doc.resolve(from)
    const node = $from.node($from.depth)
    if (node.type.name === "codeBlock") {
      setShowSelectionMenu(false)
      return
    }

    // Don't show for node selections (like images)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((state.selection as any).node) {
      setShowSelectionMenu(false)
      return
    }

    // Show the menu and calculate position
    setShowSelectionMenu(true)
    try {
      const start = view.coordsAtPos(from)
      const end = view.coordsAtPos(to)
      const container = containerRef.current

      if (container) {
        const rect = container.getBoundingClientRect()
        setSelectionMenuPos({
          top: Math.min(start.top, end.top) - rect.top - 48, // 48px above selection
          left: (start.left + end.left) / 2 - rect.left - 100, // center horizontally
        })
      } else {
        setSelectionMenuPos({
          top: Math.min(start.top, end.top) - 48,
          left: (start.left + end.left) / 2 - 100,
        })
      }
    } catch {
      // ignore coord errors
      setShowSelectionMenu(false)
    }
  }, [editor, isSlashOpen])

  useEffect(() => {
    if (!editor) return
    registerEditor(fileId, editor)
    const onSelectionUpdate = () => {
      detectSlash()
      detectSelection()
    }
    const onTransaction = () => {
      detectSlash()
      detectSelection()
    }
    const onUpdate = () => {
      detectSlash()
      detectSelection()
    }
    editor.on("selectionUpdate", onSelectionUpdate)
    editor.on("transaction", onTransaction)
    editor.on("update", onUpdate)
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate)
      editor.off("transaction", onTransaction)
      editor.off("update", onUpdate)
      unregisterEditor(fileId)
    }
  }, [editor, fileId, detectSlash, detectSelection])

  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      <div
        className="flex-1 min-h-0 overflow-auto thin-scrollbar relative"
        ref={containerRef}
      >
        <EditorContent editor={editor} className="tiptap" />
        {isSlashOpen && filteredItems.length > 0 ? (
          <div
            className="absolute z-50"
            style={{ top: menuPos.top, left: menuPos.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <SlashMenu
              items={filteredItems.map((it) => ({
                id: it.id ?? it.title,
                title: it.title,
                section: it.section,
                shortcut: it.shortcut,
                description: it.description,
                run: it.run,
              }))}
              activeIndex={activeIndex}
              onHoverIndex={(idx) => setActiveIndex(idx)}
              onSelectIndex={(idx) => {
                const item = filteredItems[idx]
                if (!editor || !slashRange || !item) return
                item.run({ editor, range: slashRange })
                setIsSlashOpen(false)
                setSlashQuery("")
                setSlashRange(null)
                queueMicrotask(() => editor.chain().focus().run())
              }}
            />
          </div>
        ) : null}
        {showSelectionMenu && editor ? (
          <div
            className="absolute z-50"
            style={{ top: selectionMenuPos.top, left: selectionMenuPos.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <SelectionMenu editor={editor} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
