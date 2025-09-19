import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ThemeMode = "system" | "light" | "dark"

const THEME_STORAGE_KEY = "theme"

function ignoreError(_error: unknown): void {
  return
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemTheme() : mode
}

export function applyThemeClass(theme: "light" | "dark"): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch (error) {
    ignoreError(error)
  }
  applyThemeClass(resolveTheme(mode))
}

export function getThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored
    }
  } catch (error) {
    ignoreError(error)
  }
  return "system"
}

export function listenToSystemThemeChange(
  callback: (theme: "light" | "dark") => void
): () => void {
  if (typeof window === "undefined") return () => undefined
  const mql = window.matchMedia("(prefers-color-scheme: dark)")
  const handler = () => callback(mql.matches ? "dark" : "light")
  mql.addEventListener?.("change", handler)
  return () => mql.removeEventListener?.("change", handler)
}
