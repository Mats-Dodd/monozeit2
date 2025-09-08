import type { JSONContent } from "@tiptap/core"
import DiffMatchPatch from "diff-match-patch"

export type DiffType = "added" | "deleted" | "modified" | "unchanged"

export type TextDiff = {
  start: number
  end: number
  type: "insert" | "delete"
  content: string
}

export type DiffNode = {
  type: DiffType
  node: JSONContent
  textDiffs?: TextDiff[]
}

export type DiffResult = {
  nodes: DiffNode[]
  stats: {
    additions: number
    deletions: number
    modifications: number
  }
}

export function diffProseMirrorDocs(
  leftDoc: JSONContent,
  rightDoc: JSONContent
): DiffResult {
  const rawLeft = Array.isArray(leftDoc.content) ? leftDoc.content : []
  const rawRight = Array.isArray(rightDoc.content) ? rightDoc.content : []

  // Normalize by dropping empty text blocks (e.g., trailing empty paragraphs)
  const leftNodes = rawLeft.filter((n) => !isEmptyTextBlock(n))
  const rightNodes = rawRight.filter((n) => !isEmptyTextBlock(n))

  const diffNodes: DiffNode[] = []

  let additions = 0
  let deletions = 0
  let modifications = 0

  let i = 0
  const maxLen = Math.max(leftNodes.length, rightNodes.length)

  while (i < maxLen) {
    const leftNode = leftNodes[i]
    const rightNode = rightNodes[i]

    if (leftNode && !rightNode) {
      deletions += 1
      diffNodes.push({ type: "deleted", node: leftNode })
      i += 1
      continue
    }

    if (!leftNode && rightNode) {
      additions += 1
      diffNodes.push({ type: "added", node: rightNode })
      i += 1
      continue
    }

    if (!leftNode || !rightNode) {
      i += 1
      continue
    }

    // Detect simple adjacent swap -> treat as delete+add to reflect reordering
    const leftText = extractTextFromNode(leftNode)
    const rightText = extractTextFromNode(rightNode)
    const leftType = (leftNode as { type?: string }).type
    const rightType = (rightNode as { type?: string }).type

    if (leftType === rightType && leftText !== rightText) {
      const nextLeft = leftNodes[i + 1]
      const nextRight = rightNodes[i + 1]
      if (nextLeft && nextRight) {
        const nextLeftText = extractTextFromNode(nextLeft)
        const nextRightText = extractTextFromNode(nextRight)
        const nextLeftType = (nextLeft as { type?: string }).type
        const nextRightType = (nextRight as { type?: string }).type
        if (
          nextLeftType === rightType &&
          nextRightType === leftType &&
          nextLeftText === rightText &&
          nextRightText === leftText
        ) {
          // left[i] moved to right[i+1], right[i] moved to left[i+1]
          deletions += 1
          additions += 1
          diffNodes.push({ type: "deleted", node: leftNode })
          diffNodes.push({ type: "added", node: rightNode })
          i += 2
          continue
        }
      }
    }

    const compared = compareNodes(leftNode, rightNode)
    if (compared.type === "modified") {
      modifications += 1
    }
    diffNodes.push(compared)
    i += 1
  }

  return {
    nodes: diffNodes,
    stats: { additions, deletions, modifications },
  }
}

export function compareNodes(
  leftNode: JSONContent,
  rightNode: JSONContent
): DiffNode {
  const leftType = (leftNode as { type?: string }).type
  const rightType = (rightNode as { type?: string }).type

  if (leftType !== rightType) {
    return { type: "modified", node: rightNode, textDiffs: [] }
  }

  const leftText = extractTextFromNode(leftNode)
  const rightText = extractTextFromNode(rightNode)

  if (leftText === rightText) {
    const leftAttrs = getNodeAttrs(leftNode)
    const rightAttrs = getNodeAttrs(rightNode)
    const attrsEqual = shallowEqual(leftAttrs, rightAttrs)
    if (attrsEqual) {
      return { type: "unchanged", node: rightNode }
    }
    return { type: "modified", node: rightNode, textDiffs: [] }
  }

  const textDiffs = diffTextContent(leftText, rightText)
  return { type: "modified", node: rightNode, textDiffs }
}

export function extractTextFromNode(node: JSONContent | undefined): string {
  if (!node) return ""
  let output = ""
  const stack: Array<JSONContent> = [node]

  while (stack.length > 0) {
    const current = stack.pop()!
    const maybeText = (current as unknown as { text?: string }).text
    if (typeof maybeText === "string") {
      output += maybeText
    }
    const children = (current as unknown as { content?: JSONContent[] }).content
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i])
      }
    }
  }

  return output
}

export function diffTextContent(
  leftText: string,
  rightText: string
): TextDiff[] {
  const dmp = new DiffMatchPatch()
  const diffs = dmp.diff_main(leftText, rightText)
  dmp.diff_cleanupSemantic(diffs)

  const results: TextDiff[] = []
  let leftPos = 0
  let rightPos = 0

  for (const [op, text] of diffs) {
    const len = text.length
    if (op === -1) {
      // delete from left
      results.push({
        type: "delete",
        start: leftPos,
        end: leftPos + len,
        content: text,
      })
      leftPos += len
    } else if (op === 1) {
      // insert into right
      results.push({
        type: "insert",
        start: rightPos,
        end: rightPos + len,
        content: text,
      })
      rightPos += len
    } else {
      // equal
      leftPos += len
      rightPos += len
    }
  }

  return results
}

function getNodeAttrs(node: JSONContent): Record<string, unknown> | null {
  const attrs = (node as unknown as { attrs?: Record<string, unknown> }).attrs
  return attrs ?? null
}

function shallowEqual(
  a: Record<string, unknown> | null,
  b: Record<string, unknown> | null
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false
  }
  return true
}

function isEmptyTextBlock(node: JSONContent): boolean {
  const type = (node as unknown as { type?: string }).type
  if (type !== "paragraph" && type !== "heading") return false
  const text = extractTextFromNode(node)
  return text.trim().length === 0
}
