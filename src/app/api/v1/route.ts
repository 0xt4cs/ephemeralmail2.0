import { okJson, withHeaders } from '@/lib/api-helpers'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

export async function GET() {
  return okJson({
    message: 'EphemeralMail 2.0 API',
    version: 'v1',
    baseUrl: 'http://localhost:8989/api/v1',
    endpoints: {
      generate: { url: '/api/v1/generate', method: 'POST' },
      emails: { url: '/api/v1/emails?fingerprint=...', method: 'GET' },
      received: { url: '/api/v1/received?fingerprint=...', method: 'GET' },
      sessions: { url: '/api/v1/sessions?fingerprint=...', method: 'GET' },
      public: {
        getEmail: { url: '/api/v1/public/emails?email=...', method: 'GET' },
        getMessages: { url: '/api/v1/public/received?email=...', method: 'GET' },
      },
    },
  })
}
