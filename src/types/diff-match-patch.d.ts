declare module "diff-match-patch" {
  type Diff = [number, string]
  export default class DiffMatchPatch {
    diff_main(text1: string, text2: string): Diff[]
    diff_cleanupSemantic(diffs: Diff[]): void
  }
}
