export interface SearchFormValues {
  city: string
  event_date: string
  event_type: string
  category: string
  budget_kzt: string
  duration_hours: string
  language: string
}

export interface SearchRequest {
  city: string
  event_date: string
  event_type: string
  category: string
  budget_kzt: number
  duration_hours: number | null
  language: string | null
}

export interface Contractor {
  id: string
  name: string
  category: string
  city: string
  explanation: string
  price_from_kzt: number
  synthetic: boolean
  description?: string
  languages?: string[]
  max_hours?: number | null
  explanation_source?: 'rules' | 'openai' | 'fallback'
  price_imputed?: boolean
  city_imputed?: boolean
}

export type SearchResponse =
  | { status: 'ok'; message: string | null; results: Contractor[] }
  | { status: 'no_category'; message: string | null; results: [] }
  | { status: 'no_match'; message: string | null; results: [] }

export type FormErrors = Partial<Record<keyof SearchFormValues, string>>

export type SearchState =
  | { status: 'idle'; request: null; response: null; error: null }
  | { status: 'loading'; request: SearchRequest; response: null; error: null }
  | { status: 'success'; request: SearchRequest; response: SearchResponse; error: null }
  | { status: 'error'; request: SearchRequest; response: null; error: string }
