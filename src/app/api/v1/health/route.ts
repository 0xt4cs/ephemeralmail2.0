import { withHeaders, okJson } from '@/lib/api-helpers'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

export async function GET() {
  return okJson({ status: 'ok', time: new Date().toISOString() })
}


