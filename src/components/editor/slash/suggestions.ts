import type { Editor } from "@tiptap/core"

export type SlashCommandItem = {
  id?: string
  title: string
  section?: "Blocks" | "Inline" | "Media" | "Structure"
  description?: string
  shortcut?: string
  keywords?: string[]
  isAvailable?: (ctx: { editor: Editor }) => boolean
  run: (ctx: { editor: Editor; range: { from: number; to: number } }) => void
}

export function getDefaultSlashItems(): SlashCommandItem[] {
  return [
    {
      id: "paragraph",
      title: "Text",
      section: "Blocks",
      keywords: ["paragraph", "p"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run()
      },
    },
    {
      id: "h1",
      title: "Heading 1",
      section: "Blocks",
      keywords: ["h1", "heading"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
      },
    },
    {
      id: "h2",
      title: "Heading 2",
      section: "Blocks",
      keywords: ["h2", "heading"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
      },
    },
    {
      id: "bullet-list",
      title: "Bullet List",
      section: "Blocks",
      keywords: ["ul", "list", "bullet"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      id: "ordered-list",
      title: "Numbered List",
      section: "Blocks",
      keywords: ["ol", "list", "ordered"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
    },
    {
      id: "blockquote",
      title: "Quote",
      section: "Blocks",
      keywords: ["blockquote", "quote"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
    },
    {
      id: "code-block",
      title: "Code Block",
      section: "Blocks",
      keywords: ["code"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
    },
    {
      id: "details",
      title: "Details",
      section: "Structure",
      keywords: ["details", "disclosure"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setDetails().run()
      },
    },
    {
      id: "divider",
      title: "Divider",
      section: "Structure",
      keywords: ["hr", "divider", "rule"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run()
      },
    },
  ]
}

export function filterSlashItems(
  items: SlashCommandItem[],
  query: string
): SlashCommandItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    if (item.title.toLowerCase().includes(q)) return true
    if (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q)))
      return true
    return false
  })
}
