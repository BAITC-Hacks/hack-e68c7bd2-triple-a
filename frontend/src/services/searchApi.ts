import type { Contractor, SearchRequest, SearchResponse } from '../types/search'

const INVALID_RESPONSE = 'Сервис вернул неполный или неожиданный ответ. Попробуйте повторить поиск.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseContractor(value: unknown): Contractor {
  if (!isRecord(value)) throw new Error(INVALID_RESPONSE)
  const fields = ['id', 'name', 'category', 'city', 'explanation'] as const
  if (!fields.every((field) => typeof value[field] === 'string' && value[field].trim().length > 0)
    || typeof value.price_from_kzt !== 'number'
    || !Number.isSafeInteger(value.price_from_kzt)
    || value.price_from_kzt < 0
    || typeof value.synthetic !== 'boolean') throw new Error(INVALID_RESPONSE)

  return {
    id: value.id as string,
    name: value.name as string,
    category: value.category as string,
    city: value.city as string,
    explanation: value.explanation as string,
    price_from_kzt: value.price_from_kzt,
    synthetic: value.synthetic,
  }
}

export function parseSearchResponse(value: unknown): SearchResponse {
  if (!isRecord(value) || !Array.isArray(value.results)
    || (value.message !== undefined && value.message !== null && typeof value.message !== 'string')) {
    throw new Error(INVALID_RESPONSE)
  }
  const message = typeof value.message === 'string' ? value.message : null
  if (value.status === 'no_category' || value.status === 'no_match') {
    if (value.results.length !== 0) throw new Error(INVALID_RESPONSE)
    return { status: value.status, message, results: [] }
  }
  if (value.status !== 'ok' || value.results.length < 1 || value.results.length > 3) throw new Error(INVALID_RESPONSE)
  const results = value.results.map(parseContractor)
  if (new Set(results.map(({ id }) => id)).size !== results.length) throw new Error(INVALID_RESPONSE)
  return { status: 'ok', message, results }
}

export function resolveApiBaseUrl(configured?: string, pageUrl?: string): string {
  const value = configured?.trim() ?? ''
  if (value === '') return '/api'
  if (value === 'auto') {
    const url = new URL(pageUrl ?? window.location.href)
    url.port = '8000'
    return url.origin
  }
  const invalidAddress = 'Проверьте адрес сервиса поиска в настройках приложения.'
  if (value.startsWith('//') || value.includes('\\') || value.includes('?') || value.includes('#')) {
    throw new Error(invalidAddress)
  }
  let url: URL
  try {
    url = new URL(value, value.startsWith('/') ? 'https://frontend.invalid' : undefined)
  } catch {
    throw new Error(invalidAddress)
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Проверьте адрес сервиса поиска в настройках приложения.')
  }
  const path = url.pathname.replace(/\/+$/, '')
  return value.startsWith('/') ? path : `${url.origin}${path}`
}

export async function searchContractors(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
  const baseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
  const response = await fetch(`${baseUrl}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok) {
    throw new Error(response.status === 422 || response.status === 400
      ? 'Сервис не принял параметры поиска. Проверьте заполненные поля и отправьте запрос ещё раз.'
      : 'Сервис поиска временно недоступен. Попробуйте отправить запрос ещё раз.')
  }
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error('Не удалось прочитать ответ сервиса. Попробуйте повторить поиск.')
  }
  return parseSearchResponse(data)
}
