import { useEffect, useMemo } from "react"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { fileCollection } from "@/lib/collections"
import { acquireLoroDoc, releaseLoroDoc } from "@/lib/crdt/loro-doc-registry"
import { useCrdtSnapshotSync } from "@/lib/crdt/useCrdtSnapshotSync"
import {
  getBranchesMetadata,
  isBranchesMetadata,
  updateBranchSnapshot,
  type BranchesMetadata,
} from "@/lib/crdt/branch-utils"
import { updateFile } from "@/services/files"

export function useBranchDoc(fileId: string) {
  const { data } = useLiveQuery(
    (q) => q.from({ c: fileCollection }).where(({ c }) => eq(c.id, fileId)),
    [fileId]
  )

  const file = data?.[0]

  const { activeBranch, branchSnapshot, fileKey, metadata } = useMemo(() => {
    const md = getBranchesMetadata(file)
    const active = md.activeBranch ?? "main"
    const snap = md.branches[active]?.snapshot ?? file?.content ?? null
    const key = `${fileId}::${active}`
    return {
      activeBranch: active,
      branchSnapshot: typeof snap === "string" ? snap : null,
      fileKey: key,
      metadata: md,
    }
  }, [file, fileId])

  const loroDoc = useMemo(() => acquireLoroDoc(fileKey), [fileKey])

  useEffect(() => {
    return () => {
      releaseLoroDoc(fileKey)
    }
  }, [fileKey])

  const { flush, markDirty, isSyncing } = useCrdtSnapshotSync({
    loroDoc,
    fileKey,
    remoteBase64: branchSnapshot,
    onExport: (base64) => {
      console.log("[branches] sync export", {
        fileId,
        fileKey,
        activeBranch,
        hasFile: !!file,
      })
      // Avoid writing metadata until the server-provided metadata is present
      if (!isBranchesMetadata(file?.metadata)) {
        console.log("[branches] skip export: metadata not ready")
        return
      }
      const currentMd = file!.metadata as unknown as BranchesMetadata
      const updated = updateBranchSnapshot(currentMd, activeBranch, base64)
      void updateFile({
        id: fileId,
        metadata: updated as unknown as Record<string, unknown>,
      })
    },
    debounceMs: 500,
  })

  const ready = file !== undefined

  return {
    loroDoc,
    activeBranch,
    branchesMetadata: metadata,
    markDirty,
    flush,
    isSyncing,
    ready,
  }
}
