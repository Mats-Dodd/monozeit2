import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  clearTabsForProject,
  setActiveTabFileID,
  useTabItems,
  useCloseTab,
} from "@/services/tabs"
import { X } from "lucide-react"
import { useMatch } from "@tanstack/react-router"

interface AppTabsProps {
  showClearButton?: boolean
}

export function AppTabs({ showClearButton = false }: AppTabsProps) {
  const match = useMatch({
    from: "/_authenticated/project/$projectId",
    shouldThrow: false,
  })
  const projectId = (match?.params as { projectId?: string } | undefined)
    ?.projectId

  const { items, activeId } = useTabItems(projectId)

  const closeTab = useCloseTab(projectId)

  const handleTabChange = (fileId: string) => {
    if (!projectId) return
    setActiveTabFileID(projectId, fileId)
  }

  const handleCloseTab = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    closeTab(fileId)
  }

  // Don't render if no tabs
  if (items.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-4">
      <Tabs value={activeId} onValueChange={handleTabChange}>
        <TabsList>
          {items.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="group relative pr-6"
            >
              <span>{tab.name}</span>
              <span
                className="absolute right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground cursor-pointer inline-flex items-center justify-center rounded-sm transition-colors"
                onClick={(e) => handleCloseTab(tab.id, e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleCloseTab(tab.id, e as unknown as React.MouseEvent)
                  }
                }}
              >
                <X className="h-3 w-3" />
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {showClearButton && projectId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearTabsForProject(projectId)}
        >
          Clear Tabs
        </Button>
      )}
    </div>
  )
}
