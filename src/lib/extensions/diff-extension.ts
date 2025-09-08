import { Extension, type JSONContent } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view"
import type { DiffResult, DiffNode } from "@/lib/crdt/prosemirror-diff"
import {
  diffProseMirrorDocs,
  extractTextFromNode,
} from "@/lib/crdt/prosemirror-diff"

export type DiffExtensionOptions = {
  showUnchanged?: boolean
  classes?: {
    addedBlock?: string
    insertInline?: string
    deleteWidget?: string
    deletedBlock?: string
  }
}

export type DiffStorage = {
  diffResult: DiffResult | null
  isDiffMode: boolean
  decorations: DecorationSet | null
  leftDoc: JSONContent | null
  rightDoc: JSONContent | null
  cacheKey?: string | null
}

const DEFAULT_CLASSES = {
  addedBlock: "bg-green-50 border-l-4 border-green-400 pl-2",
  insertInline: "bg-green-100 text-green-900 px-0.5 rounded",
  deleteWidget: "bg-red-100 text-red-900 line-through px-0.5 rounded",
  deletedBlock:
    "bg-red-50 border-l-4 border-red-400 pl-2 text-red-900 opacity-80",
}

const DIFF_PLUGIN_KEY = new PluginKey("diff-extension")

function buildDecorations(
  view: EditorView,
  diff: DiffResult,
  opts: Required<DiffExtensionOptions>
): DecorationSet {
  const decorations: Decoration[] = []
  const classes = { ...DEFAULT_CLASSES, ...(opts.classes ?? {}) }
  let nodeIndex = 0
  const pendingDeleted: DiffNode[] = []

  view.state.doc.descendants((node, pos) => {
    // Consider paragraphs and headings as block units for alignment
    const type = (node as unknown as { type?: { name?: string } }).type
    const name = type?.name
    const isTextBlock =
      node.isTextblock && (name === "paragraph" || name === "heading")

    if (!isTextBlock) return true

    // Flush any leading deleted nodes before this block
    while (diff.nodes[nodeIndex] && diff.nodes[nodeIndex].type === "deleted") {
      pendingDeleted.push(diff.nodes[nodeIndex])
      nodeIndex += 1
    }

    // Place pending deleted blocks before the current block position
    if (pendingDeleted.length > 0) {
      for (const dn of pendingDeleted) {
        const el = document.createElement("div")
        el.className = classes.deletedBlock
        el.dataset.diff = "deleted-block"
        const text = extractTextFromNode(dn.node) || "(deleted)"
        el.textContent = text
        decorations.push(
          Decoration.widget(pos, el, { side: -1, ignoreSelection: true })
        )
      }
      pendingDeleted.length = 0
    }

    const diffNode: DiffNode | undefined = diff.nodes[nodeIndex]
    nodeIndex += 1
    if (!diffNode) return true

    if (diffNode.type === "added") {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: classes.addedBlock,
          "data-diff": "added",
        })
      )
      return true
    }

    if (
      diffNode.type === "modified" &&
      diffNode.textDiffs &&
      diffNode.textDiffs.length > 0
    ) {
      for (const t of diffNode.textDiffs) {
        if (t.type === "insert") {
          const from = pos + 1 + t.start
          const to = pos + 1 + t.end
          decorations.push(
            Decoration.inline(from, to, {
              class: classes.insertInline,
              "data-diff": "insert",
            })
          )
        } else if (t.type === "delete") {
          const at = pos + 1 + t.start
          const el = document.createElement("span")
          el.className = classes.deleteWidget
          el.dataset.diff = "delete"
          el.textContent = t.content
          decorations.push(Decoration.widget(at, el, { side: -1 }))
        }
      }
      return true
    }

    // deleted nodes handled via pendingDeleted queue
    return true
  })

  // If there are trailing deleted nodes with no following blocks, place them at end
  if (pendingDeleted.length > 0) {
    const endPos = view.state.doc.nodeSize - 2 // just before the end
    for (const dn of pendingDeleted) {
      const el = document.createElement("div")
      el.className = classes.deletedBlock
      el.dataset.diff = "deleted-block"
      const text = extractTextFromNode(dn.node) || "(deleted)"
      el.textContent = text
      decorations.push(
        Decoration.widget(endPos, el, { side: 1, ignoreSelection: true })
      )
    }
  }

  return DecorationSet.create(view.state.doc, decorations)
}

export const DiffExtension = Extension.create<
  DiffExtensionOptions,
  DiffStorage
>({
  name: "diff",

  addOptions() {
    return {
      showUnchanged: true,
      classes: DEFAULT_CLASSES,
    }
  },

  addStorage() {
    return {
      diffResult: null,
      isDiffMode: false,
      decorations: null,
      leftDoc: null,
      rightDoc: null,
      cacheKey: null,
    }
  },

  addCommands() {
    return {
      setDiffContent:
        (left: JSONContent, right: JSONContent) =>
        ({ state, dispatch, view }) => {
          const options = this.options as Required<DiffExtensionOptions>
          const key = JSON.stringify(left) + "::" + JSON.stringify(right)
          if (this.storage.cacheKey === key && this.storage.diffResult) {
            // reuse cached result
          } else {
            const result = diffProseMirrorDocs(left, right)
            this.storage.diffResult = result
            this.storage.cacheKey = key
          }
          this.storage.isDiffMode = true
          this.storage.leftDoc = left
          this.storage.rightDoc = right
          if (view) {
            this.storage.decorations = buildDecorations(
              view,
              this.storage.diffResult!,
              options
            )
          }
          if (dispatch) dispatch(state.tr)
          return true
        },
      clearDiffView:
        () =>
        ({ state, dispatch }) => {
          this.storage.diffResult = null
          this.storage.isDiffMode = false
          this.storage.decorations = null
          this.storage.leftDoc = null
          this.storage.rightDoc = null
          if (dispatch) dispatch(state.tr)
          return true
        },
      toggleDiffView:
        (show: boolean) =>
        ({ state, dispatch }) => {
          this.storage.isDiffMode = show
          if (!show) {
            this.storage.decorations = null
          }
          if (dispatch) dispatch(state.tr)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const options = this.options as Required<DiffExtensionOptions>
    return [
      new Plugin({
        key: DIFF_PLUGIN_KEY,
        state: {
          init: () => {
            return DecorationSet.empty
          },
          apply: (tr, _old: DecorationSet, _oldState, _newState) => {
            if (!this.storage.isDiffMode || !this.storage.diffResult) {
              this.storage.decorations = null
              return DecorationSet.empty
            }
            // Only rebuild when doc changed
            if (!tr.docChanged) {
              return this.storage.decorations ?? DecorationSet.empty
            }
            const view = (this.editor?.view ?? null) as EditorView | null
            if (view) {
              this.storage.decorations = buildDecorations(
                view,
                this.storage.diffResult,
                options
              )
            }
            return this.storage.decorations ?? DecorationSet.empty
          },
        },
        props: {
          decorations: (state) => {
            const pluginState = DIFF_PLUGIN_KEY.getState(
              state
            ) as DecorationSet | null
            return pluginState ?? this.storage.decorations ?? null
          },
          editable: () => {
            return !this.storage.isDiffMode
          },
        },
      }),
    ]
  },
})

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    diff: {
      setDiffContent: (left: JSONContent, right: JSONContent) => ReturnType
      clearDiffView: () => ReturnType
      toggleDiffView: (show: boolean) => ReturnType
    }
  }
}
