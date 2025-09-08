import { useCurrentFileID } from "@/services/tabs"
import { useBranchDoc } from "./useBranchDoc"
import { EditorCore } from "./EditorCore"

export function EditorShell() {
  const fileId = useCurrentFileID()
  const { loroDoc, ready, markDirty } = useBranchDoc(fileId)

  // Gate mount until the client collection resolves
  if (!fileId || !ready) return null

  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      {/* Top-right BranchMenu is rendered by WorkbenchPane */}
      <div className="flex-1 min-h-0">
        <EditorCore fileId={fileId} loroDoc={loroDoc} markDirty={markDirty} />
      </div>
    </div>
  )
}
