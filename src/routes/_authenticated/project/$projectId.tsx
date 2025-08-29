import { createFileRoute } from "@tanstack/react-router"
import Tiptap from "@/components/editor/editor"
import { Button } from "@/components/ui/button"
import { clearActiveTabFileID } from "@/services/tabs"

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: ProjectPage,
  ssr: false,
})

function ProjectPage() {
  return (
    <div className="p-6">
      <Tiptap />
      <Button onClick={() => clearActiveTabFileID()}>clear tabs </Button>
    </div>
  )
}
