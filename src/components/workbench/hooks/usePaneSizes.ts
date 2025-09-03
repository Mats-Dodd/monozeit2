import { useCallback, useMemo } from "react"

function sizeKey(projectId: string) {
  return `workbench:sizes:${projectId}`
}

export function usePaneSizes(projectId: string) {
  const handleSizeChange = useCallback(
    (sizes: number[]) => {
      try {
        localStorage.setItem(sizeKey(projectId), JSON.stringify(sizes))
      } catch {
        // ignore
      }
    },
    [projectId]
  )

  const defaultSizes = useMemo(() => {
    try {
      const raw = localStorage.getItem(sizeKey(projectId))
      return raw ? (JSON.parse(raw) as number[]) : [60, 40]
    } catch {
      return [60, 40]
    }
  }, [projectId])

  return { defaultSizes, handleSizeChange }
}
