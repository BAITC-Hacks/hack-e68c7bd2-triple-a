import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import catalogData from '../../public/data/contractors.json'
import type { SearchRequest } from '../types/search'
import { parseCatalog, searchCatalog } from './staticSearch'
import type { CatalogEntry } from './staticSearch'

const request: SearchRequest = {
  city: 'Алматы', event_date: '2026-10-15', event_type: 'свадьба', category: 'Ведущий',
  budget_kzt: 300000, duration_hours: null, language: null,
}

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: 'test-1', anon_name: 'Подрядчик', categories: ['Ведущий'], city: 'Алматы',
    price_from_kzt: 150000, event_formats: ['свадьба'], languages: ['русский'],
    max_hours: 6, busy_dates: [], description: '', synthetic: false, ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('static catalog contract', () => {
  it('loads all supplied records and preserves every existing synthetic marker', () => {
    const catalog = parseCatalog(catalogData)
    expect(catalog).toHaveLength(69)
    expect(catalog.filter((record) => record.synthetic)).toHaveLength(16)
    expect(catalog.find((record) => record.id === 'SYN-003')?.synthetic).toBe(true)
  })

  it.each([
    null,
    [],
    [entry(), entry()],
    [entry({ price_from_kzt: -1 })],
    [entry({ max_hours: -1 })],
    [entry({ categories: [] })],
    [{ ...entry(), languages: null }],
    [{ ...entry(), synthetic: 'false' }],
    [entry({ busy_dates: ['tomorrow'] })],
  ])('rejects corrupted catalog data', (data) => {
    expect(() => parseCatalog(data)).toThrow('Не удалось прочитать каталог')
  })
})

describe('static catalog matching', () => {
  it('matches city and category case-insensitively without mixing in foreign cities', () => {
    const result = searchCatalog([
      entry({ id: 'local', city: ' алМаты ', categories: [' ведущий '] }),
      entry({ id: 'foreign', city: 'Зарубежье' }),
      entry({ id: 'different-category', categories: ['Фотограф'] }),
    ], request)
    expect(result.status).toBe('ok')
    expect(result.results.map(({ id }) => id)).toEqual(['local'])
  })

  it('distinguishes an absent category from a category whose contractors do not fit', () => {
    const missing = searchCatalog([entry({ city: 'Астана' })], request)
    expect(missing).toMatchObject({ status: 'no_category', results: [] })
    expect(missing.message).toContain('другой город или категорию')
    const tooExpensive = searchCatalog([entry({ price_from_kzt: 400000 })], request)
    expect(tooExpensive).toMatchObject({ status: 'no_match', results: [] })
    expect(tooExpensive.message).toContain('1 из 1 — цена выше бюджета')
  })

  it.each([
    { override: { busy_dates: ['2026-10-15'] }, query: {}, reason: 'занят на эту дату' },
    { override: { price_from_kzt: 300001 }, query: {}, reason: 'цена выше бюджета' },
    { override: { event_formats: ['корпоратив'] }, query: {}, reason: 'такой формат мероприятия' },
    { override: { languages: ['казахский'] }, query: { language: 'русский' }, reason: 'нужном языке' },
    { override: { max_hours: 4 }, query: { duration_hours: 5 }, reason: 'нужную длительность' },
  ])('enforces and explains $reason', ({ override, query, reason }) => {
    const result = searchCatalog([entry(override)], { ...request, ...query })
    expect(result.status).toBe('no_match')
    expect(result.results).toEqual([])
    expect(result.message).toContain(reason)
  })

  it('accepts exact budget and duration boundaries, optional language, and an unbounded duration', () => {
    const result = searchCatalog([
      entry({ id: 'exact', price_from_kzt: 300000, max_hours: 5 }),
      entry({ id: 'unbounded', max_hours: null, languages: [] }),
    ], { ...request, duration_hours: 5 })
    expect(result.results.map(({ id }) => id)).toEqual(['exact', 'unbounded'])
  })

  it('reports the frequency of each exclusion across candidates', () => {
    const result = searchCatalog([
      entry({ id: 'a', price_from_kzt: 400000, busy_dates: [request.event_date] }),
      entry({ id: 'b', price_from_kzt: 500000 }),
    ], request)
    expect(result.message).toContain('2 из 2 — цена выше бюджета; 1 из 2 — занят на эту дату')
  })

  it('keeps the backend ranking order and deterministic id tie-break with a three-card limit', () => {
    const result = searchCatalog([
      entry({ id: 'D', price_from_kzt: 290000 }),
      entry({ id: 'C', price_from_kzt: 280000, description: 'Свадьба ведущий' }),
      entry({ id: 'B', price_from_kzt: 280000, description: 'Свадьба ведущий' }),
      entry({ id: 'A', price_from_kzt: 200000 }),
    ], request)
    expect(result.results.map(({ id }) => id)).toEqual(['B', 'C', 'D'])
  })

  it('builds explanations only from matching catalog facts and preserves synthetic status', () => {
    const result = searchCatalog([entry({ synthetic: true })], {
      ...request, language: 'русский', duration_hours: 4,
    })
    expect(result.results[0]).toMatchObject({
      name: 'Подрядчик', city: 'Алматы', category: 'Ведущий', price_from_kzt: 150000, synthetic: true,
    })
    expect(result.results[0]?.explanation).toContain('нет отметки о занятости')
    expect(result.results[0]?.explanation).toContain('Указанный язык: русский')
    expect(result.results[0]?.explanation).toContain('до 6 ч')
  })

  it('searches the shipped data for a supplemental rare category', () => {
    const result = searchCatalog(parseCatalog(catalogData), {
      ...request, city: 'Астана', category: 'Ведущий церемонии',
      language: 'казахский', duration_hours: 3,
    })
    expect(result.status).toBe('ok')
    expect(result.results.some(({ id, synthetic }) => id === 'SYN-003' && synthetic)).toBe(true)
  })
})

