import { describe, expect, it, vi } from 'vitest'
import {
  applyInitialTheme,
  getSystemTheme,
  loadThemeMode,
  parseThemeMode,
  resolveTheme,
  saveThemeMode,
  THEME_STORAGE_KEY,
} from './theme'

describe('theme preferences', () => {
  it.each(['light', 'dark', 'system'] as const)('persists and restores %s', (mode) => {
    expect(saveThemeMode(mode)).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(mode)
    expect(loadThemeMode()).toBe(mode)
  })

  it.each([null, undefined, '', 'sepia', '{"mode":"dark"}', 1, {}])(
    'uses the system appearance for invalid saved value %s',
    (value) => {
      expect(parseThemeMode(value)).toBe('system')
    },
  )

  it('continues when storage reads and writes are denied', () => {
    const storage = {
      getItem: () => { throw new Error('Blocked') },
      setItem: () => { throw new Error('Blocked') },
    }
    expect(loadThemeMode(storage)).toBe('system')
    expect(saveThemeMode('dark', storage)).toBe(false)
  })

  it('continues when access to the storage object is denied', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Blocked')
    })
    expect(loadThemeMode()).toBe('system')
    expect(saveThemeMode('dark')).toBe(false)
  })

  it('honors manual appearance over the system preference', () => {
    expect(resolveTheme('light', 'dark')).toBe('light')
    expect(resolveTheme('dark', 'light')).toBe('dark')
    expect(resolveTheme('system', 'dark')).toBe('dark')
  })

  it('initializes the chosen appearance before the application renders', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    expect(applyInitialTheme()).toEqual({ mode: 'dark', resolvedTheme: 'dark' })
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#161B19')

    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    applyInitialTheme()
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#F7F6F1')
  })

  it('falls back to light when the browser cannot expose its system preference', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => { throw new Error('Unavailable') })
    expect(getSystemTheme()).toBe('light')
  })
})
