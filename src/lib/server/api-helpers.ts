import sanitizeHtml from 'sanitize-html'

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
};

export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function withHeaders(extra?: Record<string, string>) {
  return { ...corsHeaders, ...securityHeaders, ...(extra ?? {}) };
}

export function errorJson(code: number, message: string, details?: unknown) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message, details } }),
    { status: code, headers: withHeaders({ 'Content-Type': 'application/json' }) }
  );
}

export function okJson(body: unknown, extra?: Record<string, string>) {
  return new Response(
    JSON.stringify({ success: true, data: body }),
    { status: 200, headers: withHeaders({ 'Content-Type': 'application/json', ...(extra ?? {}) }) }
  );
}

export function parsePagination(url: string) {
  const u = new URL(url);
  const limit = Math.min(Math.max(Number(u.searchParams.get('limit') ?? '20'), 1), 100);
  const cursor = u.searchParams.get('cursor') ?? undefined;
  return { limit, cursor };
}

export function verifyWebhookSecret(req: Request) {
  const provided = req.headers.get('x-webhook-secret');
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return { ok: false, reason: 'Server missing WEBHOOK_SECRET' };
  if (!provided || provided !== expected) return { ok: false, reason: 'Invalid webhook secret' };
  return { ok: true };
}

export function sanitizeIncomingHtml(html?: string | null) {
  if (!html) return html ?? null;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'table', 'thead', 'tbody', 'tr', 'td', 'th']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      '*': ['style', 'class']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
  });
}
