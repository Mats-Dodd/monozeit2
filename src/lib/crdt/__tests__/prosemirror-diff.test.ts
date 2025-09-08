import { describe, it, expect } from "vitest"
import { diffProseMirrorDocs } from "@/lib/crdt/prosemirror-diff"
import {
  fixtures,
  doc,
  paragraph,
  heading,
  paragraphWithMarks,
  boldText,
} from "@/lib/crdt/__fixtures__/diff-fixtures"

describe("prosemirror-diff", () => {
  it("unchanged multi-block documents produce zero stats", () => {
    const left = doc([paragraph("One"), paragraph("Two"), heading(2, "Three")])
    const right = doc([paragraph("One"), paragraph("Two"), heading(2, "Three")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(0)
    expect(r.nodes.every((n) => n.type === "unchanged")).toBe(true)
  })

  it("detects insertion within a paragraph (no add/delete at node level)", () => {
    const r = diffProseMirrorDocs(
      fixtures.insertion.left,
      fixtures.insertion.right
    )
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect(modified?.textDiffs?.some((t) => t.type === "insert")).toBe(true)
  })

  it("detects deletion within a paragraph (no add/delete at node level)", () => {
    const r = diffProseMirrorDocs(
      fixtures.deletion.left,
      fixtures.deletion.right
    )
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect(modified?.textDiffs?.some((t) => t.type === "delete")).toBe(true)
  })

  it("detects modification with insert and surrounding unchanged nodes", () => {
    const left = doc([paragraph("A"), paragraph("Hello"), paragraph("C")])
    const right = doc([paragraph("A"), paragraph("Hello!"), paragraph("C")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    expect(r.nodes[0].type).toBe("unchanged")
    expect(r.nodes[1].type).toBe("modified")
    expect(r.nodes[2].type).toBe("unchanged")
  })

  it("reorder appears as add/delete pairs", () => {
    const r = diffProseMirrorDocs(fixtures.reorder.left, fixtures.reorder.right)
    expect(r.nodes.some((n) => n.type === "added")).toBe(true)
    expect(r.nodes.some((n) => n.type === "deleted")).toBe(true)
  })

  it("attribute-only change -> modified (no text diffs)", () => {
    const r = diffProseMirrorDocs(
      fixtures.attributeOnly.left,
      fixtures.attributeOnly.right
    )
    expect(r.nodes.some((n) => n.type === "modified")).toBe(true)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect((modified?.textDiffs?.length ?? 0) === 0).toBe(true)
  })

  it("mark-only change with same text -> unchanged", () => {
    const left = doc([
      paragraphWithMarks([boldText("Hello"), { type: "text", text: " world" }]),
    ])
    const right = doc([paragraph("Hello world")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.nodes.every((n) => n.type === "unchanged")).toBe(true)
  })

  it("empty left vs non-empty right -> all nodes added", () => {
    const left = doc([])
    const right = doc([paragraph("One"), paragraph("Two")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(2)
    expect(r.nodes.filter((n) => n.type === "added").length).toBe(2)
  })

  it("non-empty left vs empty right -> all nodes deleted", () => {
    const left = doc([paragraph("One"), paragraph("Two")])
    const right = doc([])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.deletions).toBe(2)
    expect(r.nodes.filter((n) => n.type === "deleted").length).toBe(2)
  })
})
