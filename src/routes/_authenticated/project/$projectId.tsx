import { createFileRoute } from "@tanstack/react-router"
import Tiptap from "@/components/editor/editor"

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: ProjectPage,
  ssr: false,
})

function ProjectPage() {
  return (
    <div className="p-6">
      <Tiptap />
    </div>
  )
}
