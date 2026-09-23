import { useCallback, useEffect, useState } from 'react'
import { INITIAL_FORM } from '../config/search'
import type { SearchFormValues } from '../types/search'
import { loadSearchDraft, removeSearchDraft, saveSearchDraft } from '../utils/storage'

export function useSearchDraft() {
  const [draft] = useState(loadSearchDraft)
  const [values, setValues] = useState<SearchFormValues>(draft.values)
  const [storageAvailable, setStorageAvailable] = useState(draft.storageAvailable)

  useEffect(() => {
    setStorageAvailable(saveSearchDraft(values))
  }, [values])

  const setField = useCallback((name: keyof SearchFormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }))
  }, [])

  const resetDraft = useCallback(() => {
    setStorageAvailable(removeSearchDraft())
    setValues({ ...INITIAL_FORM })
  }, [])

  return { values, setField, resetDraft, storageAvailable }
}
