import { useEffect, useState } from "react"
import type { WorkbenchState } from "../types"

function stateKey(projectId: string) {
  return `workbench:state:${projectId}`
}

export function useWorkbenchPersistedState(projectId: string) {
  const [state, setState] = useState<WorkbenchState>(() => {
    try {
      const raw = localStorage.getItem(stateKey(projectId))
      if (raw) return JSON.parse(raw) as WorkbenchState
    } catch {
      // ignore
    }
    return {
      panes: {
        left: { tabs: [], activeTabId: undefined },
        right: { tabs: [], activeTabId: undefined },
      },
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(stateKey(projectId), JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [projectId, state])

  return [state, setState] as const
}
