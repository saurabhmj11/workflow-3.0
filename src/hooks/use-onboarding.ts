'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const ONBOARDING_KEY = 'openworkflow_onboarding_completed'

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true

    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (completed) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setIsLoading(false))
      return
    }

    // Check if there are any workflows (if so, skip onboarding)
    fetch('/api/workflows')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data && json.data.length === 0) {
          setShowOnboarding(true)
        } else {
          localStorage.setItem(ONBOARDING_KEY, 'true')
        }
      })
      .catch(() => setShowOnboarding(true))
      .finally(() => setIsLoading(false))
  }, [])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShowOnboarding(false)
  }, [])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY)
    setShowOnboarding(true)
  }, [])

  return { showOnboarding, isLoading, completeOnboarding, resetOnboarding }
}
