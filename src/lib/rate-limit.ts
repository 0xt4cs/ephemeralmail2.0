type Bucket = {
  tokens: number
  lastRefill: number
}

const MAX = Number(process.env.RATE_LIMIT_MAX ?? 60)
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)

const buckets = new Map<string, Bucket>()

function keyFor(ip: string, route: string, fingerprint?: string | null) {
  return [ip || 'unknown', route, fingerprint || 'anon'].join(':')
}

function now() {
  return Date.now()
}

export function getClientIp(req: Request) {
  const xfwd = req.headers.get('x-forwarded-for')
  if (xfwd) return xfwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return ''
}

export function checkRateLimit(opts: { req: Request; route: string; fingerprint?: string | null }) {
  const ip = getClientIp(opts.req)
  const k = keyFor(ip, opts.route, opts.fingerprint)
  const nowMs = now()
  let b = buckets.get(k)
  if (!b) {
    b = { tokens: MAX, lastRefill: nowMs }
    buckets.set(k, b)
  }
  const elapsed = nowMs - b.lastRefill
  if (elapsed >= WINDOW_MS) {
    b.tokens = MAX
    b.lastRefill = nowMs
  }
  if (b.tokens <= 0) {
    return { allowed: false, remaining: 0, resetMs: b.lastRefill + WINDOW_MS - nowMs, limit: MAX }
  }
  b.tokens -= 1
  return { allowed: true, remaining: b.tokens, resetMs: b.lastRefill + WINDOW_MS - nowMs, limit: MAX }
}
