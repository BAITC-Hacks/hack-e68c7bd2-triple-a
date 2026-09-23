export function getSearchMode(): 'api' | 'catalog' {
  return import.meta.env.VITE_SEARCH_MODE === 'catalog' ? 'catalog' : 'api'
}

export const SEARCH_MODE = getSearchMode()
