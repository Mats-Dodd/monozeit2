import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  clearActiveTabFileID,
  setActiveTabFileID,
  useTabs,
  useCloseTab,
} from "@/services/tabs"
import { X } from "lucide-react"

interface AppTabsProps {
  showClearButton?: boolean
}

export function AppTabs({ showClearButton = false }: AppTabsProps) {
  const tabs = useTabs()
  const activeTab = tabs.tabs.find((tab) => tab.isActive)

  const closeTab = useCloseTab()

  const handleTabChange = (fileId: string) => {
    setActiveTabFileID(fileId)
  }

  const handleCloseTab = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    console.log("closing tab", fileId)
    closeTab(fileId)
  }

  // Don't render if no tabs
  if (tabs.tabs.length === 0) {
    return null
  }

  console.log(
    "tabs",
    tabs.tabs.map((tab) => tab.fileId)
  )

  return (
    <div className="flex items-center gap-4">
      <Tabs value={activeTab?.fileId} onValueChange={handleTabChange}>
        <TabsList>
          {tabs.tabContent.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="group relative pr-6"
            >
              <span>{tab.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => handleCloseTab(tab.id, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {showClearButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearActiveTabFileID()}
        >
          Clear Tabs
        </Button>
      )}
    </div>
  )
}
