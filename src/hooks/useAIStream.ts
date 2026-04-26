'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'

interface UseAIStreamOptions {
  endpoint: string
  storeKey: string
}

interface UseAIStreamReturn {
  result: string | null
  isLoading: boolean
  error: string | null
  run: (body: Record<string, unknown>) => Promise<string | null>
  reset: () => void
}

export function useAIStream({ endpoint, storeKey }: UseAIStreamOptions): UseAIStreamReturn {
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { aiLoading, setAILoading } = useAppStore()

  const isLoading = aiLoading[storeKey] ?? false

  const run = useCallback(
    async (body: Record<string, unknown>): Promise<string | null> => {
      setAILoading(storeKey, true)
      setError(null)

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `Request failed: ${res.status}`)
        }

        const data = await res.json()
        const text = data.result ?? data.text ?? data.proposal ?? JSON.stringify(data)
        setResult(text)
        return text
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI request failed'
        setError(message)
        return null
      } finally {
        setAILoading(storeKey, false)
      }
    },
    [endpoint, storeKey, setAILoading]
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, isLoading, error, run, reset }
}
