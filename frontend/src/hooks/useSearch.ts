import { useCallback, useEffect, useRef, useState } from 'react'
import { REQUEST_TIMEOUT_MS } from '../config/search'
import { searchContractors } from '../services/searchApi'
import type { SearchRequest, SearchState } from '../types/search'

const IDLE_STATE: SearchState = { status: 'idle', request: null, response: null, error: null }

interface ActiveSearch {
  key: string
  controller: AbortController
  timer: ReturnType<typeof setTimeout> | null
}

export function useSearch() {
  const [state, setState] = useState<SearchState>(IDLE_STATE)
  const active = useRef<ActiveSearch | null>(null)

  const stopActive = useCallback(() => {
    const current = active.current
    active.current = null
    if (current) {
      if (current.timer !== null) clearTimeout(current.timer)
      current.controller.abort()
    }
  }, [])

  useEffect(() => stopActive, [stopActive])

  const cancel = useCallback(() => {
    if (!active.current) return
    stopActive()
    setState(IDLE_STATE)
  }, [stopActive])

  const reset = useCallback(() => {
    stopActive()
    setState(IDLE_STATE)
  }, [stopActive])

  const search = useCallback(async (input: SearchRequest) => {
    const request = { ...input }
    const key = JSON.stringify([
      request.city, request.event_date, request.event_type, request.category,
      request.budget_kzt, request.duration_hours, request.language,
    ])
    if (active.current?.key === key) return
    stopActive()
    const current: ActiveSearch = { key, controller: new AbortController(), timer: null }
    active.current = current
    setState({ status: 'loading', request, response: null, error: null })
    current.timer = setTimeout(() => {
      if (active.current !== current) return
      stopActive()
      setState({
        status: 'error', request, response: null,
        error: 'Поиск занял больше времени, чем ожидалось. Попробуйте ещё раз.',
      })
    }, REQUEST_TIMEOUT_MS)

    try {
      const response = await searchContractors(request, current.controller.signal)
      if (active.current !== current) return
      setState({ status: 'success', request, response, error: null })
    } catch (error: unknown) {
      if (active.current !== current) return
      const message = error instanceof TypeError
        ? 'Не удалось связаться с сервисом поиска. Проверьте подключение и попробуйте ещё раз.'
        : error instanceof Error
          ? error.message
          : 'Не удалось выполнить поиск. Попробуйте ещё раз.'
      setState({ status: 'error', request, response: null, error: message })
    } finally {
      if (current.timer !== null) clearTimeout(current.timer)
      if (active.current === current) active.current = null
    }
  }, [stopActive])

  return { state, search, cancel, reset }
}
