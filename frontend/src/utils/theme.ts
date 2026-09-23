import iconLight from '../assets/brand/icon-light.svg'
import iconDark from '../assets/brand/icon-dark.svg'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = Exclude<ThemeMode, 'system'>
export const THEME_STORAGE_KEY = 'shabyt.theme.v1'
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>

function getStorage(storage?: ThemeStorage): ThemeStorage | null {
  try {
    return storage ?? (typeof window === 'undefined' ? null : window.localStorage)
  } catch {
    return null
  }
}

export function parseThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function loadThemeMode(storage?: ThemeStorage): ThemeMode {
  try {
    return parseThemeMode(getStorage(storage)?.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

export function saveThemeMode(mode: ThemeMode, storage?: ThemeStorage): boolean {
  try {
    const target = getStorage(storage)
    if (!target) return false
    target.setItem(THEME_STORAGE_KEY, mode)
    return true
  } catch {
    return false
  }
}

export function getSystemThemeQuery(): MediaQueryList | null {
  try {
    return typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? null
      : window.matchMedia(SYSTEM_THEME_QUERY)
  } catch {
    return null
  }
}

export function getSystemTheme(): ResolvedTheme {
  return getSystemThemeQuery()?.matches ? 'dark' : 'light'
}

export function resolveTheme(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return mode === 'system' ? systemTheme : mode
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (favicon) favicon.href = theme === 'dark' ? iconDark : iconLight
  let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!themeColor) {
    themeColor = document.createElement('meta')
    themeColor.name = 'theme-color'
    document.head.append(themeColor)
  }
  themeColor.content = theme === 'dark' ? '#161B19' : '#F7F6F1'
}

export function applyInitialTheme(): { mode: ThemeMode; resolvedTheme: ResolvedTheme } {
  const mode = loadThemeMode()
  const resolvedTheme = resolveTheme(mode, getSystemTheme())
  applyTheme(resolvedTheme)
  return { mode, resolvedTheme }
}
