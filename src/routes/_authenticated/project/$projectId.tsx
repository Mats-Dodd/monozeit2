import { createFileRoute } from "@tanstack/react-router"
import WorkbenchPanes from "@/components/workbench/WorkbenchPanes"
import { EditorCore } from "@/components/editor/EditorCore"
import { useBranchDoc } from "@/components/editor/useBranchDoc"
import { BranchMenu } from "@/components/editor/BranchMenu"

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: ProjectPage,
  ssr: false,
})

function ProjectPage() {
  const params = Route.useParams()
  const projectId = params.projectId
  return (
    <div className="h-full min-h-0">
      <WorkbenchPanes
        projectId={projectId}
        renderContent={(tab) =>
          tab.fileId ? <PaneFileEditor fileId={tab.fileId} /> : null
        }
      />
    </div>
  )
}

function PaneFileEditor({ fileId }: { fileId: string }) {
  const { loroDoc, markDirty, flush, ready } = useBranchDoc(fileId)

  if (!ready) return null
  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1 border-b">
        <BranchMenu fileId={fileId} flush={flush} />
      </div>
      <div className="flex-1 min-h-0">
        <EditorCore fileId={fileId} loroDoc={loroDoc} markDirty={markDirty} />
      </div>
    </div>
  )
}
