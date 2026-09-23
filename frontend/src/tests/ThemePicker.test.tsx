import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemePicker } from '../components/ui/ThemePicker'
import { SYSTEM_THEME_QUERY, THEME_STORAGE_KEY } from '../utils/theme'

function mockSystemTheme(initialDark: boolean) {
  let matches = initialDark
  const events = new EventTarget()
  const query = {
    get matches() { return matches },
    media: SYSTEM_THEME_QUERY,
    onchange: null,
    addEventListener: vi.fn(events.addEventListener.bind(events)),
    removeEventListener: vi.fn(events.removeEventListener.bind(events)),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: events.dispatchEvent.bind(events),
  } as MediaQueryList
  vi.spyOn(window, 'matchMedia').mockReturnValue(query)
  return {
    query,
    change(dark: boolean) {
      act(() => {
        matches = dark
        events.dispatchEvent(new Event('change'))
      })
    },
  }
}

function storageChange(value: string | null, key: string | null = THEME_STORAGE_KEY) {
  act(() => window.dispatchEvent(new StorageEvent('storage', { key, newValue: value })))
}

describe('appearance selection', () => {
  it('follows changes to system appearance by default', () => {
    const system = mockSystemTheme(true)
    render(<ThemePicker />)

    expect(screen.getByRole('combobox', { name: 'Оформление' })).toHaveValue('system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    system.change(false)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    system.change(true)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('keeps a manual override, persists it, and resumes the current system theme', async () => {
    const user = userEvent.setup()
    const system = mockSystemTheme(false)
    const view = render(<ThemePicker />)
    const picker = screen.getByLabelText('Оформление')

    await user.selectOptions(picker, 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    system.change(true)
    system.change(false)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    view.unmount()
    render(<ThemePicker />)
    expect(screen.getByLabelText('Оформление')).toHaveValue('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    await user.selectOptions(screen.getByLabelText('Оформление'), 'system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    system.change(true)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('updates from another tab and handles invalid values, removed preferences, and cleared storage', () => {
    mockSystemTheme(false)
    render(<ThemePicker />)

    storageChange('dark')
    expect(screen.getByLabelText('Оформление')).toHaveValue('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    storageChange('light', 'another-preference')
    expect(screen.getByLabelText('Оформление')).toHaveValue('dark')

    storageChange('invalid')
    expect(screen.getByLabelText('Оформление')).toHaveValue('system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    storageChange('dark')
    storageChange(null)
    expect(screen.getByLabelText('Оформление')).toHaveValue('system')

    storageChange('dark')
    storageChange(null, null)
    expect(screen.getByLabelText('Оформление')).toHaveValue('system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('lets the user change appearance when local storage is unavailable', async () => {
    const user = userEvent.setup()
    mockSystemTheme(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
    render(<ThemePicker />)

    expect(screen.getByLabelText('Оформление')).toHaveValue('system')
    await user.selectOptions(screen.getByLabelText('Оформление'), 'dark')
    expect(screen.getByLabelText('Оформление')).toHaveValue('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('removes media and storage listeners when the picker is unmounted', () => {
    const system = mockSystemTheme(false)
    const removeEvent = vi.spyOn(window, 'removeEventListener')
    const view = render(<ThemePicker />)

    view.unmount()

    expect(system.query.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(removeEvent).toHaveBeenCalledWith('storage', expect.any(Function))
  })
})
