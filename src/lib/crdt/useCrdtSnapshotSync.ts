import { useCallback, useEffect, useRef } from "react"
import { LoroDoc } from "loro-crdt"
import {
  getIsApplyingRemote,
  getLastSavedBase64,
  setIsApplyingRemote,
  setLastSavedBase64,
} from "./loro-doc-registry"

export function useCrdtSnapshotSync(args: {
  loroDoc: LoroDoc
  fileKey: string // fileId::branch
  remoteBase64: string | null | undefined
  onExport: (base64: string) => void
  debounceMs?: number
}) {
  const { loroDoc, fileKey, remoteBase64, onExport, debounceMs = 300 } = args
  const timeoutRef = useRef<number | null>(null)
  const isDirtyRef = useRef(false)

  // Import remote snapshot when it changes
  useEffect(() => {
    if (!remoteBase64) return
    const lastSaved = getLastSavedBase64(fileKey)
    if (lastSaved === remoteBase64) return
    if (getIsApplyingRemote(fileKey)) return
    try {
      setIsApplyingRemote(fileKey, true)
      const binary =
        typeof atob !== "undefined"
          ? atob(remoteBase64)
          : Buffer.from(remoteBase64, "base64").toString("binary")
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      loroDoc.import(bytes)
    } catch (e) {
      console.warn("Loro import failed", e)
    } finally {
      setIsApplyingRemote(fileKey, false)
    }
  }, [fileKey, loroDoc, remoteBase64])

  const scheduleExport = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      try {
        const bytes = loroDoc.export({ mode: "snapshot" })
        let binary = ""
        for (let i = 0; i < bytes.length; i++)
          binary += String.fromCharCode(bytes[i])
        const base64 =
          typeof btoa !== "undefined"
            ? btoa(binary)
            : Buffer.from(binary, "binary").toString("base64")
        setLastSavedBase64(fileKey, base64)
        onExport(base64)
        isDirtyRef.current = false
      } catch (e) {
        console.warn("Loro export failed", e)
      }
    }, debounceMs)
  }, [debounceMs, fileKey, loroDoc, onExport])

  const flush = useCallback(() => {
    if (!isDirtyRef.current) return
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    try {
      const bytes = loroDoc.export({ mode: "snapshot" })
      let binary = ""
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i])
      const base64 =
        typeof btoa !== "undefined"
          ? btoa(binary)
          : Buffer.from(binary, "binary").toString("base64")
      setLastSavedBase64(fileKey, base64)
      onExport(base64)
      isDirtyRef.current = false
    } catch (e) {
      console.warn("Loro export failed", e)
    }
  }, [fileKey, loroDoc, onExport])

  const markDirty = useCallback(() => {
    isDirtyRef.current = true
    scheduleExport()
  }, [scheduleExport])

  useEffect(() => {
    const onBeforeUnload = () => flush()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
      flush()
    }
  }, [flush])

  return { isSyncing: isDirtyRef.current, flush, markDirty }
}
