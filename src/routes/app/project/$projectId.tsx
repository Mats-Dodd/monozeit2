import { createFileRoute } from "@tanstack/react-router"
import WorkbenchPanes from "@/components/workbench/WorkbenchPanes"
import { EditorCore } from "@/components/editor/EditorCore"
import { useBranchDoc } from "@/components/editor/useBranchDoc"

export const Route = createFileRoute("/app/project/$projectId")({
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
  const { loroDoc, markDirty, ready } = useBranchDoc(fileId)

  if (!ready) return null
  return (
    <div className="h-full min-h-0 w-full">
      <EditorCore fileId={fileId} loroDoc={loroDoc} markDirty={markDirty} />
    </div>
  )
}
