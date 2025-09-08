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
  attrDiffs?: AttrDiff[]
  marksDiffs?: MarksDiff
}

export type DiffResult = {
  nodes: DiffNode[]
  stats: {
    additions: number
    deletions: number
    modifications: number
  }
}

export type AttrDiff = {
  key: string
  left: unknown
  right: unknown
}

export type MarksDiff = {
  added: Array<{ type: string }>
  removed: Array<{ type: string }>
  changed: Array<{
    type: string
    left: Record<string, unknown> | null
    right: Record<string, unknown> | null
  }>
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

  // LCS-based alignment of blocks using fingerprints to anchor unchanged blocks
  const leftKeys = leftNodes.map(nodeFingerprint)
  const rightKeys = rightNodes.map(nodeFingerprint)
  const aligned = lcsAlign(leftKeys, rightKeys)

  let i = 0
  let j = 0
  const flushGap = (iEnd: number, jEnd: number) => {
    const leftSpan = leftNodes.slice(i, iEnd)
    const rightSpan = rightNodes.slice(j, jEnd)
    if (leftSpan.length === 0 && rightSpan.length === 0) {
      return
    }
    // Determine if this gap is a pure reorder: same multiset of fingerprints, same length, different order
    const leftGapKeys = leftKeys.slice(i, iEnd)
    const rightGapKeys = rightKeys.slice(j, jEnd)
    const isSameLength = leftGapKeys.length === rightGapKeys.length
    const isSameSequence =
      isSameLength && leftGapKeys.every((v, idx) => v === rightGapKeys[idx])
    const isSameMultiset = () => {
      if (!isSameLength) return false
      const freq = new Map<string, number>()
      for (const k of leftGapKeys) freq.set(k, (freq.get(k) ?? 0) + 1)
      for (const k of rightGapKeys) freq.set(k, (freq.get(k) ?? 0) - 1)
      for (const v of freq.values()) if (v !== 0) return false
      return true
    }
    const pureReorder = isSameLength && !isSameSequence && isSameMultiset()
    if (pureReorder) {
      // Represent reorders as delete/add pairs to reflect movement
      for (const n of leftSpan) {
        diffNodes.push({ type: "deleted", node: n })
        deletions += 1
      }
      for (const n of rightSpan) {
        diffNodes.push({ type: "added", node: n })
        additions += 1
      }
      i = iEnd
      j = jEnd
      return
    }
    // Otherwise, pair up to the min length as modifications, leftovers as adds/deletes
    const kMax = Math.min(leftSpan.length, rightSpan.length)
    for (let k = 0; k < kMax; k++) {
      const compared = compareNodes(leftSpan[k]!, rightSpan[k]!)
      if (compared.type === "modified") modifications += 1
      diffNodes.push(compared)
    }
    for (let k = kMax; k < leftSpan.length; k++) {
      diffNodes.push({ type: "deleted", node: leftSpan[k]! })
      deletions += 1
    }
    for (let k = kMax; k < rightSpan.length; k++) {
      diffNodes.push({ type: "added", node: rightSpan[k]! })
      additions += 1
    }
    i = iEnd
    j = jEnd
  }

  for (const [ai, bj] of aligned) {
    flushGap(ai, bj)
    const compared = compareNodes(leftNodes[ai]!, rightNodes[bj]!)
    if (compared.type === "modified") modifications += 1
    diffNodes.push(compared)
    i = ai + 1
    j = bj + 1
  }

  // Flush trailing gap
  flushGap(leftNodes.length, rightNodes.length)

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
    const attrDiffs = buildAttrDiffs(
      getNodeAttrs(leftNode),
      getNodeAttrs(rightNode)
    )
    const marksDiffs = buildMarksDiffs(leftNode, rightNode)
    return {
      type: "modified",
      node: rightNode,
      textDiffs: [],
      attrDiffs,
      marksDiffs,
    }
  }

  const leftText = extractTextFromNode(leftNode)
  const rightText = extractTextFromNode(rightNode)

  if (leftText === rightText) {
    const leftAttrs = getNodeAttrs(leftNode)
    const rightAttrs = getNodeAttrs(rightNode)
    const attrsEqual = shallowEqual(leftAttrs, rightAttrs)
    const marksDiffs = buildMarksDiffs(leftNode, rightNode)
    const marksChanged =
      marksDiffs.added.length +
        marksDiffs.removed.length +
        marksDiffs.changed.length >
      0
    if (attrsEqual && !marksChanged) {
      return { type: "unchanged", node: rightNode }
    }
    const attrDiffs = attrsEqual ? [] : buildAttrDiffs(leftAttrs, rightAttrs)
    return {
      type: "modified",
      node: rightNode,
      textDiffs: [],
      attrDiffs,
      marksDiffs,
    }
  }

  const textDiffs = diffTextContentWordPreferred(leftText, rightText)
  const attrDiffs = buildAttrDiffs(
    getNodeAttrs(leftNode),
    getNodeAttrs(rightNode)
  )
  const marksDiffs = buildMarksDiffs(leftNode, rightNode)
  return { type: "modified", node: rightNode, textDiffs, attrDiffs, marksDiffs }
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

