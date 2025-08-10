export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as { opera?: string }).opera || ''
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
}

export function hasPoorConnectivity(): boolean {
  if (typeof navigator === 'undefined') return false
  
  const connection = (navigator as { 
    connection?: { effectiveType?: string; downlink?: number };
    mozConnection?: { effectiveType?: string; downlink?: number };
    webkitConnection?: { effectiveType?: string; downlink?: number };
  }).connection || (navigator as { 
    connection?: { effectiveType?: string; downlink?: number };
    mozConnection?: { effectiveType?: string; downlink?: number };
    webkitConnection?: { effectiveType?: string; downlink?: number };
  }).mozConnection || (navigator as { 
    connection?: { effectiveType?: string; downlink?: number };
    mozConnection?: { effectiveType?: string; downlink?: number };
    webkitConnection?: { effectiveType?: string; downlink?: number };
  }).webkitConnection
  
  if (connection) {
    return connection.effectiveType === 'slow-2g' || 
           connection.effectiveType === '2g' || 
           connection.effectiveType === '3g' ||
           (connection.downlink !== undefined && connection.downlink < 1)
  }
  
  return false
}

export function getRequestTimeout(): number {
  if (isMobileDevice()) {
    if (hasPoorConnectivity()) {
      return 30000
    }
    return 15000
  }
  return 10000
}

export async function enhancedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const timeout = getRequestTimeout()
  
  const fetchOptions: RequestInit = {
    ...options,
    signal: AbortSignal.timeout(timeout),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  }
  
  return fetch(url, fetchOptions)
}

export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = isMobileDevice() ? 3 : 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < maxRetries && (
        error instanceof Error && (
          error.name === 'AbortError' || 
          error.name === 'TypeError' ||
          error.message.includes('fetch')
        )
      )) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`Retrying request (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw lastError
    }
  }
  
  throw lastError!
}

// Get user-friendly error message for network issues
export function getNetworkErrorMessage(error: Error): string {
  if (error.name === 'AbortError') {
    return 'Request timed out - please check your internet connection'
  }
  
  if (error.message.includes('fetch')) {
    return 'Network error - please check your connection and try again'
  }
  
  if (error.message.includes('429')) {
    return 'Too many requests - please wait a moment and try again'
  }
  
  if (error.message.includes('404')) {
    return 'Resource not found - this is normal for new users'
  }
  
  return error.message || 'An unexpected error occurred'
}
