import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkbenchTab } from "./types"
import { WORKBENCH_TAB_MIME, STONES_FILE_MIME } from "./dnd/constants"

export default function TabChip({
  tab,
  active,
  onActivate,
  onClose,
  onDragStart,
  onDropBefore,
  onDropAfter,
}: {
  tab: WorkbenchTab
  active: boolean
  onActivate: () => void
  onClose: () => void
  onDragStart: (e: React.DragEvent) => void
  onDropBefore: (e: React.DragEvent) => void
  onDropAfter: (e: React.DragEvent) => void
}) {
  return (
    <div
      className={cn(
        "inline-flex select-none items-center gap-1 rounded-md px-2 text-sm h-7",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
      draggable
      onDragStart={onDragStart}
      onClick={onActivate}
      onDragOver={(e) => {
        if (
          e.dataTransfer.types.includes(WORKBENCH_TAB_MIME) ||
          e.dataTransfer.types.includes(STONES_FILE_MIME)
        ) {
          e.preventDefault()
        }
      }}
    >
      <div onDrop={onDropBefore} className="h-5 w-1" />
      <span className="truncate max-w-[180px]">{tab.title}</span>
      <button
        className="ml-1 rounded-sm hover:bg-muted/70"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label={`Close ${tab.title}`}
      >
        <XIcon className="size-3.5" />
      </button>
      <div onDrop={onDropAfter} className="h-5 w-1" />
    </div>
  )
}
