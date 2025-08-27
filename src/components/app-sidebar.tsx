import { useMatch, useNavigate } from "@tanstack/react-router"
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
import { FolderIcon, UserIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMemo, useRef, useState } from "react"
import { createProject } from "@/services/projects"
import type { ProjectCreateUI } from "@/services/types"
import { SidebarFileTree } from "@/components/sidebar-file-tree"

interface AppSidebarProps {
  session: {
    user: {
      id: string
      email: string
      name?: string
    }
  }
  projects: Array<{
    id: string
    name: string
    description: string | null
    owner_id: string
    shared_user_ids: string[]
    created_at?: Date
  }>
  handleLogout: () => void
}

export function AppSidebar({
  session,
  projects,
  handleLogout,
}: AppSidebarProps) {
  const navigate = useNavigate()
  const match = useMatch({
    from: "/_authenticated/project/$projectId",
    shouldThrow: false,
  })
  const currentRouteProjectId = (
    match?.params as { projectId?: string } | undefined
  )?.projectId

  const selectedProjectId = useMemo(() => {
    if (currentRouteProjectId) return currentRouteProjectId
    if (projects.length > 0) return projects[0]!.id
    return undefined
  }, [currentRouteProjectId, projects])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const previousSelectedIdRef = useRef<string | undefined>(selectedProjectId)
  const newProjectInputRef = useRef<HTMLInputElement | null>(null)

  const selectedProjectName = useMemo(() => {
    const found = projects.find((p) => p.id === selectedProjectId)
    return found?.name ?? "Select project"
  }, [projects, selectedProjectId])

  const handleSelectChange = (value: string) => {
    if (value === "__create__") {
      previousSelectedIdRef.current = selectedProjectId
      const active = document.activeElement as HTMLElement | null
      active?.blur()
      setIsCreateOpen(true)
      return
    }
    navigate({ to: "/project/$projectId", params: { projectId: value } })
  }

  const handleCreate = () => {
    const name = newProjectName.trim()
    if (!name) return
    void createProject({
      name,
      ownerId: session.user.id,
      description: "",
      shared_user_ids: [],
    } satisfies ProjectCreateUI).then((id) => {
      setIsCreateOpen(false)
      setNewProjectName("")
      navigate({ to: "/project/$projectId", params: { projectId: id } })
    })
  }

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
          <SidebarGroupLabel>Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <Select
              value={selectedProjectId}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger className="w-full justify-between">
                <SelectValue placeholder="Select project">
                  <span className="truncate">{selectedProjectName}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
                <SelectItem value="__create__">Create new…</SelectItem>
              </SelectContent>
            </Select>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarFileTree projectId={selectedProjectId} />
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            newProjectInputRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Name your new project to get started.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Input
              value={newProjectName}
              ref={newProjectInputRef}
              placeholder="Project name"
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
                setNewProjectName("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newProjectName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
