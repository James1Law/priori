import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'priori_participant_name'

export function useParticipantName() {
  const [name, setNameState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedName = localStorage.getItem(STORAGE_KEY)
    setNameState(storedName)
    setIsLoading(false)
  }, [])

  const setName = useCallback((newName: string) => {
    const trimmedName = newName.trim()
    if (trimmedName) {
      localStorage.setItem(STORAGE_KEY, trimmedName)
      setNameState(trimmedName)
    }
  }, [])

  const clearName = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setNameState(null)
  }, [])

  return {
    name,
    setName,
    clearName,
    isLoading,
    needsName: !isLoading && !name,
  }
}
