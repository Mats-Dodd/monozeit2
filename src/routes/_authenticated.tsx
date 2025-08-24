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

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
  ssr: false,
})

function AuthenticatedLayout() {
  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")

  const { data: projects, isLoading } = useLiveQuery((q) =>
    q.from({ projectCollection })
  )

  // Create an initial default project if the user doesn't yet have any.
  useEffect(() => {
    if (session && projects && !isLoading) {
      const hasProject = projects.length > 0
      if (!hasProject) {
        projectCollection.insert({
          id: Math.floor(Math.random() * 100000),
          name: "Default",
          description: "Default project",
          owner_id: session.user.id,
          shared_user_ids: [],
          created_at: new Date(),
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
      projectCollection.insert({
        id: Math.floor(Math.random() * 100000),
        name: newProjectName.trim(),
        description: "",
        owner_id: session.user.id,
        shared_user_ids: [],
        created_at: new Date(),
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
