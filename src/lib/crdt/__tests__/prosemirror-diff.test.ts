import { describe, it, expect } from "vitest"
import { diffProseMirrorDocs } from "@/lib/crdt/prosemirror-diff"
import {
  fixtures,
  doc,
  paragraph,
  heading,
  paragraphWithMarks,
  boldText,
  linkText,
  image,
  bulletList,
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

  it("mark-only change with same text -> modified (marks only)", () => {
    const left = doc([
      paragraphWithMarks([boldText("Hello"), { type: "text", text: " world" }]),
    ])
    const right = doc([paragraph("Hello world")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.nodes.some((n) => n.type === "modified")).toBe(true)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect((modified?.textDiffs?.length ?? 0) === 0).toBe(true)
    expect(
      !!modified?.marksDiffs &&
        modified.marksDiffs.added.length +
          modified.marksDiffs.removed.length +
          modified.marksDiffs.changed.length >
          0
    ).toBe(true)
  })

  it("mark coverage change (bold expanded to include adjacent word)", () => {
    const left = doc([
      paragraphWithMarks([boldText("Hello"), { type: "text", text: " world" }]),
    ])
    const right = doc([
      paragraphWithMarks([boldText("Hello "), boldText("world")]),
    ])
    const r = diffProseMirrorDocs(left, right)
    expect(r.nodes.some((n) => n.type === "modified")).toBe(true)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect((modified?.textDiffs?.length ?? 0) === 0).toBe(true)
    expect(
      !!modified?.marksDiffs && modified.marksDiffs.changed.length > 0
    ).toBe(true)
  })

  it("link attribute change (href) -> modified attrs only", () => {
    const left = doc([
      paragraphWithMarks([linkText("Click", "https://a.example")]),
    ])
    const right = doc([
      paragraphWithMarks([linkText("Click", "https://b.example")]),
    ])
    const r = diffProseMirrorDocs(left, right)
    expect(r.nodes.some((n) => n.type === "modified")).toBe(true)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect((modified?.textDiffs?.length ?? 0) === 0).toBe(true)
    // Either attrDiffs or marksDiffs.changed should capture the difference
    const hasAttrDiffs = (modified?.attrDiffs?.length ?? 0) > 0
    const hasMarksChanged =
      !!modified?.marksDiffs && modified.marksDiffs.changed.length > 0
    expect(hasAttrDiffs || hasMarksChanged).toBe(true)
  })

  it("image attribute change (alt) -> modified attrs only", () => {
    const left = doc([image("/a.png", "Logo")])
    const right = doc([image("/a.png", "Logo v2")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.nodes.some((n) => n.type === "modified")).toBe(true)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect((modified?.textDiffs?.length ?? 0) === 0).toBe(true)
    expect((modified?.attrDiffs?.length ?? 0) > 0).toBe(true)
  })

  it("list item reorder inside a single list -> modified", () => {
    const left = doc([bulletList(["Alpha", "Beta", "Gamma"])])
    const right = doc([bulletList(["Gamma", "Alpha", "Beta"])])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
  })

  it("word-level diff groups inserts/deletes (emoji & punctuation)", () => {
    const left = doc([paragraph("Hello 😄, world!")])
    const right = doc([paragraph("Hello 😄, brave new world!")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect(
      (modified?.textDiffs?.filter((t) => t.type === "insert").length ?? 0) >= 1
    ).toBe(true)
  })

  it("prepend text in a single paragraph -> one insert diff", () => {
    const left = doc([paragraph("world")])
    const right = doc([paragraph("Hello world")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect(modified?.textDiffs?.some((t) => t.type === "insert")).toBe(true)
  })

  it("insert mid-word -> single modified node", () => {
    const left = doc([paragraph("Helo world")])
    const right = doc([paragraph("Hello world")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect(modified?.textDiffs?.some((t) => t.type === "insert")).toBe(true)
  })

  it("delete at start -> single delete diff in textDiffs", () => {
    const left = doc([paragraph("Hello world")])
    const right = doc([paragraph("world")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect(modified?.textDiffs?.some((t) => t.type === "delete")).toBe(true)
  })

  it("delete at end -> single delete diff in textDiffs", () => {
    const left = doc([paragraph("Hello world")])
    const right = doc([paragraph("Hello")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect(modified?.textDiffs?.some((t) => t.type === "delete")).toBe(true)
  })

  it("replace a word -> insert and delete diffs in same node", () => {
    const left = doc([paragraph("Hello world")])
    const right = doc([paragraph("Hello folks")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    const types = (modified?.textDiffs ?? []).map((t) => t.type)
    expect(types.includes("insert")).toBe(true)
    expect(types.includes("delete")).toBe(true)
  })

  it("multi-paragraph: edit in paragraph 2 only", () => {
    const left = doc([paragraph("P1"), paragraph("Hello"), paragraph("P3")])
    const right = doc([paragraph("P1"), paragraph("Hello!"), paragraph("P3")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    expect(r.nodes[0].type).toBe("unchanged")
    expect(r.nodes[1].type).toBe("modified")
    expect(r.nodes[2].type).toBe("unchanged")
  })

  it("trailing empty paragraph ignored in normalization", () => {
    const left = doc([paragraph("Hello"), paragraph("")])
    const right = doc([paragraph("Hello")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(0)
  })

  it("whitespace-only change within paragraph is detected (granularity applies)", () => {
    const left = doc([paragraph("Hello world")])
    const right = doc([paragraph("Hello  world")])
    const r = diffProseMirrorDocs(left, right)
    expect(r.stats.additions).toBe(0)
    expect(r.stats.deletions).toBe(0)
    expect(r.stats.modifications).toBe(1)
    const modified = r.nodes.find((n) => n.type === "modified")
    expect((modified?.textDiffs?.length ?? 0) > 0).toBe(true)
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
