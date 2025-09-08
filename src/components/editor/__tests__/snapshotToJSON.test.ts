import { describe, it, expect } from "vitest"
import { Editor as TiptapEditor } from "@tiptap/core"
import type { Editor } from "@tiptap/core"
import { LoroDoc } from "loro-crdt"
import { extensions as baseExtensions } from "@/components/editor/extensions"
import { getLoroExtensions } from "@/components/editor/hooks"
import { snapshotToJSON } from "@/components/editor/utils/snapshotToJSON"
import { exportLoroSnapshotBase64 } from "@/components/editor/utils"
import { diffProseMirrorDocs } from "@/lib/crdt/prosemirror-diff"
import type { JSONContent } from "@tiptap/core"

function doc(nodes: JSONContent[] = []): JSONContent {
  return { type: "doc", content: nodes }
}

function paragraph(text: string): JSONContent {
  return { type: "paragraph", content: [{ type: "text", text }] }
}

function isTextBlock(node: JSONContent): boolean {
  const t = (node as { type?: string }).type
  return t === "paragraph" || t === "heading"
}

function nodeText(node: JSONContent): string {
  let text = ""
  const stack: JSONContent[] = [node]
  while (stack.length) {
    const n = stack.pop() as JSONContent
    const maybeText = (n as { text?: string }).text
    if (typeof maybeText === "string") text += maybeText
    const children = (n as { content?: JSONContent[] }).content
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!)
    }
  }
  return text
}

function normalizeDoc(json: JSONContent): JSONContent {
  const content = Array.isArray(json.content) ? json.content : []
  const filtered: JSONContent[] = content.filter(
    (n) => !isTextBlock(n) || nodeText(n).trim().length > 0
  )
  return { type: "doc", content: filtered }
}

async function createEditorWithDoc(
  json: JSONContent
): Promise<{ editor: Editor; loro: LoroDoc; flush: () => Promise<void> }> {
  const loro = new LoroDoc()
  const editor = new TiptapEditor({
    extensions: [...baseExtensions, getLoroExtensions(loro)],
  })
  editor.commands.setContent(json)
  // Remove empty trailing/leading text blocks to normalize layout
  const normalizedJson = normalizeDoc(json)
  editor.commands.setContent(normalizedJson)
  // allow LoroSync plugin to catch up
  const flush = async () => {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  await flush()
  return { editor, loro, flush }
}

describe("snapshotToJSON and diff integration", () => {
  it("snapshotToJSON(left) vs identical right -> unchanged", async () => {
    const baseJson = doc([paragraph("One"), paragraph("Two")])
    const { editor, loro, flush } = await createEditorWithDoc(baseJson)
    await flush()
    const snapshot = exportLoroSnapshotBase64(loro)
    const left = await snapshotToJSON(snapshot)
    // Normalize right like snapshotToJSON does
    const right = normalizeDoc(editor.getJSON())
    const diff = diffProseMirrorDocs(left, right)
    expect(diff.stats.additions).toBe(0)
    expect(diff.stats.deletions).toBe(0)
    expect(diff.stats.modifications).toBe(0)
    editor.destroy()
  })

  it("changes in one paragraph -> single modified node, not all added", async () => {
    const baseJson = doc([paragraph("Hello"), paragraph("World")])
    const {
      editor: editorA,
      loro: loroA,
      flush: flushA,
    } = await createEditorWithDoc(baseJson)
    await flushA()
    const snapshotA = exportLoroSnapshotBase64(loroA)
    const left = await snapshotToJSON(snapshotA)

    const changedJson = doc([paragraph("Hello!"), paragraph("World")])
    const { editor: editorB, flush: flushB } =
      await createEditorWithDoc(changedJson)
    await flushB()
    const right = normalizeDoc(editorB.getJSON())

    const diff = diffProseMirrorDocs(left, right)
    expect(diff.stats.additions).toBe(0)
    expect(diff.stats.deletions).toBe(0)
    expect(diff.stats.modifications).toBe(1)
    expect(diff.nodes[0].type).toBe("modified")
    expect(diff.nodes[1].type).toBe("unchanged")
    editorA.destroy()
    editorB.destroy()
  })

  it("edits across independent branches are compared correctly", async () => {
    const baseJson = doc([paragraph("A"), paragraph("B"), paragraph("C")])
    const {
      editor: editorMain,
      loro: loroMain,
      flush: flushMain,
    } = await createEditorWithDoc(baseJson)
    await flushMain()
    const snapshotMain = exportLoroSnapshotBase64(loroMain)
    const left = await snapshotToJSON(snapshotMain)

    const featureJson = doc([paragraph("A"), paragraph("B+"), paragraph("C")])
    const { editor: editorFeature, flush: flushFeature } =
      await createEditorWithDoc(featureJson)
    await flushFeature()
    const right = normalizeDoc(editorFeature.getJSON())

    const diff = diffProseMirrorDocs(left, right)
    expect(diff.stats.additions).toBe(0)
    expect(diff.stats.deletions).toBe(0)
    expect(diff.stats.modifications).toBe(1)
    expect(diff.nodes.map((n) => n.type)).toEqual([
      "unchanged",
      "modified",
      "unchanged",
    ])
    editorMain.destroy()
    editorFeature.destroy()
  })

  it("reorders across branches show added/deleted pairs (index alignment)", async () => {
    const leftJson = doc([paragraph("First"), paragraph("Second")])
    const { loro, flush } = await createEditorWithDoc(leftJson)
    await flush()
    const snapshot = exportLoroSnapshotBase64(loro)
    const left = await snapshotToJSON(snapshot)

    const { editor: editorRight, flush: flushRight } =
      await createEditorWithDoc(doc([paragraph("Second"), paragraph("First")]))
    await flushRight()
    const right = normalizeDoc(editorRight.getJSON())
    const diff = diffProseMirrorDocs(left, right)
    expect(diff.nodes.some((n) => n.type === "added")).toBe(true)
    expect(diff.nodes.some((n) => n.type === "deleted")).toBe(true)
    editorRight.destroy()
  })
})