// Prefer word-level diff; fall back to char-level for large inputs or no token boundaries
function diffTextContentWordPreferred(
  leftText: string,
  rightText: string
): TextDiff[] {
  const leftTokens = tokenizeText(leftText)
  const rightTokens = tokenizeText(rightText)
  const totalTokens = leftTokens.length + rightTokens.length
  const hasWordBoundaries =
    leftTokens.some((t) => t.isWord) || rightTokens.some((t) => t.isWord)
  // Thresholds: if too many tokens or no boundaries, fall back to char-level
  if (!hasWordBoundaries || totalTokens > 2000) {
    return diffTextContent(leftText, rightText)
  }

  const { mappedLeft, mappedRight } = mapTokensToChars(leftTokens, rightTokens)
  const dmp = new DiffMatchPatch()
  const diffs = dmp.diff_main(mappedLeft, mappedRight)
  dmp.diff_cleanupSemantic(diffs)

  const results: TextDiff[] = []
  let leftIndex = 0
  let rightIndex = 0

  for (const [op, text] of diffs) {
    const count = text.length // each char represents one token
    if (op === -1) {
      // delete in left
      if (count > 0) {
        const startTok = leftTokens[leftIndex]
        const endTok = leftTokens[leftIndex + count - 1]
        const start = startTok ? startTok.start : 0
        const end = endTok ? endTok.end : start
        const content = leftText.slice(start, end)
        results.push({ type: "delete", start, end, content })
      }
      leftIndex += count
    } else if (op === 1) {
      // insert in right
      if (count > 0) {
        const startTok = rightTokens[rightIndex]
        const endTok = rightTokens[rightIndex + count - 1]
        const start = startTok ? startTok.start : 0
        const end = endTok ? endTok.end : start
        const content = rightText.slice(start, end)
        results.push({ type: "insert", start, end, content })
      }
      rightIndex += count
    } else {
      // equal
      leftIndex += count
      rightIndex += count
    }
  }

  return results
}

function tokenizeText(
  text: string
): Array<{ value: string; start: number; end: number; isWord: boolean }> {
  const tokens: Array<{
    value: string
    start: number
    end: number
    isWord: boolean
  }> = []
  const re = /([\p{L}\p{N}_]+|\s+|[^\s\p{L}\p{N}_]+)/gu
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const value = match[0]
    const start = match.index
    const end = start + value.length
    const isWord =
      /[\p{L}\p{N}_]/u.test(value[0] ?? "") && !/^\s+$/u.test(value)
    tokens.push({ value, start, end, isWord })
  }
  return tokens
}

function mapTokensToChars(
  left: Array<{ value: string }>,
  right: Array<{ value: string }>
): { mappedLeft: string; mappedRight: string } {
  const tokenToChar: Record<string, string> = {}
  let next = 0
  const base = 0xe000 // Private Use Area

  const getCharForToken = (tok: string): string => {
    let ch = tokenToChar[tok]
    if (!ch) {
      ch = String.fromCharCode(base + next)
      tokenToChar[tok] = ch
      next += 1
    }
    return ch
  }

  const mappedLeft = left.map((t) => getCharForToken(t.value)).join("")
  const mappedRight = right.map((t) => getCharForToken(t.value)).join("")
  return { mappedLeft, mappedRight }
}

function nodeFingerprint(node: JSONContent): string {
  const type = (node as { type?: string }).type ?? "unknown"
  const text = extractTextFromNode(node).trim()
  return type + "::" + text
}

function lcsAlign(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  )
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const pairs: Array<[number, number]> = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j])
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1
    } else {
      j += 1
    }
  }
  return pairs
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

function buildAttrDiffs(
  left: Record<string, unknown> | null,
  right: Record<string, unknown> | null
): AttrDiff[] {
  if (!left && !right) return []
  const diffs: AttrDiff[] = []
  const keys = new Set<string>([
    ...Object.keys(left ?? {}),
    ...Object.keys(right ?? {}),
  ])
  for (const key of keys) {
    const l = left ? left[key] : undefined
    const r = right ? right[key] : undefined
    if (l !== r) diffs.push({ key, left: l as unknown, right: r as unknown })
  }
  return diffs
}

