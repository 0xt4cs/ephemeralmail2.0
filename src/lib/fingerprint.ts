/**
 * Custom Fingerprinting System for Session Management and Authentication
 * 
 * This system creates unique device fingerprints by collecting various browser
 * and device characteristics without relying on third-party dependencies.
 */

export interface DeviceFingerprint {
  id: string
  hash: string
  attributes: FingerprintAttributes
  timestamp: number
  version: string
}

export interface FingerprintAttributes {
  // Browser Information
  userAgent: string
  language: string
  languages: string[]
  cookieEnabled: boolean
  doNotTrack: string | null
  
  // Screen and Display
  screenWidth: number
  screenHeight: number
  screenColorDepth: number
  screenPixelDepth: number
  screenAvailWidth: number
  screenAvailHeight: number
  
  // Window Information
  windowWidth: number
  windowHeight: number
  windowInnerWidth: number
  windowInnerHeight: number
  windowOuterWidth: number
  windowOuterHeight: number
  
  // Time and Location
  timezone: string
  timezoneOffset: number
  
  // Hardware and Performance
  hardwareConcurrency: number
  deviceMemory: number | undefined
  maxTouchPoints: number
  
  // Canvas Fingerprinting
  canvasHash: string
  
  // WebGL Information
  webglVendor: string
  webglRenderer: string
  webglVersion: string
  
  // Font Detection
  fonts: string[]
  
  // Plugin Information
  plugins: string[]
  
  // Connection Information
  connectionType: string | undefined
  connectionEffectiveType: string | undefined
  
  // Additional Browser Features
  webdriver: boolean
  onLine: boolean
  javaEnabled: boolean | undefined
}

/**
 * Generate a comprehensive device fingerprint
 */
export async function generateFingerprint(): Promise<DeviceFingerprint> {
  const attributes = await collectFingerprintAttributes()
  const hash = await generateFingerprintHash(attributes)
  const id = generateFingerprintId(hash)
  
  return {
    id,
    hash,
    attributes,
    timestamp: Date.now(),
    version: '1.0.0'
  }
}

/**
 * Collect all fingerprint attributes
 */
async function collectFingerprintAttributes(): Promise<FingerprintAttributes> {
  return {
    // Browser Information
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: [...(navigator.languages || [])],
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    
    // Screen and Display
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenColorDepth: screen.colorDepth,
    screenPixelDepth: screen.pixelDepth,
    screenAvailWidth: screen.availWidth,
    screenAvailHeight: screen.availHeight,
    
    // Window Information
    windowWidth: window.screen?.width || 0,
    windowHeight: window.screen?.height || 0,
    windowInnerWidth: window.innerWidth,
    windowInnerHeight: window.innerHeight,
    windowOuterWidth: window.outerWidth,
    windowOuterHeight: window.outerHeight,
    
    // Time and Location
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Hardware and Performance
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    
    // Canvas Fingerprinting
    canvasHash: await generateCanvasFingerprint(),
    
    // WebGL Information
    ...await getWebGLInfo(),
    
    // Font Detection
    fonts: await detectFonts(),
    
    // Plugin Information
    plugins: getPluginInfo(),
    
    // Connection Information
    connectionType: (navigator as Navigator & { connection?: { type?: string; effectiveType?: string } }).connection?.type,
    connectionEffectiveType: (navigator as Navigator & { connection?: { type?: string; effectiveType?: string } }).connection?.effectiveType,
    
    // Additional Browser Features
    webdriver: (navigator as Navigator & { webdriver?: boolean }).webdriver || false,
    onLine: navigator.onLine,
    javaEnabled: (navigator as Navigator & { javaEnabled?: () => boolean }).javaEnabled?.() || false
  }
}

/**
 * Generate canvas fingerprint for unique rendering characteristics
 */
async function generateCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'canvas-not-supported'
    
    // Set canvas size
    canvas.width = 200
    canvas.height = 200
    
    // Draw complex pattern
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('EphemeralMail Fingerprint 🔐', 2, 2)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('EphemeralMail Fingerprint 🔐', 4, 4)
    
    // Add gradient
    const gradient = ctx.createLinearGradient(0, 0, 200, 200)
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)')
    gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.5)')
    gradient.addColorStop(1, 'rgba(0, 0, 255, 0.5)')
    ctx.fillStyle = gradient
    ctx.fillRect(10, 10, 180, 180)
    
    // Add shapes
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(20, 20)
    ctx.lineTo(180, 20)
    ctx.lineTo(180, 180)
    ctx.lineTo(20, 180)
    ctx.closePath()
    ctx.stroke()
    
    // Convert to data URL and hash
    const dataURL = canvas.toDataURL()
    return await hashString(dataURL)
  } catch {
    return 'canvas-error'
  }
}