describe('static catalog loading', () => {
  beforeEach(() => vi.resetModules())

  it('respects the deployment base path, passes cancellation, and caches validated data', async () => {
    vi.stubEnv('BASE_URL', '/project/')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([entry()])))
    vi.stubGlobal('fetch', fetchMock)
    const { searchStaticCatalog } = await import('./staticSearch')
    const controller = new AbortController()
    await expect(searchStaticCatalog(request, controller.signal)).resolves.toMatchObject({ status: 'ok' })
    await expect(searchStaticCatalog({ ...request, budget_kzt: 100000 })).resolves.toMatchObject({ status: 'no_match' })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/project/data/contractors.json', {
      headers: { Accept: 'application/json' }, signal: controller.signal,
    })
  })

  it('allows a retry after the catalog fails to load', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([entry()])))
    vi.stubGlobal('fetch', fetchMock)
    const { searchStaticCatalog } = await import('./staticSearch')
    await expect(searchStaticCatalog(request)).rejects.toThrow('Не удалось загрузить каталог')
    await expect(searchStaticCatalog(request)).resolves.toMatchObject({ status: 'ok' })
  })

  it('reports network failures without exposing internal errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private transport detail')))
    const { searchStaticCatalog } = await import('./staticSearch')
    await expect(searchStaticCatalog(request)).rejects.toThrow('Проверьте подключение')
  })

  it('rejects invalid JSON rather than showing an empty search result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>not a catalog</html>')))
    const { searchStaticCatalog } = await import('./staticSearch')
    await expect(searchStaticCatalog(request)).rejects.toThrow('Не удалось прочитать каталог')
  })

  it('does not start a request when it is already canceled', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { searchStaticCatalog } = await import('./staticSearch')
    const controller = new AbortController()
    controller.abort()
    await expect(searchStaticCatalog(request, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves cancellation while a catalog request is in flight', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true })
    })))
    const { searchStaticCatalog } = await import('./staticSearch')
    const pending = searchStaticCatalog(request, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('routes the existing service to the catalog only in explicitly configured catalog mode', async () => {
    vi.stubEnv('VITE_SEARCH_MODE', 'catalog')
    vi.stubEnv('BASE_URL', '/shabyt/')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([entry()])))
    vi.stubGlobal('fetch', fetchMock)
    const { searchContractors } = await import('./searchApi')
    const { SEARCH_MODE } = await import('../config/runtime')
    expect(SEARCH_MODE).toBe('catalog')
    await expect(searchContractors(request)).resolves.toMatchObject({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith('/shabyt/data/contractors.json', expect.any(Object))
  })
})
