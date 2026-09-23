import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Contractor, SearchRequest } from '../types/search'
import { parseSearchResponse, resolveApiBaseUrl, searchContractors } from './searchApi'

const contractor: Contractor = {
  id: 'test-contractor-1', name: 'Тестовый подрядчик', category: 'Ведущий', city: 'Алматы',
  price_from_kzt: 150000, explanation: 'Подходит по бюджету и дате.', synthetic: false,
}

const request: SearchRequest = {
  city: 'Алматы', event_date: '2026-10-15', event_type: 'свадьба', category: 'Ведущий',
  budget_kzt: 300000, duration_hours: null, language: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('backend response contract', () => {
  it('accepts real cards and normalizes an omitted message', () => {
    expect(parseSearchResponse({ status: 'ok', results: [contractor] })).toEqual({
      status: 'ok', message: null, results: [contractor],
    })
  })

  it.each(['no_category', 'no_match'])('accepts the %s empty state', (status) => {
    expect(parseSearchResponse({ status, message: 'Измените параметры.', results: [] })).toEqual({
      status, message: 'Измените параметры.', results: [],
    })
  })

  it.each([
    null,
    { status: 'unexpected', results: [] },
    { status: 'ok', results: [] },
    { status: 'ok', results: [contractor], message: 123 },
    { status: 'no_match', results: [contractor] },
    { status: 'ok', results: [contractor, contractor] },
    { status: 'ok', results: [1, 2, 3, 4].map((id) => ({ ...contractor, id: String(id) })) },
    { status: 'ok', results: [{ ...contractor, price_from_kzt: -1 }] },
    { status: 'ok', results: [{ ...contractor, price_from_kzt: 9007199254740992 }] },
    { status: 'ok', results: [{ ...contractor, price_from_kzt: '150000' }] },
    { status: 'ok', results: [{ ...contractor, explanation: '   ' }] },
    { status: 'ok', results: [{ ...contractor, synthetic: 'false' }] },
    { status: 'ok', results: [{ ...contractor, id: null }] },
  ])('rejects an invalid response rather than displaying partial results', (data) => {
    expect(() => parseSearchResponse(data)).toThrow('неполный или неожиданный ответ')
  })
})

describe('search HTTP request', () => {
  it('posts the backend payload through the same-origin proxy with a cancellation signal', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok', results: [contractor] })))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await expect(searchContractors(request, controller.signal)).resolves.toMatchObject({ status: 'ok', results: [contractor] })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/search', {
      method: 'POST', body: JSON.stringify(request), signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  })

  it('supports a configured deployment API URL without duplicate separators', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://example.test/backend///')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'no_match', results: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await searchContractors(request)
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/backend/search', expect.any(Object))
  })

  it.each([
    ['/api', '/api/search'],
    ['/api/', '/api/search'],
    ['/', '/search'],
  ])('supports a same-origin API base %s', async (base, endpoint) => {
    vi.stubEnv('VITE_API_BASE_URL', base)
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'no_match', results: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await searchContractors(request)
    expect(fetchMock).toHaveBeenCalledWith(endpoint, expect.any(Object))
  })

  it.each([400, 422])('explains rejected parameters for HTTP %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('invalid', { status })))
    await expect(searchContractors(request)).rejects.toThrow('не принял параметры')
  })

  it('does not leak server internals on a failed HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private backend stack', { status: 500 })))
    await expect(searchContractors(request)).rejects.toThrow('временно недоступен')
  })

  it('reports a non-JSON response without treating it as an empty result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Wrong upstream</html>')))
    await expect(searchContractors(request)).rejects.toThrow('Не удалось прочитать ответ')
  })

  it('preserves cancellation for the search lifecycle to handle silently', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))
    await expect(searchContractors(request)).rejects.toBe(abortError)
  })
})

describe('API URL resolution', () => {
  it('uses the same-origin proxy by default and supports LAN hosts including IPv6', () => {
    expect(resolveApiBaseUrl()).toBe('/api')
    expect(resolveApiBaseUrl('   ')).toBe('/api')
    expect(resolveApiBaseUrl('auto', 'http://10.19.30.100:4173/#search')).toBe('http://10.19.30.100:8000')
    expect(resolveApiBaseUrl('auto', 'http://[::1]:4173')).toBe('http://[::1]:8000')
  })

  it.each([
    'javascript:alert(1)',
    'https://user:password@example.test',
    'https://example.test/?token=x',
    'https://example.test/#fragment',
    '//external.test/api',
    '/\\external.test/api',
    '/api?token=x',
    '/api#fragment',
    '/api?',
    '/api#',
    'api',
  ])('rejects unsupported configuration %s', (value) => {
    expect(() => resolveApiBaseUrl(value)).toThrow()
  })
})
