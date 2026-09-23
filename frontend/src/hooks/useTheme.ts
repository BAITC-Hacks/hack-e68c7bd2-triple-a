import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import {
  applyTheme,
  getSystemTheme,
  getSystemThemeQuery,
  loadThemeMode,
  parseThemeMode,
  resolveTheme,
  saveThemeMode,
  THEME_STORAGE_KEY,
} from '../utils/theme'
import type { ResolvedTheme, ThemeMode } from '../utils/theme'

export function useTheme() {
  const [mode, updateMode] = useState<ThemeMode>(loadThemeMode)
  const [systemTheme, updateSystemTheme] = useState<ResolvedTheme>(getSystemTheme)
  const resolvedTheme = resolveTheme(mode, systemTheme)

  useLayoutEffect(() => {
    if (mode !== 'system') return
    const query = getSystemThemeQuery()
    if (!query) return
    const update = () => updateSystemTheme(query.matches ? 'dark' : 'light')
    update()
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    }
    query.addListener(update)
    return () => query.removeListener(update)
  }, [mode])

  useLayoutEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    const receiveTheme = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return
      } catch {
        return
      }
      updateMode(parseThemeMode(event.newValue))
    }
    window.addEventListener('storage', receiveTheme)
    return () => window.removeEventListener('storage', receiveTheme)
  }, [])

  const setMode = useCallback((nextMode: ThemeMode) => {
    saveThemeMode(nextMode)
    updateMode(nextMode)
  }, [])

  return { mode, resolvedTheme, setMode }
}
