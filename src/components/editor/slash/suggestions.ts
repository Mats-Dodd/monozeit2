import type { Editor } from "@tiptap/core"

export type SlashCommandItem = {
  title: string
  keywords?: string[]
  run: (ctx: { editor: Editor; range: { from: number; to: number } }) => void
}

export function getDefaultSlashItems(): SlashCommandItem[] {
  return [
    {
      title: "Text",
      keywords: ["paragraph", "p"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run()
      },
    },
    {
      title: "Heading 1",
      keywords: ["h1", "heading"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
      },
    },
    {
      title: "Heading 2",
      keywords: ["h2", "heading"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
      },
    },
    {
      title: "Bullet List",
      keywords: ["ul", "list", "bullet"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      title: "Numbered List",
      keywords: ["ol", "list", "ordered"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
    },
    {
      title: "Quote",
      keywords: ["blockquote", "quote"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
    },
    {
      title: "Code Block",
      keywords: ["code"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
    },
    {
      title: "Details",
      keywords: ["details", "disclosure"],
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setDetails().run()
      },
    },
    {
      title: "Divider",
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
