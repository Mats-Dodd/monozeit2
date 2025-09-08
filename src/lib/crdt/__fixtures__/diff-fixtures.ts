import type { JSONContent } from "@tiptap/core"

export const doc = (content: JSONContent[] = []): JSONContent => ({
  type: "doc",
  content,
})
export const paragraph = (text: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "text", text }],
})
export const heading = (level: number, text: string): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
})
export const boldText = (text: string): JSONContent => ({
  type: "text",
  text,
  marks: [{ type: "bold" }],
})
export const paragraphWithMarks = (nodes: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content: nodes,
})

export const fixtures = {
  insertion: {
    left: doc([paragraph("Hello")]),
    right: doc([paragraph("Hello world")]),
  },
  deletion: {
    left: doc([paragraph("Hello world")]),
    right: doc([paragraph("Hello")]),
  },
  modification: {
    left: doc([paragraph("abc")]),
    right: doc([paragraph("abXc")]),
  },
  reorder: {
    left: doc([paragraph("First"), paragraph("Second")]),
    right: doc([paragraph("Second"), paragraph("First")]),
  },
  attributeOnly: {
    left: doc([heading(2, "Title")]),
    right: doc([heading(3, "Title")]),
  },
  markOnly: {
    left: doc([
      paragraphWithMarks([boldText("Hello"), { type: "text", text: " world" }]),
    ]),
    right: doc([paragraph("Hello world")]),
  },
}
