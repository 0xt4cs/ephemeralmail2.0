"use client"

import { FpjsProvider } from '@fingerprintjs/fingerprintjs-pro-react'

interface FingerprintProviderProps {
  children: React.ReactNode
}

export function FingerprintProvider({ children }: FingerprintProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_FPJS_API_KEY || 'your_fingerprint_api_key_here'
  const region = (process.env.NEXT_PUBLIC_FPJS_REGION as 'us' | 'eu' | 'ap') || 'us'

  return (
    <FpjsProvider
      loadOptions={{
        apiKey,
        region
      }}
    >
      {children}
    </FpjsProvider>
  )
} 