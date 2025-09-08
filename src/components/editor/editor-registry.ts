import type { Editor } from "@tiptap/react"

// Simple in-memory registry mapping fileId to a live TipTap Editor instance.
const fileIdToEditor = new Map<string, Editor>()

export function registerEditor(fileId: string, editor: Editor): void {
  fileIdToEditor.set(fileId, editor)
}

export function unregisterEditor(fileId: string): void {
  fileIdToEditor.delete(fileId)
}

export function getEditor(fileId: string): Editor | undefined {
  return fileIdToEditor.get(fileId)
}
