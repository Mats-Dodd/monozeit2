import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Outlet } from "@tanstack/react-router"
import { authClient } from "@/lib/auth-client"
import { useLiveQuery } from "@tanstack/react-db"
import { projectCollection } from "@/lib/collections"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useCreateProject } from "@/services/projects.mutations"

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
  ssr: false,
})

function AuthenticatedLayout() {
  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [createProject] = useCreateProject()

  const { data: projects, isLoading } = useLiveQuery((q) =>
    q.from({ projectCollection })
  )

  // Create an initial default project if the user doesn't yet have any.
  useEffect(() => {
    if (session && projects && !isLoading) {
      const hasProject = projects.length > 0
      if (!hasProject) {
        void createProject({
          name: "Default",
          ownerId: session.user.id,
          description: "Default project",
          shared_user_ids: [],
        }).then((id) => {
          navigate({ to: "/project/$projectId", params: { projectId: id } })
        })
      }
    }
  }, [session, projects, isLoading])

  const handleLogout = async () => {
    await authClient.signOut()
    navigate({ to: "/login" })
  }

  const handleCreateProject = () => {
    if (newProjectName.trim() && session) {
      void createProject({
        name: newProjectName.trim(),
        ownerId: session.user.id,
        description: "",
        shared_user_ids: [],
      }).then((id) => {
        navigate({ to: "/project/$projectId", params: { projectId: id } })
      })
      setNewProjectName("")
      setShowNewProjectForm(false)
    }
  }

  if (isPending) {
    return null
  }

  if (!session) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar
        session={session}
        projects={projects}
        showNewProjectForm={showNewProjectForm}
        setShowNewProjectForm={setShowNewProjectForm}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        handleCreateProject={handleCreateProject}
        handleLogout={handleLogout}
      />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center gap-2 text-sm">
            <span className="font-semibold">
              TanStack DB / Electric Starter
            </span>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
