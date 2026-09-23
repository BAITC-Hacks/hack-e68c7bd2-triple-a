const moneyFormatter = new Intl.NumberFormat('ru-RU')
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)} ₸`
}

export function formatEventDate(value: string): string {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function resultCountLabel(count: number): string {
  const lastTwo = count % 100
  const lastDigit = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} вариантов`
  if (lastDigit === 1) return `${count} вариант`
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} варианта`
  return `${count} вариантов`
}
