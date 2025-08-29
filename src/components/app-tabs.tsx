import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  clearActiveTabFileID,
  setActiveTabFileID,
  useTabs,
  useTabContent,
} from "@/services/tabs"

interface AppTabsProps {
  showClearButton?: boolean
}

export function AppTabs({ showClearButton = false }: AppTabsProps) {
  const tabs = useTabs()
  const tabNames = useTabContent(tabs.map((tab) => tab.fileId))
  const activeTab = tabs.find((tab) => tab.isActive)
  const activeTabName = tabNames.find(
    (content) => content.id === activeTab?.fileId
  )?.name

  const handleTabChange = (tabName: string) => {
    const tabContent = tabNames.find((content) => content.name === tabName)
    if (tabContent) {
      setActiveTabFileID(tabContent.id)
    }
  }

  // Don't render if no tabs
  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-4">
      <Tabs value={activeTabName} onValueChange={handleTabChange}>
        <TabsList>
          {tabNames.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.name}>
              {tab.name}
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
