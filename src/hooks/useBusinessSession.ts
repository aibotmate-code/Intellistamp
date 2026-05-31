'use client'

import { useEffect, useState } from 'react'

interface BusinessSession {
  ownerPhone: string
  bizId: string
}

export function useBusinessSession() {
  const [session, setSession] = useState<BusinessSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('business_session')
    if (stored) {
      try {
        setSession(JSON.parse(stored))
      } catch {
        localStorage.removeItem('business_session')
      }
    }
    setLoading(false)
  }, [])

  const setBusinessSession = (data: BusinessSession) => {
    localStorage.setItem('business_session', JSON.stringify(data))
    setSession(data)
  }

  const clearSession = () => {
    localStorage.removeItem('business_session')
    setSession(null)
  }

  return { session, loading, setBusinessSession, clearSession }
}
