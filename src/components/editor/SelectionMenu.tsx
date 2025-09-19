import { Editor } from "@tiptap/core"
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Quote,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code2,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FormatAction = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  shortcut?: string
  isActive: (editor: Editor) => boolean
  command: (editor: Editor) => void
  divider?: boolean
}

const formatActions: FormatAction[] = [
  {
    id: "bold",
    icon: Bold,
    title: "Bold",
    shortcut: "⌘B",
    isActive: (editor) => editor.isActive("bold"),
    command: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    icon: Italic,
    title: "Italic",
    shortcut: "⌘I",
    isActive: (editor) => editor.isActive("italic"),
    command: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: "strike",
    icon: Strikethrough,
    title: "Strikethrough",
    shortcut: "⌘⇧X",
    isActive: (editor) => editor.isActive("strike"),
    command: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: "code",
    icon: Code,
    title: "Code",
    shortcut: "⌘E",
    isActive: (editor) => editor.isActive("code"),
    command: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    id: "link",
    icon: Link,
    title: "Link",
    shortcut: "⌘K",
    isActive: (editor) => editor.isActive("link"),
    command: () => {}, // handled by popover
    divider: true,
  },
  {
    id: "blockquote",
    icon: Quote,
    title: "Quote",
    isActive: (editor) => editor.isActive("blockquote"),
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "h1",
    icon: Heading1,
    title: "Heading 1",
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    icon: Heading2,
    title: "Heading 2",
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "bulletList",
    icon: List,
    title: "Bullet List",
    isActive: (editor) => editor.isActive("bulletList"),
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    icon: ListOrdered,
    title: "Numbered List",
    isActive: (editor) => editor.isActive("orderedList"),
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "codeBlock",
    icon: Code2,
    title: "Code Block",
    isActive: (editor) => editor.isActive("codeBlock"),
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
]

export function SelectionMenu({
  editor,
  className,
}: {
  editor: Editor
  className?: string
}) {
  const [linkUrl, setLinkUrl] = useState("")
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setIsLinkPopoverOpen(false)
    setLinkUrl("")
  }

  const handleLinkAction = (action: FormatAction) => {
    if (action.id === "link") {
      const previousUrl = editor.getAttributes("link").href || ""
      setLinkUrl(previousUrl)
      setIsLinkPopoverOpen(true)
    } else {
      action.command(editor)
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md",
        className
      )}
    >
      {formatActions.map((action, idx) => {
        const Icon = action.icon
        const isActive = action.isActive(editor)

        if (action.id === "link") {
          return (
            <div key={action.id} className="flex items-center gap-0.5">
              <Popover
                open={isLinkPopoverOpen}
                onOpenChange={setIsLinkPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("h-8 w-8 p-0", isActive && "bg-accent")}
                    title={`${action.title}${action.shortcut ? ` (${action.shortcut})` : ""}`}
                    onClick={() => handleLinkAction(action)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="link-url">URL</Label>
                    <Input
                      id="link-url"
                      type="url"
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleLinkSubmit()
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsLinkPopoverOpen(false)
                          setLinkUrl("")
                        }}
                      >
                        Cancel
                      </Button>
                      {isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            editor.chain().focus().unsetLink().run()
                            setIsLinkPopoverOpen(false)
                            setLinkUrl("")
                          }}
                        >
                          Remove
                        </Button>
                      )}
                      <Button size="sm" onClick={handleLinkSubmit}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {action.divider && idx < formatActions.length - 1 && (
                <div className="h-6 w-px bg-border" />
              )}
            </div>
          )
        }

        return (
          <div key={action.id} className="flex items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              className={cn("h-8 w-8 p-0", isActive && "bg-accent")}
              title={`${action.title}${action.shortcut ? ` (${action.shortcut})` : ""}`}
              onClick={() => handleLinkAction(action)}
            >
              <Icon className="h-4 w-4" />
            </Button>
            {action.divider && idx < formatActions.length - 1 && (
              <div className="h-6 w-px bg-border" />
            )}
          </div>
        )
      })}
    </div>
  )
}
