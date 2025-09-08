## Diff view: architecture and usage

- Branch snapshots are stored in file `metadata` as base64 Loro snapshots per branch.
- To compare, we convert a base branch snapshot to TipTap JSON and compare with the current editor JSON.
- The diff algorithm aligns block nodes by index and computes text-level diffs using `diff-match-patch`.
- Visualization is implemented as a TipTap extension that renders decorations for inserted text, added blocks, and deleted placeholders; the editor is read-only while diff mode is active.

### Key modules

- `src/lib/crdt/prosemirror-diff.ts`: Diff types and algorithm.
- `src/lib/extensions/diff-extension.ts`: Commands and decorations.
- `src/components/editor/utils/snapshotToJSON.ts`: Snapshot → JSON conversion helper.
- `src/components/editor/BranchMenu.tsx`: UI controls to enable/disable diff.

### Commands

- `editor.commands.setDiffContent(leftJson, rightJson)`
- `editor.commands.clearDiffView()`

### Notes

- Reordering is treated as add/delete pairs (fast, simple alignment).
- Attribute-only changes are marked as modified without per-attribute detail.
- Deleted blocks are visualized as inline widgets before the nearest block.
