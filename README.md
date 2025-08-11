# EphemeralMail

EphemeralMail is a temporary email system for developers and users needing disposable email addresses.

## 🧑‍💻 Developer

Developed by [@0xt4cs](https://github.com/0xt4cs)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/0xt4cs/ephemeralmail.git
    cd ephemeralmail
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file based on `.env.example`.
    ```
    # .env
    DATABASE_URL="file:./dev.db"
    WEBHOOK_SECRET="your-secret-here"
    EMAIL_SERVER_PORT=25
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

4.  **Generate Prisma client & push schema:**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Build the application:**
    ```bash
    npm run build
    ```

6.  **Start (development):**
    ```bash
    npm run dev
    npm run start-email-server # In a separate terminal
    ```

## 🌐 API Usage

Base URL: `YOUR_APP_URL/api/v1`

### Response Format
All API responses follow this JSON structure:
```json
{
  "success": boolean,
  "data": { ... },
  "message": "string",
  "meta": {
    "timestamp": "ISO string",
    "credits": "EphemeralMail by @0xt4cs - https://github.com/0xt4cs"
  }
}
```

## 🔓 Public API (No Authentication Required)

**Features:**
- ✅ No rate limits
- ✅ No API keys required
- ✅ CORS enabled for all domains
- ✅ Instant email generation
- ✅ Full CRUD operations

### 1. Generate Email Address

**Endpoint:** `POST /api/v1/public/generate`

**Request Body:**
```json
{
  "customEmail": "myusername"  // Optional: custom username
}
```

**Example Request:**
```bash
curl -X POST https://DOMAIN/v1/public/generate \
  -H "Content-Type: application/json" \
  -d '{"customEmail": "testuser123"}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "address": "testuser123@DOMAIN",
    "createdAt": "2025-08-11T10:30:00.000Z",
    "expiresAt": "2025-08-25T10:30:00.000Z",
    "isActive": true,
    "generatedBy": "public-api"
  },
  "meta": {
    "timestamp": "2025-08-11T10:30:00.000Z",
    "credits": "EphemeralMail by @0xt4cs - https://github.com/0xt4cs"
  }
}
```

**Notes:**
- If `customEmail` is not provided, a random email will be generated
- Custom emails must contain only letters, numbers, dots, underscores, and hyphens
- Emails expire after 14 days

### 2. Check Email Existence

**Endpoint:** `GET /api/v1/public/emails`

**Query Parameters:**
- `email` (required): The email address to check

**Example Request:**
```bash
curl "https://DOMAIN/api/v1/public/emails?email=testuser123@DOMAIN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "exists": true,
    "emailAddress": "testuser123@DOMAIN",
    "isActive": true,
    "isDeleted": false,
    "isRecovered": false,
    "createdAt": "2025-08-11T10:30:00.000Z",
    "expiresAt": "2025-08-25T10:30:00.000Z"
  }
}
```

### 3. Get Received Emails

**Endpoint:** `GET /api/v1/public/received`

**Query Parameters:**
- `email` (required): The email address to check for received messages

**Example Request:**
```bash
curl "https://DOMAIN/api/v1/public/received?email=testuser123@DOMAIN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clx1234567891",
        "fromAddress": "sender@example.com",
        "subject": "Welcome to our service!",
        "bodyHtml": "<p>Hello! Welcome to our platform.</p>",
        "bodyText": "Hello! Welcome to our platform.",
        "headers": { "message-id": "123@example.com" },
        "attachments": [
          {
            "name": "welcome.pdf",
            "size": 1024000,
            "type": "application/pdf"
          }
        ],
        "receivedAt": "2025-08-11T11:00:00.000Z"
      }
    ],
    "meta": {
      "total": 1,
      "email": "testuser123@DOMAIN",
      "timestamp": "2025-08-11T11:00:00.000Z"
    }
  }
}
```

### 4. Delete Email (Soft Delete)

**Endpoint:** `DELETE /api/v1/public/emails/delete`

**Request Body:**
```json
{
  "emailAddress": "testuser123@DOMAIN"
}
```

**Example Request:**
```bash
curl -X DELETE https://DOMAIN/api/v1/public/emails/delete \
  -H "Content-Type: application/json" \
  -d '{"emailAddress": "testuser123@DOMAIN"}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Public email soft deleted successfully. It will be permanently deleted after 14 days.",
    "emailAddress": "testuser123@DOMAIN",
    "deletedAt": "2025-08-11T12:00:00.000Z"
  }
}
```

### 5. Recover Deleted Email

**Endpoint:** `PATCH /api/v1/public/emails/recover`

**Request Body:**
```json
{
  "emailAddress": "testuser123@DOMAIN"
}
```

**Example Request:**
```bash
curl -X PATCH https://DOMAIN/api/v1/public/emails/recover \
  -H "Content-Type: application/json" \
  -d '{"emailAddress": "testuser123@DOMAIN"}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Public email recovered successfully",
    "emailAddress": "testuser123@DOMAIN",
    "recoveredAt": "2025-08-11T12:30:00.000Z"
  }
}
```

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Invalid request body"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": 404,
    "message": "Email not found"
  }
}
```

**409 Conflict:**
```json
{
  "success": false,
  "error": {
    "code": 409,
    "message": "Email address already exists"
  }
}
```

## 🗑️ Deletion Mechanism

- **Soft Delete**: Emails are marked as inactive but not permanently removed
- **Recovery**: Soft-deleted emails can be recovered within 14 days
- **Hard Delete**: Emails are permanently deleted after 14 days
- **Public API**: Only emails created via public API can be managed via public API

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 0xt4cs