/**
 * Get WebGL information for additional fingerprinting
 */
async function getWebGLInfo(): Promise<{
  webglVendor: string
  webglRenderer: string
  webglVersion: string
}> {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
    
    if (!gl) {
      return {
        webglVendor: 'webgl-not-supported',
        webglRenderer: 'webgl-not-supported',
        webglVersion: 'webgl-not-supported'
      }
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    
    return {
      webglVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
      webglRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
      webglVersion: gl.getParameter(gl.VERSION) || 'unknown'
    }
  } catch {
    return {
      webglVendor: 'webgl-error',
      webglRenderer: 'webgl-error',
      webglVersion: 'webgl-error'
    }
  }
}

/**
 * Detect available fonts
 */
async function detectFonts(): Promise<string[]> {
  const baseFonts = [
    'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New',
    'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Console',
    'Tahoma', 'Geneva', 'Lucida Sans Unicode', 'Franklin Gothic Medium',
    'Arial Narrow', 'Brush Script MT', 'Lucida Sans Typewriter'
  ]
  
  const detectedFonts: string[] = []
  
  // Simple font detection using canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  
  const testString = 'mmmmmmmmmmlli'
  const baseWidth = ctx.measureText(testString).width
  
  for (const font of baseFonts) {
    ctx.font = `12px ${font}`
    const width = ctx.measureText(testString).width
    if (width !== baseWidth) {
      detectedFonts.push(font)
    }
  }
  
  return detectedFonts
}

/**
 * Get plugin information
 */
function getPluginInfo(): string[] {
  const plugins: string[] = []
  
  if (navigator.plugins) {
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i]
      plugins.push(plugin.name)
    }
  }
  
  return plugins
}

/**
 * Generate a hash from fingerprint attributes
 */
async function generateFingerprintHash(attributes: FingerprintAttributes): Promise<string> {
  const fingerprintString = JSON.stringify(attributes, Object.keys(attributes).sort())
  return await hashString(fingerprintString)
}

/**
 * Generate a unique fingerprint ID
 */
function generateFingerprintId(hash: string): string {
  // Use first 16 characters of hash as ID
  return hash.substring(0, 16)
}

/**
 * Hash a string using SHA-256
 */
async function hashString(str: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback to simple hash if crypto API is not available
    return simpleHash(str)
  }
}

/**
 * Simple hash function as fallback
 */
function simpleHash(str: string): string {
  let hash = 0
  if (str.length === 0) return hash.toString()
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16)
}

/**
 * Get or create a client fingerprint (for session management)
 */
export function getOrCreateClientFingerprint(): string {
  // Check if fingerprint exists in localStorage
  const stored = localStorage.getItem('ephemeralmail_fingerprint')
  if (stored) {
    try {
      const fingerprint: DeviceFingerprint = JSON.parse(stored)
      // Check if fingerprint is not too old (7 days)
      if (Date.now() - fingerprint.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return fingerprint.id
      }
    } catch {
      // Invalid stored fingerprint, generate new one
    }
  }
  
  // Generate new fingerprint
  generateFingerprint().then(fingerprint => {
    localStorage.setItem('ephemeralmail_fingerprint', JSON.stringify(fingerprint))
  })
  
  // Return a temporary ID until fingerprint is generated
  return 'temp_' + Date.now().toString(36)
}

/**
 * Validate fingerprint for security
 */
export function validateFingerprint(fingerprint: DeviceFingerprint): boolean {
  // Check if fingerprint is not too old
  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
  if (Date.now() - fingerprint.timestamp > maxAge) {
    return false
  }
  
  // Check if fingerprint has required attributes
  const requiredAttributes = ['userAgent', 'screenWidth', 'screenHeight', 'timezone']
  for (const attr of requiredAttributes) {
    if (!fingerprint.attributes[attr as keyof FingerprintAttributes]) {
      return false
    }
  }
  
  return true
}

/**
 * Compare two fingerprints for similarity
 */
export function compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
  const attrs1 = fp1.attributes
  const attrs2 = fp2.attributes
  
  let matches = 0
  let total = 0
  
  // Compare critical attributes
  const criticalAttrs: (keyof FingerprintAttributes)[] = [
    'userAgent', 'screenWidth', 'screenHeight', 'timezone',
    'hardwareConcurrency', 'webglVendor', 'webglRenderer'
  ]
  
  for (const attr of criticalAttrs) {
    total++
    if (attrs1[attr] === attrs2[attr]) {
      matches++
    }
  }
  
  return matches / total
}
