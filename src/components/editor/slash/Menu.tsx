import type { SlashCommandItem } from "./suggestions"
import { cn } from "@/lib/utils"

export type SlashSection =
  | "Blocks"
  | "Inline"
  | "Media"
  | "Structure"
  | "Recent"

export type RenderItem = SlashCommandItem & {
  id: string
  section?: SlashSection
  shortcut?: string
  description?: string
}

export function SlashMenu({
  items,
  activeIndex,
  onHoverIndex,
  onSelectIndex,
  className,
}: {
  items: RenderItem[]
  activeIndex: number
  onHoverIndex: (idx: number) => void
  onSelectIndex: (idx: number) => void
  className?: string
}) {
  const groups = groupBySection(items)
  return (
    <div
      className={cn(
        "min-w-[360px] rounded-md border bg-popover text-popover-foreground shadow-md py-1",
        className
      )}
      role="listbox"
      aria-activedescendant={`slash-option-${activeIndex}`}
    >
      {groups.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No commands. Keep typing or press Esc.
        </div>
      ) : null}
      {groups.map((g) => (
        <div key={g.section ?? "__none"}>
          {g.section ? (
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {g.section}
            </div>
          ) : null}
          <div className="px-1">
            {g.items.map((item) => {
              const globalIdx = item.__index
              const selected = globalIdx === activeIndex
              return (
                <button
                  type="button"
                  id={`slash-option-${globalIdx}`}
                  key={item.id}
                  className={cn(
                    "w-full text-left rounded-sm px-2 py-1.5 text-sm",
                    selected ? "bg-accent" : "hover:bg-accent"
                  )}
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onMouseEnter={() => onHoverIndex(globalIdx)}
                  onClick={() => onSelectIndex(globalIdx)}
                >
                  <span className="truncate inline-block max-w-full align-middle">
                    {item.title}
                  </span>
                  {item.shortcut ? (
                    <span className="ml-2 float-right text-xs text-muted-foreground">
                      {item.shortcut}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function groupBySection(items: RenderItem[]): Array<{
  section?: SlashSection
  items: (RenderItem & { __index: number })[]
}> {
  const map = new Map<
    SlashSection | undefined,
    (RenderItem & { __index: number })[]
  >()
  items.forEach((it, i) => {
    const key = it.section
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({ ...it, __index: i })
  })
  return Array.from(map.entries()).map(([section, list]) => ({
    section,
    items: list,
  }))
}
