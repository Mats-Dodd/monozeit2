import StarterKit from "@tiptap/starter-kit"
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details"
import Emoji, { gitHubEmojis } from "@tiptap/extension-emoji"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { Placeholder } from "@tiptap/extensions"
import Typography from "@tiptap/extension-typography"

//details needs to be set in slash command

export const extensions = [
  StarterKit,
  Details,
  DetailsContent,
  DetailsSummary,
  Emoji,
  gitHubEmojis,
  TaskList,
  TaskItem.configure({
    // nested: true,
  }),
  Placeholder.configure({
    // Use a placeholder:
    placeholder: "Do something",
  }),
  Typography,
]
