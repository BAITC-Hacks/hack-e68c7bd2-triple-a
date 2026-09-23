import { INITIAL_FORM } from '../config/search'
import type { SearchFormValues } from '../types/search'
import { validateSearchForm } from './validation'

export const SEARCH_DRAFT_KEY = 'shabyt.search-draft.v1'
const LEGACY_DRAFT_KEY = 'krug.search-draft.v1'
export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getStorage(storage?: DraftStorage): DraftStorage | null {
  try {
    return storage ?? (typeof window === 'undefined' ? null : window.localStorage)
  } catch {
    return null
  }
}

function sanitizeDraft(value: unknown): SearchFormValues {
  const values = { ...INITIAL_FORM }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return values
  const saved = value as Record<string, unknown>
  for (const name of Object.keys(INITIAL_FORM) as (keyof SearchFormValues)[]) {
    const field = saved[name]
    if (typeof field === 'string' && field.length <= 100) values[name] = field
  }
  const errors = validateSearchForm(values)
  for (const name of Object.keys(errors) as (keyof SearchFormValues)[]) values[name] = INITIAL_FORM[name]
  return values
}

export function loadSearchDraft(storage?: DraftStorage): { values: SearchFormValues; storageAvailable: boolean } {
  const target = getStorage(storage)
  if (!target) return { values: { ...INITIAL_FORM }, storageAvailable: false }
  let raw: string | null
  try {
    raw = target.getItem(SEARCH_DRAFT_KEY) ?? target.getItem(LEGACY_DRAFT_KEY)
  } catch {
    return { values: { ...INITIAL_FORM }, storageAvailable: false }
  }
  if (!raw) return { values: { ...INITIAL_FORM }, storageAvailable: true }
  try {
    const draft: unknown = JSON.parse(raw)
    if (draft === null || typeof draft !== 'object' || Array.isArray(draft)) {
      return { values: { ...INITIAL_FORM }, storageAvailable: true }
    }
    const record = draft as Record<string, unknown>
    return { values: record.version === 1 ? sanitizeDraft(record.values) : { ...INITIAL_FORM }, storageAvailable: true }
  } catch {
    return { values: { ...INITIAL_FORM }, storageAvailable: true }
  }
}

export function saveSearchDraft(values: SearchFormValues, storage?: DraftStorage): boolean {
  const target = getStorage(storage)
  if (!target) return false
  try {
    target.setItem(SEARCH_DRAFT_KEY, JSON.stringify({ version: 1, values }))
    target.removeItem(LEGACY_DRAFT_KEY)
    return true
  } catch {
    return false
  }
}

export function removeSearchDraft(storage?: DraftStorage): boolean {
  const target = getStorage(storage)
  if (!target) return false
  try {
    target.removeItem(SEARCH_DRAFT_KEY)
    target.removeItem(LEGACY_DRAFT_KEY)
    return true
  } catch {
    return false
  }
}
