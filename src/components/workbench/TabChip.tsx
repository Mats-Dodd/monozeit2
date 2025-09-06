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
        "group/tab inline-flex h-7 select-none items-center gap-1.5 px-2 text-[13px] leading-none border-b-2 border-transparent",
        active
          ? "text-foreground font-medium border-foreground"
          : "text-muted-foreground hover:text-foreground"
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
      <div onDrop={onDropBefore} className="h-5 w-px" />
      <span
        className={cn("truncate max-w-[200px]", active ? "font-medium" : "")}
      >
        {tab.title}
      </span>
      <button
        className={cn(
          "ml-1 grid size-5 place-items-center rounded-sm",
          active ? "bg-transparent" : "opacity-0 group-hover/tab:opacity-100"
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label={`Close ${tab.title}`}
      >
        <XIcon className="size-3.5 text-muted-foreground" />
      </button>
      <div onDrop={onDropAfter} className="h-5 w-px" />
    </div>
  )
}
