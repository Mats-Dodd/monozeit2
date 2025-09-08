import type { Editor } from "@tiptap/core"
import { Editor as TiptapEditor } from "@tiptap/core"
import type { JSONContent } from "@tiptap/core"
import { LoroDoc } from "loro-crdt"
import { extensions as baseExtensions } from "@/components/editor/extensions"
import { getLoroExtensions } from "@/components/editor/hooks"

function base64ToBytes(base64: string): Uint8Array {
  const binary =
    typeof atob !== "undefined"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary")
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
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

export async function snapshotToJSON(
  base64Snapshot: string
): Promise<JSONContent> {
  const loroDoc = new LoroDoc()
  const bytes = base64Snapshot ? base64ToBytes(base64Snapshot) : null

  // Create a temporary editor using the same schema/extensions
  const tempEditor: Editor = new TiptapEditor({
    extensions: [...baseExtensions, getLoroExtensions(loroDoc)],
    content: undefined,
    editable: false,
  })

  // Re-import to emit an update after plugin is attached, ensuring inbound sync
  if (bytes) {
    loroDoc.import(bytes)
  }

  // Wait for plugin init (setTimeout 0) and subsequent replace transaction
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 0))
    const current = tempEditor.getJSON() as JSONContent
    if (Array.isArray(current.content) && current.content.length > 0) {
      break
    }
  }
  const json = tempEditor.getJSON() as JSONContent
  const normalized = normalizeDoc(json)
  tempEditor.destroy()
  return normalized
}
