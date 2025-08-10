# EphemeralMail 2.0

Ephemeral email (tempmail) built with Next.js 15, Prisma and SQLite. Generate throwaway emails, receive messages, and integrate via public APIs.

## Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Prisma ORM + SQLite
- Zod validation, sanitize-html, token-bucket rate limiting

## Local Development
```bash
# Install dependencies
npm ci

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Set up database and start
npx prisma generate
npx prisma db push
npm run dev
```
Open http://localhost:8989

## Production Deployment
```bash
# Build and start
npm ci && npx prisma generate && npx prisma db push
npm run build
npm run start
```
Set env vars on server (don't commit .env). Put behind Nginx + TLS. Health: `GET /api/v1/health`.

## API v1 (JSON)
All responses: `{ success, data | error }`.

### Generate email
```http
POST /api/v1/generate
{ "fingerprint": "<uuid>", "customEmail": "optionalPrefix" }
```

### List your emails
```http
GET /api/v1/emails?fingerprint=<uuid>&limit=&cursor=
```

### List received (session owned)
```http
GET /api/v1/received?fingerprint=<uuid>&email=<address>&limit=&cursor=
```

### Public endpoints (no session) for integrations
```http
GET /api/v1/public/emails?email=<address>
GET /api/v1/public/received?email=<address>&limit=&cursor=
```

### Webhook ingest (requires header `x-webhook-secret`)
```http
POST /api/v1/received
```

## Security
- CORS via `CORS_ORIGIN`
- Rate limiting per IP/fingerprint
- HTML sanitized server-side

## License
MIT
