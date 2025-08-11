import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function randomInt(max: number): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    return arr[0] % max
  }
  return Math.floor(Math.random() * max)
}

export function generateRandomEmail(): string {
  const adjectives = [
    'quick','swift','fast','rapid','speedy','nimble','agile','brisk','hasty','prompt',
    'clever','sharp','bold','bright','lucky','mighty','silent','stealthy','zesty','fuzzy',
    'cosmic','frosty','sunny','stormy','crimson','electric','neon','turbo','quantum','stellar',
    'glacial','fiery','shadow','icy','blazing','wild','mystic','epic','ancient','radiant',
    'daring','fearless','iron','golden','sapphire','emerald','obsidian','amber','cobalt','scarlet',
    'whispering','roaring','thunderous','lunar','solar','galactic','chaotic','vivid','silent','serene'
  ]
  
  const nouns = [
    'fox','cat','dog','bird','fish','lion','tiger','bear','wolf','eagle',
    'otter','panda','falcon','cobra','dragon','phoenix','orca','rhino','yak','zebra',
    'panther','shark','owl','hawk','viper','stallion','cougar','lynx','crane','heron',
    'raven','crow','leopard','buffalo','mustang','dolphin','seal','whale','goose','sparrow',
    'badger','moose','antelope','jackal','camel','bat','moth','beetle','ram','python'
  ]  
  const sep = ['','-','_','.'][randomInt(4)]
  const adjective = adjectives[randomInt(adjectives.length)]
  const noun = nouns[randomInt(nouns.length)]
  const number = (100 + randomInt(900)).toString()
  return `${adjective}${sep}${noun}${number}@epmail.whitebooking.com`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getOrCreateClientFingerprint(): string {
  if (typeof window !== 'undefined') {
    const key = 'ephemeralmail_fingerprint'
    
    let existing: string | null = null
    try {
      existing = localStorage.getItem(key)
    } catch {
      // localStorage not available
    }
    
    if (existing) {
      try {
        const fingerprint = JSON.parse(existing)
        if (Date.now() - fingerprint.timestamp < 7 * 24 * 60 * 60 * 1000) {
          return fingerprint.id
        }
      } catch {
      }
    }
    
    const fingerprint = {
      id: 'fp_' + Date.now().toString(36) + Math.random().toString(36).slice(2),
      timestamp: Date.now()
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(fingerprint))
    } catch {
      // Could not store fingerprint in localStorage
    }
    
    return fingerprint.id
  }
  return 'server_' + Date.now().toString(36)
} 