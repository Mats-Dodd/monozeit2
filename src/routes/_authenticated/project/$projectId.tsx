import { createFileRoute } from "@tanstack/react-router"
import WorkbenchPanes from "@/components/workbench/WorkbenchPanes"
import { EditorCore } from "@/components/editor/EditorCore"

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: ProjectPage,
  ssr: false,
})

function ProjectPage() {
  const params = Route.useParams()
  const projectId = params.projectId
  return (
    <div className="h-full">
      <WorkbenchPanes
        projectId={projectId}
        renderContent={(tab) =>
          tab.fileId ? (
            <EditorCore fileId={tab.fileId} base64Content={null} />
          ) : null
        }
      />
    </div>
  )
}
