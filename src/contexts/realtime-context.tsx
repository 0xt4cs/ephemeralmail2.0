'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRealtime, SSEMessage, ProgressData } from '@/hooks/use-realtime'

interface RealtimeContextType {
  isConnected: boolean
  connectionType: 'sse' | 'polling' | 'disconnected'
  lastMessage: SSEMessage | null
  currentProgress: ProgressData | null
  sendHeartbeat: (operation: string, progress?: number) => void
  refreshAll: () => void
  registerRefreshCallback: (callback: () => void) => () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

interface RealtimeProviderProps {
  children: ReactNode
  fingerprint: string
}

export function RealtimeProvider({ children, fingerprint }: RealtimeProviderProps) {
  const [currentProgress, setCurrentProgress] = useState<ProgressData | null>(null)
  const [refreshCallbacks, setRefreshCallbacks] = useState<(() => void)[]>([])

  const { isConnected, connectionType, lastMessage, sendHeartbeat } = useRealtime({
    fingerprint,
    onMessage: (message) => {
      console.log('Realtime message received:', message.type)
      
      // Handle different message types
      switch (message.type) {
        case 'email_received':
          // Trigger refresh for all components
          refreshAll()
          break
        case 'progress':
          if (message.data && 'progress' in message.data) {
            setCurrentProgress(message.data as ProgressData)
          }
          break
        case 'operation_complete':
          setCurrentProgress(null)
          refreshAll()
          break
      }
    },
    onProgress: (progress) => {
      setCurrentProgress(progress)
    },
    onConnect: () => {
      console.log('Realtime connection established')
    },
    onDisconnect: () => {
      console.log('Realtime connection lost')
    },
    onError: (error) => {
      console.error('Realtime connection error:', error)
    }
  })

  const refreshAll = useCallback(() => {
    console.log('Refreshing all components...')
    refreshCallbacks.forEach(callback => callback())
  }, [refreshCallbacks])

  const registerRefreshCallback = (callback: () => void) => {
    setRefreshCallbacks(prev => [...prev, callback])
    return () => {
      setRefreshCallbacks(prev => prev.filter(cb => cb !== callback))
    }
  }

  const value: RealtimeContextType = {
    isConnected,
    connectionType,
    lastMessage,
    currentProgress,
    sendHeartbeat,
    refreshAll,
    registerRefreshCallback
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider')
  }
  return context
}

// Hook for components that need to register refresh callbacks
export function useRealtimeRefresh(refreshCallback: () => void) {
  const { registerRefreshCallback } = useRealtimeContext()
  
  useEffect(() => {
    const unregister = registerRefreshCallback(refreshCallback)
    return unregister
  }, [refreshCallback, registerRefreshCallback])
}
