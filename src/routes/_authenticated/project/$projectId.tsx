import { createFileRoute } from "@tanstack/react-router"
import Tiptap from "@/components/editor/editor"
import { Button } from "@/components/ui/button"
import { clearActiveTabFileID } from "@/services/tabs"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTabs } from "@/services/tabs"
import { useTabContent } from "@/services/tabs"

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: ProjectPage,
  ssr: false,
})

function ProjectPage() {
  const tabs = useTabs()
  const tabNames = useTabContent(tabs.map((tab) => tab.fileId))
  console.log(tabNames)
  const activeTab = tabs.find((tab) => tab.isActive)
  const activeTabName = tabNames.find(
    (content) => content.id === activeTab?.fileId
  )?.name
  console.log("activeTabName", activeTabName)
  return (
    <div className="p-6">
      <Tiptap />
      <Button onClick={() => clearActiveTabFileID()}>clear tabs </Button>
      <Tabs defaultValue={activeTabName}>
        <TabsList>
          {tabNames.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.name}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
