'use client'

import { useEffect, useState } from 'react'

interface CustomerSession {
  id: string
  phone: string
}

export function useCustomerSession() {
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for session
    const stored = localStorage.getItem('customer_session')
    if (stored) {
      try {
        setSession(JSON.parse(stored))
      } catch {
        localStorage.removeItem('customer_session')
      }
    }
    setLoading(false)
  }, [])

  const setCustomerSession = (data: CustomerSession) => {
    localStorage.setItem('customer_session', JSON.stringify(data))
    setSession(data)
  }

  const clearSession = () => {
    localStorage.removeItem('customer_session')
    setSession(null)
  }

  return { session, loading, setCustomerSession, clearSession }
}
