import type { SearchFormValues } from '../types/search'

export const MIN_EVENT_DATE = '2026-09-23'
export const MAX_EVENT_DATE = '2026-12-31'
export const REQUEST_TIMEOUT_MS = 45_000

export const CITIES = ['Алматы', 'Астана', 'Зарубежье']

export const EVENT_TYPES = [
  { value: 'свадьба', label: 'Свадьба' },
  { value: 'той', label: 'Той' },
  { value: 'корпоратив', label: 'Корпоратив' },
  { value: 'конференция', label: 'Конференция' },
  { value: 'юбилей', label: 'Юбилей' },
  { value: 'день рождения', label: 'День рождения' },
]

export const CATEGORIES = [
  'Ведущий',
  'Фотограф',
  'Банкетный зал',
  'Флорист',
  'Декоратор',
  'Подарки и сувениры',
  'Ведущий церемонии',
  'Фото и видеобудки',
  'Отель',
  'Инструменталист',
]

export const LANGUAGES = [
  { value: '', label: 'Любой' },
  { value: 'русский', label: 'Русский' },
  { value: 'казахский', label: 'Казахский' },
  { value: 'английский', label: 'Английский' },
]

export const INITIAL_FORM: SearchFormValues = {
  city: '',
  event_date: '',
  event_type: '',
  category: '',
  budget_kzt: '',
  duration_hours: '',
  language: '',
}
