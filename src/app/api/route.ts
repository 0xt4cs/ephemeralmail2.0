import { withHeaders } from '@/lib/api-helpers'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

export async function GET() {
  // This endpoint is deprecated and redirected in next.config.ts
  return new Response(null, { status: 204, headers: withHeaders({ 'X-API-Deprecation': 'Use /api/v1' }) })
} 