function buildMarksDiffs(
  leftNode: JSONContent,
  rightNode: JSONContent
): MarksDiff {
  const leftSummary = collectMarksSummary(leftNode)
  const rightSummary = collectMarksSummary(rightNode)

  const leftCoverage = collectMarksCoverage(leftNode)
  const rightCoverage = collectMarksCoverage(rightNode)

  const added: Array<{ type: string }> = []
  const removed: Array<{ type: string }> = []
  const changed: Array<{
    type: string
    left: Record<string, unknown> | null
    right: Record<string, unknown> | null
  }> = []

  const allTypes = new Set<string>([
    ...Object.keys(leftSummary),
    ...Object.keys(rightSummary),
  ])
  for (const t of allTypes) {
    const lSumm = leftSummary[t]
    const rSumm = rightSummary[t]
    const lCov = leftCoverage[t]
    const rCov = rightCoverage[t]
    if (lSumm && !rSumm) {
      removed.push({ type: t })
      continue
    }
    if (!lSumm && rSumm) {
      added.push({ type: t })
      continue
    }
    if (lSumm && rSumm) {
      // Compare aggregated attrs sets by JSON string keys
      const lSet = new Set(lSumm.map((o) => JSON.stringify(o ?? null)))
      const rSet = new Set(rSumm.map((o) => JSON.stringify(o ?? null)))
      const attrsSame =
        lSet.size === rSet.size && [...lSet].every((v) => rSet.has(v))

      // Compare coverage ranges keyed by attr signature
      const coverageSame = isCoverageSame(lCov ?? [], rCov ?? [])

      if (!attrsSame || !coverageSame) {
        changed.push({
          type: t,
          left: lSumm[0] ?? null,
          right: rSumm[0] ?? null,
        })
      }
    }
  }

  return { added, removed, changed }
}

function collectMarksSummary(
  node: JSONContent
): Record<string, Array<Record<string, unknown> | null>> {
  const result: Record<string, Array<Record<string, unknown> | null>> = {}
  const stack: JSONContent[] = [node]
  while (stack.length > 0) {
    const current = stack.pop()!
    const marks = (
      current as unknown as {
        marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
      }
    ).marks
    if (Array.isArray(marks)) {
      for (const m of marks) {
        const type = (m?.type ?? "") as string
        if (!type) continue
        const arr = result[type] ?? (result[type] = [])
        arr.push(m?.attrs ?? null)
      }
    }
    const children = (current as unknown as { content?: JSONContent[] }).content
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!)
    }
  }
  return result
}

type MarkRange = { start: number; end: number; attrsKey: string; type: string }

function collectMarksCoverage(node: JSONContent): Record<string, MarkRange[]> {
  const coverage: Record<string, MarkRange[]> = {}
  let offset = 0

  const walk = (n: JSONContent) => {
    const type = (n as unknown as { type?: string }).type
    if (type === "text") {
      const text = (n as unknown as { text?: string }).text ?? ""
      const len = text.length
      const marks = (
        n as unknown as {
          marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
        }
      ).marks
      if (Array.isArray(marks) && marks.length > 0 && len > 0) {
        for (const m of marks) {
          const t = m?.type ?? ""
          if (!t) continue
          const attrsKey = JSON.stringify(m?.attrs ?? null)
          const list = coverage[t] ?? (coverage[t] = [])
          list.push({ type: t, start: offset, end: offset + len, attrsKey })
        }
      }
      offset += len
      return
    }
    const children = (n as unknown as { content?: JSONContent[] }).content
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        walk(children[i]!)
      }
    }
  }

  walk(node)

  // Normalize: sort and merge adjacent ranges with same attrsKey
  for (const t of Object.keys(coverage)) {
    const ranges = coverage[t]!
    ranges.sort((a, b) => a.start - b.start || a.end - b.end)
    const merged: MarkRange[] = []
    for (const r of ranges) {
      const last = merged[merged.length - 1]
      if (last && last.end === r.start && last.attrsKey === r.attrsKey) {
        last.end = r.end
      } else if (last && r.start <= last.end && last.attrsKey === r.attrsKey) {
        // overlapping; extend
        last.end = Math.max(last.end, r.end)
      } else {
        merged.push({ ...r })
      }
    }
    coverage[t] = merged
  }

  return coverage
}

function isCoverageSame(a: MarkRange[], b: MarkRange[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]!.start !== b[i]!.start ||
      a[i]!.end !== b[i]!.end ||
      a[i]!.attrsKey !== b[i]!.attrsKey
    )
      return false
  }
  return true
}
