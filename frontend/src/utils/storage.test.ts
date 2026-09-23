import { describe, expect, it } from 'vitest'
import { INITIAL_FORM } from '../config/search'
import type { SearchFormValues } from '../types/search'
import { loadSearchDraft, removeSearchDraft, saveSearchDraft, SEARCH_DRAFT_KEY, type DraftStorage } from './storage'

function memoryStorage(raw: string | null = null): DraftStorage {
  const items = new Map<string, string>()
  if (raw !== null) items.set(SEARCH_DRAFT_KEY, raw)
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value) },
    removeItem: (key) => { items.delete(key) },
  }
}

const valid: SearchFormValues = {
  ...INITIAL_FORM, city: 'Астана', event_type: 'корпоратив', event_date: '2026-12-15',
  category: 'Фотограф', budget_kzt: '250000', duration_hours: '4', language: 'русский',
}

describe('saved search drafts', () => {
  it('restores a valid persisted search and removes it when cleared', () => {
    const storage = memoryStorage()
    expect(saveSearchDraft(valid, storage)).toBe(true)
    expect(loadSearchDraft(storage)).toEqual({ values: valid, storageAvailable: true })
    expect(removeSearchDraft(storage)).toBe(true)
    expect(loadSearchDraft(storage).values).toEqual(INITIAL_FORM)
  })

  it('retains valid draft fields and resets invalid selections and values independently', () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, values: {
      ...valid, city: 'Invalid', event_type: 'wedding', event_date: '2026-11-31',
      budget_kzt: '9007199254740992', duration_hours: -4, language: 'french', unknown: true,
    } }))
    expect(loadSearchDraft(storage).values).toEqual({ ...INITIAL_FORM, category: 'Фотограф' })
  })

  it.each(['{broken', 'null', '[]', 'true', '{"version":2,"values":{}}'])('recovers from untrusted storage %s', (raw) => {
    expect(loadSearchDraft(memoryStorage(raw))).toEqual({ values: INITIAL_FORM, storageAvailable: true })
  })

  it('ignores excessively long stored strings without breaking other fields', () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, values: { ...valid, budget_kzt: '1'.repeat(1000) } }))
    expect(loadSearchDraft(storage).values).toEqual({ ...valid, budget_kzt: '' })
  })

  it('degrades gracefully when a browser blocks reading or writing storage', () => {
    const blocked = () => { throw new DOMException('Blocked', 'SecurityError') }
    const storage: DraftStorage = { getItem: blocked, setItem: blocked, removeItem: blocked }
    expect(loadSearchDraft(storage)).toEqual({ values: INITIAL_FORM, storageAvailable: false })
    expect(saveSearchDraft(valid, storage)).toBe(false)
    expect(removeSearchDraft(storage)).toBe(false)
  })

  it('migrates the previous brand draft and clears both versions on reset', () => {
    const storage = memoryStorage()
    storage.setItem('krug.search-draft.v1', JSON.stringify({ version: 1, values: valid }))
    expect(loadSearchDraft(storage).values).toEqual(valid)
    expect(saveSearchDraft(valid, storage)).toBe(true)
    expect(storage.getItem('krug.search-draft.v1')).toBeNull()
    storage.setItem('krug.search-draft.v1', JSON.stringify({ version: 1, values: valid }))
    expect(removeSearchDraft(storage)).toBe(true)
    expect(loadSearchDraft(storage).values).toEqual(INITIAL_FORM)
  })

  it('does not mutate the shared initial form when an empty draft is modified', () => {
    const { values } = loadSearchDraft(memoryStorage())
    values.city = 'Астана'
    expect(INITIAL_FORM.city).toBe('')
  })
})
