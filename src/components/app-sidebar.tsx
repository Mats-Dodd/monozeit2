import { Link } from "@tanstack/react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FolderIcon, PlusIcon, UserIcon } from "lucide-react"

interface AppSidebarProps {
  session: {
    user: {
      id: string
      email: string
      name?: string
    }
  }
  projects: Array<{
    id: number
    name: string
    description: string | null
    owner_id: string
    shared_user_ids: string[]
    created_at: Date
  }>
  showNewProjectForm: boolean
  setShowNewProjectForm: (show: boolean) => void
  newProjectName: string
  setNewProjectName: (name: string) => void
  handleCreateProject: () => void
  handleLogout: () => void
}

export function AppSidebar({
  session,
  projects,
  showNewProjectForm,
  setShowNewProjectForm,
  newProjectName,
  setNewProjectName,
  handleCreateProject,
  handleLogout,
}: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <FolderIcon className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">TanStack Starter</span>
            <span className="truncate text-xs">DB + Electric</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between">
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="size-4 p-0 hover:bg-sidebar-accent"
              onClick={() => setShowNewProjectForm(!showNewProjectForm)}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>

          <SidebarGroupContent>
            {showNewProjectForm && (
              <div className="mb-2 space-y-2">
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  placeholder="Project name"
                  className="h-8"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateProject}
                    className="h-7 px-2"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewProjectForm(false)}
                    className="h-7 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <SidebarMenu>
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/project/$projectId"
                      params={{ projectId: project.id.toString() }}
                    >
                      <FolderIcon className="size-4" />
                      <span>{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <UserIcon className="size-4" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {session.user.name || "User"}
                </span>
                <span className="truncate text-xs">{session.user.email}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full"
        >
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
