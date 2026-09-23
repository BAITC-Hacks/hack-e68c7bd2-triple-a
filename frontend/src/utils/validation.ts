import { CATEGORIES, CITIES, EVENT_TYPES, LANGUAGES, MAX_EVENT_DATE, MIN_EVENT_DATE } from '../config/search'
import type { FormErrors, SearchFormValues, SearchRequest } from '../types/search'

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
}

function isValidEventDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
    && value >= MIN_EVENT_DATE
    && value <= MAX_EVENT_DATE
}

export function validateSearchForm(values: SearchFormValues): FormErrors {
  const errors: FormErrors = {}

  if (!CITIES.includes(values.city)) errors.city = 'Выберите город из списка.'
  if (!isValidEventDate(values.event_date)) errors.event_date = 'Выберите дату с 23.09 по 31.12.2026.'
  if (!EVENT_TYPES.some(({ value }) => value === values.event_type)) errors.event_type = 'Выберите тип события.'
  if (!CATEGORIES.includes(values.category)) errors.category = 'Выберите категорию подрядчика.'
  if (!isPositiveInteger(values.budget_kzt)) errors.budget_kzt = 'Укажите бюджет целым числом больше нуля.'
  if (values.duration_hours !== '' && !isPositiveInteger(values.duration_hours)) {
    errors.duration_hours = 'Укажите количество часов целым числом больше нуля.'
  }
  if (!LANGUAGES.some(({ value }) => value === values.language)) errors.language = 'Выберите язык из списка.'

  return errors
}

export function toSearchRequest(values: SearchFormValues): SearchRequest {
  if (Object.keys(validateSearchForm(values)).length > 0) {
    throw new Error('Проверьте параметры события перед поиском.')
  }

  return {
    city: values.city,
    event_date: values.event_date,
    event_type: values.event_type,
    category: values.category,
    budget_kzt: Number(values.budget_kzt),
    duration_hours: values.duration_hours === '' ? null : Number(values.duration_hours),
    language: values.language || null,
  }
}
