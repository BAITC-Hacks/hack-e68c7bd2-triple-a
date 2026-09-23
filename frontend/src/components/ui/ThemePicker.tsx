import { useId } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { parseThemeMode } from '../../utils/theme'

export function ThemePicker() {
  const id = useId()
  const { mode, setMode } = useTheme()

  return (
    <div className="theme-picker">
      <label htmlFor={id}>Оформление</label>
      <select
        className="theme-select"
        id={id}
        value={mode}
        onChange={(event) => setMode(parseThemeMode(event.target.value))}
      >
        <option value="system">Системная</option>
        <option value="light">Светлая</option>
        <option value="dark">Тёмная</option>
      </select>
    </div>
  )
}
