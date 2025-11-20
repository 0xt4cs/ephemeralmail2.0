'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { useRealtime, SSEMessage, ProgressData } from '@/hooks/use-realtime'

interface RealtimeContextType {
  isConnected: boolean
  connectionType: 'websocket' | 'polling' | 'disconnected'
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
  
  // Use ref instead of state to avoid stale closure issues (race condition fix)
  const refreshCallbacksRef = useRef<(() => void)[]>([])

  const refreshAll = useCallback(() => {
    refreshCallbacksRef.current.forEach(callback => callback())
  }, []) // No dependencies - always uses current ref value

  const { isConnected, connectionType, lastMessage, sendHeartbeat } = useRealtime({
    fingerprint,
    onMessage: (message) => {
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
      // Connection established
    },
    onDisconnect: () => {
      // Connection lost
    },
    onError: () => {
      // Connection error
    }
  })

  // Debug log connection state changes
  useEffect(() => {
    // Silent
  }, [isConnected, connectionType])

  const registerRefreshCallback = (callback: () => void) => {
    refreshCallbacksRef.current = [...refreshCallbacksRef.current, callback]
    
    return () => {
      refreshCallbacksRef.current = refreshCallbacksRef.current.filter(cb => cb !== callback)
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
