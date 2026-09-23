import type { Contractor, SearchRequest, SearchResponse } from '../types/search'
import { formatEventDate, formatMoney } from '../utils/format'

export interface CatalogEntry {
  id: string
  anon_name: string
  categories: string[]
  city: string
  price_from_kzt: number
  event_formats: string[]
  languages: string[]
  max_hours: number | null
  busy_dates: string[]
  description: string
  synthetic: boolean
}

type FailureReason = 'busy_date' | 'budget' | 'event_format' | 'language' | 'duration'

const REASON_LABELS: Record<FailureReason, string> = {
  busy_date: 'занят на эту дату',
  budget: 'цена выше бюджета',
  event_format: 'не берёт такой формат мероприятия',
  language: 'не говорит на нужном языке',
  duration: 'не готов работать нужную длительность',
}
const STOPWORDS = new Set(['для', 'мероприятия', 'мероприятие', 'событие', 'события'])
const INVALID_CATALOG = 'Не удалось прочитать каталог. Обновите страницу и повторите поиск.'
const UNAVAILABLE_CATALOG = 'Не удалось загрузить каталог. Проверьте подключение и повторите поиск.'
let catalogCache: CatalogEntry[] | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText)
}

function parseEntry(value: unknown): CatalogEntry {
  if (!isRecord(value)
    || !isText(value.id) || !isText(value.anon_name) || !isText(value.city)
    || !isTextArray(value.categories) || value.categories.length === 0
    || !isTextArray(value.event_formats) || value.event_formats.length === 0
    || !isTextArray(value.languages) || !isTextArray(value.busy_dates)
    || !value.busy_dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    || typeof value.description !== 'string' || typeof value.synthetic !== 'boolean'
    || typeof value.price_from_kzt !== 'number' || !Number.isSafeInteger(value.price_from_kzt)
    || value.price_from_kzt < 0
    || (value.max_hours !== null && (typeof value.max_hours !== 'number'
      || !Number.isFinite(value.max_hours) || value.max_hours <= 0))) {
    throw new Error(INVALID_CATALOG)
  }
  return {
    id: value.id,
    anon_name: value.anon_name,
    categories: value.categories,
    city: value.city,
    price_from_kzt: value.price_from_kzt,
    event_formats: value.event_formats,
    languages: value.languages,
    max_hours: value.max_hours,
    busy_dates: value.busy_dates,
    description: value.description,
    synthetic: value.synthetic,
  }
}

export function parseCatalog(value: unknown): CatalogEntry[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(INVALID_CATALOG)
  const catalog = value.map(parseEntry)
  if (new Set(catalog.map(({ id }) => id)).size !== catalog.length) throw new Error(INVALID_CATALOG)
  return catalog
}

function failureReasons(entry: CatalogEntry, request: SearchRequest): FailureReason[] {
  const reasons: FailureReason[] = []
  if (entry.busy_dates.includes(request.event_date)) reasons.push('busy_date')
  if (entry.price_from_kzt > request.budget_kzt) reasons.push('budget')
  if (!entry.event_formats.includes(request.event_type)) reasons.push('event_format')
  if (request.language && !entry.languages.includes(request.language)) reasons.push('language')
  if (request.duration_hours && entry.max_hours !== null && entry.max_hours < request.duration_hours) {
    reasons.push('duration')
  }
  return reasons
}

function tokenize(value: string): Set<string> {
  return new Set((value.match(/[a-zA-Zа-яА-ЯёЁ0-9]+/g) ?? [])
    .filter((word) => word.length > 2).map((word) => word.toLowerCase()))
}

function scoreEntry(entry: CatalogEntry, request: SearchRequest): number {
  const priceScore = request.budget_kzt > 0
    ? Math.max(0, Math.min(1, entry.price_from_kzt / request.budget_kzt)) : 0
  const languageBonus = request.language && entry.languages.includes(request.language) ? 0.15 : 0
  const keywords = tokenize(`${request.event_type} ${request.category}`)
  const description = tokenize(entry.description)
  const hits = [...keywords].filter((word) => !STOPWORDS.has(word) && description.has(word)).length
  return priceScore + languageBonus + Math.min(0.2, hits * 0.05)
}

function explainEntry(entry: CatalogEntry, request: SearchRequest): string {
  const facts = [
    `В каталоге указан город ${entry.city} и формат «${request.event_type}».`,
    `На ${formatEventDate(request.event_date)} нет отметки о занятости.`,
    `Цена от ${formatMoney(entry.price_from_kzt)} — в пределах вашего бюджета.`,
  ]
  if (request.language) facts.push(`Указанный язык: ${request.language}.`)
  if (request.duration_hours && entry.max_hours !== null) {
    facts.push(`Работает до ${entry.max_hours} ч — подходит для выбранной длительности.`)
  }
  return facts.join(' ')
}

function toContractor(entry: CatalogEntry, request: SearchRequest): Contractor {
  return {
    id: entry.id,
    name: entry.anon_name,
    category: request.category,
    city: entry.city,
    price_from_kzt: entry.price_from_kzt,
    explanation: explainEntry(entry, request),
    synthetic: entry.synthetic,
  }
}

export function searchCatalog(catalog: CatalogEntry[], request: SearchRequest): SearchResponse {
  const normalizedCity = request.city.trim().toLowerCase()
  const normalizedCategory = request.category.trim().toLowerCase()
  const localEntries = catalog.filter((entry) => entry.city.trim().toLowerCase() === normalizedCity
    && entry.categories.some((category) => category.trim().toLowerCase() === normalizedCategory))
  if (localEntries.length === 0) {
    return {
      status: 'no_category',
      message: `В городе «${request.city}» в каталоге нет категории «${request.category}». Попробуйте другой город или категорию.`,
      results: [],
    }
  }
  const reasonCounts = new Map<FailureReason, number>()
  const candidates = localEntries.filter((entry) => {
    const reasons = failureReasons(entry, request)
    for (const reason of reasons) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
    return reasons.length === 0
  })
  if (candidates.length === 0) {
    const summary = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${count} из ${localEntries.length} — ${REASON_LABELS[reason]}`).join('; ')
    return {
      status: 'no_match',
      message: `В этом городе и категории есть подрядчики, но никто не подошёл: ${summary}.`,
      results: [],
    }
  }
  const results = candidates.map((entry) => ({ entry, score: scoreEntry(entry, request) }))
    .sort((a, b) => b.score - a.score || (a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0))
    .slice(0, 3).map(({ entry }) => toContractor(entry, request))
  return { status: 'ok', message: null, results }
}

export async function searchStaticCatalog(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
  signal?.throwIfAborted()
  if (!catalogCache) {
    let response: Response
    try {
      response = await fetch(`${import.meta.env.BASE_URL}data/contractors.json`, {
        headers: { Accept: 'application/json' },
        signal,
      })
    } catch {
      signal?.throwIfAborted()
      throw new Error(UNAVAILABLE_CATALOG)
    }
    if (!response.ok) throw new Error(UNAVAILABLE_CATALOG)
    let data: unknown
    try {
      data = await response.json()
    } catch {
      signal?.throwIfAborted()
      throw new Error(INVALID_CATALOG)
    }
    signal?.throwIfAborted()
    catalogCache = parseCatalog(data)
  }
  signal?.throwIfAborted()
  return searchCatalog(catalogCache, request)
}
