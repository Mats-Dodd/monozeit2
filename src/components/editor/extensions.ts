import { StarterKit } from "@syfxlin/tiptap-starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Typography from "@tiptap/extension-typography"
import { DiffExtension } from "@/lib/extensions/diff-extension"

//details needs to be set in slash command

export const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    bulletList: {
      HTMLAttributes: {
        class: "list-disc",
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal",
      },
    },
    blockquote: {
      HTMLAttributes: {
        class: "border-l-2 border-gray-300 pl-4",
      },
    },
    code: {
      HTMLAttributes: {
        class: "bg-gray-100 p-1 rounded-md",
      },
    },
    codeBlock: {
      HTMLAttributes: {
        class: "bg-gray-100 p-1 rounded-md",
      },
    },
    horizontalRule: {
      HTMLAttributes: {
        class: "border-t border-gray-300",
      },
    },
    link: {
      HTMLAttributes: {
        class: "text-blue-500 hover:text-blue-700",
      },
    },
    table: {
      HTMLAttributes: {
        class: "w-full",
      },
    },
    tableCell: {
      HTMLAttributes: {
        class: "border border-gray-300 p-2",
      },
    },
    mathBlock: {
      HTMLAttributes: {
        class: "math-block",
      },
    },
    mathInline: {
      HTMLAttributes: {
        class: "math-inline",
      },
    },
    // Keep media off to avoid Plyr in tests/bundle
    audio: false,
    image: false,
    video: false,
  }),
  Placeholder.configure({
    // Use a placeholder:
    placeholder: "Do something",
  }),
  Typography,
  DiffExtension.configure({}),
]
