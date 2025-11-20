"use client"

import { useRealtimeContext } from '@/contexts/realtime-context'
import { WifiOff, RefreshCw, Radio } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ConnectionStatus() {
  const { isConnected, connectionType } = useRealtimeContext()

  const getStatusConfig = () => {
    if (!isConnected) {
      return {
        icon: WifiOff,
        label: 'Offline',
        variant: 'destructive' as const,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        description: 'Not connected - using cached data',
      }
    }

    if (connectionType === 'websocket') {
      return {
        icon: Radio,
        label: 'Live',
        variant: 'default' as const,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        description: 'Real-time updates via WebSocket',
      }
    }

    if (connectionType === 'polling') {
      return {
        icon: RefreshCw,
        label: 'Polling',
        variant: 'secondary' as const,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        description: 'Updates every 3 seconds via HTTP',
      }
    }

    return {
      icon: WifiOff,
      label: 'Unknown',
      variant: 'outline' as const,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      description: 'Connection status unknown',
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent transition-colors">
          <div className={`flex items-center gap-1.5 ${config.color}`}>
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">
              {config.label}
            </span>
          </div>
          {/* Pulse animation for live connection */}
          {isConnected && connectionType === 'websocket' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div>
              <p className="font-medium text-sm">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-border">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Transport:</span>
                <span className="font-medium capitalize">{connectionType}</span>
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
