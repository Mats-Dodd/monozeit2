import StarterKit from "@tiptap/starter-kit"
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details"
import Emoji, { gitHubEmojis } from "@tiptap/extension-emoji"

//details needs to be set in slash command

export const extensions = [
  StarterKit,
  Details,
  DetailsContent,
  DetailsSummary,
  Emoji,
  gitHubEmojis,
]
