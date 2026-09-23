import { describe, expect, it } from 'vitest'
import { INITIAL_FORM, MAX_EVENT_DATE, MIN_EVENT_DATE } from '../config/search'
import type { SearchFormValues } from '../types/search'
import { toSearchRequest, validateSearchForm } from './validation'

const valid: SearchFormValues = {
  ...INITIAL_FORM,
  city: 'Алматы',
  event_date: '2026-10-15',
  event_type: 'свадьба',
  category: 'Ведущий',
  budget_kzt: '300000',
}

describe('search form validation', () => {
  it('preserves the backend Russian values and converts only numeric and optional fields', () => {
    expect(toSearchRequest(valid)).toEqual({
      city: 'Алматы', event_date: '2026-10-15', event_type: 'свадьба',
      category: 'Ведущий', budget_kzt: 300000, duration_hours: null, language: null,
    })
    expect(toSearchRequest({ ...valid, duration_hours: '5', language: 'казахский' })).toMatchObject({
      duration_hours: 5, language: 'казахский',
    })
  })

  it.each(['0', '-5', '1.5', '1e6', 'Infinity', 'NaN', '300 000', ' 3 ', '9007199254740992'])('rejects unsafe budget %s before any request', (budget_kzt) => {
    const values = { ...valid, budget_kzt }
    expect(validateSearchForm(values).budget_kzt).toBeTruthy()
    expect(() => toSearchRequest(values)).toThrow()
  })

  it.each(['0', '-1', '2.5', '1e3', '9007199254740992'])('rejects invalid optional duration %s', (duration_hours) => {
    expect(validateSearchForm({ ...valid, duration_hours }).duration_hours).toBeTruthy()
  })

  it.each(['2026-09-22', '2027-01-01', '2026-11-31', '2026-9-25', '2026-13-01', '', 'invalid'])('rejects unavailable or impossible date %s', (event_date) => {
    expect(validateSearchForm({ ...valid, event_date }).event_date).toBeTruthy()
  })

  it.each([MIN_EVENT_DATE, MAX_EVENT_DATE])('accepts catalog boundary %s', (event_date) => {
    expect(validateSearchForm({ ...valid, event_date })).toEqual({})
  })

  it('rejects injected select values instead of submitting an unsupported query', () => {
    expect(Object.keys(validateSearchForm({
      ...valid, city: 'Unknown', event_type: 'wedding', category: 'Unknown', language: 'ru',
    }))).toEqual(['city', 'event_type', 'category', 'language'])
  })

  it('reports all missing required fields while leaving optional fields valid', () => {
    expect(Object.keys(validateSearchForm(INITIAL_FORM))).toEqual(['city', 'event_date', 'event_type', 'category', 'budget_kzt'])
  })
})
