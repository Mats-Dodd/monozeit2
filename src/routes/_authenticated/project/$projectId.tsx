import { createFileRoute } from "@tanstack/react-router"
import WorkbenchPanes from "@/components/workbench/WorkbenchPanes"
import { EditorCore } from "@/components/editor/EditorCore"
import { useGetCurrentFileContent } from "@/components/editor/hooks"

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
          tab.fileId ? <PaneFileEditor fileId={tab.fileId} /> : null
        }
      />
    </div>
  )
}

function PaneFileEditor({ fileId }: { fileId: string }) {
  const rawContent = useGetCurrentFileContent(fileId)
  if (rawContent === undefined) return null
  const base64Content = typeof rawContent === "string" ? rawContent : null
  return <EditorCore fileId={fileId} base64Content={base64Content} />
}
