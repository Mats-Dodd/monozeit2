import { useMemo, useState } from "react"
import type { Editor } from "@tiptap/react"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { fileCollection } from "@/lib/collections"
import { getBranchesMetadata } from "@/lib/crdt/branch-utils"
import { snapshotToJSON } from "@/components/editor/utils/snapshotToJSON"
import type { DiffStorage } from "@/lib/extensions/diff-extension"

export function EditorToolbar({
  editor,
  fileId,
}: {
  editor: Editor | null
  fileId: string
}) {
  const { data } = useLiveQuery(
    (q) => q.from({ c: fileCollection }).where(({ c }) => eq(c.id, fileId)),
    [fileId]
  )
  const file = data?.[0]
  const md = useMemo(() => getBranchesMetadata(file), [file])
  const branches = useMemo(() => Object.keys(md.branches ?? {}), [md])
  const [baseBranch, setBaseBranch] = useState<string>(
    () => md.activeBranch ?? "main"
  )
  const [isDiff, setIsDiff] = useState(false)
  const stats = getDiffStats(editor?.storage)

  return (
    <div className="flex items-center gap-2 px-2 py-1 border-b">
      <select
        className="text-xs border rounded px-1 py-0.5"
        value={baseBranch}
        onChange={(e) => setBaseBranch(e.target.value)}
      >
        {branches.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      {!isDiff ? (
        <button
          className="text-xs border rounded px-2 py-0.5"
          onClick={async () => {
            if (!editor) return
            const base64 =
              md.branches[baseBranch]?.snapshot ?? file?.content ?? ""
            const leftJson = await snapshotToJSON(base64)
            const rightJson = editor.getJSON()
            editor.commands.setDiffContent(leftJson, rightJson)
            setIsDiff(true)
          }}
        >
          Compare
        </button>
      ) : (
        <button
          className="text-xs border rounded px-2 py-0.5"
          onClick={() => {
            editor?.commands.clearDiffView()
            setIsDiff(false)
          }}
        >
          Exit diff
        </button>
      )}
      {isDiff && stats ? (
        <div className="text-xs text-muted-foreground ml-2">
          +{stats.additions} / -{stats.deletions} / ~{stats.modifications}
        </div>
      ) : null}
    </div>
  )
}

function getDiffStats(
  storage: unknown
): { additions: number; deletions: number; modifications: number } | null {
  if (!storage || typeof storage !== "object") return null
  const s = storage as Record<string, unknown>
  const diffStorage = s["diff"] as DiffStorage | undefined
  const stats = diffStorage?.diffResult?.stats
  if (
    stats &&
    typeof stats.additions === "number" &&
    typeof stats.deletions === "number" &&
    typeof stats.modifications === "number"
  ) {
    return stats
  }
  return null
}
