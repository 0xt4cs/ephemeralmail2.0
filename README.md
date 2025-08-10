# EphemeralMail

EphemeralMail is a temporary email system for developers and users needing disposable email addresses.

## 🧑‍💻 Developer

Developed by [@0xt4cs](https://github.com/0xt4cs)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Git
- PM2 (for production)
- Nginx (for production)
- Certbot (for SSL)

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
    WEBHOOK_SECRET="b52488c391277c593a4fd3c19b7732f05aba1c5f9931421d127fe348762ab336"
    EMAIL_SERVER_PORT=2525
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

## ⚙️ Deployment (Production)

Use `scripts/auto-deploy.sh` for a one-click setup on Ubuntu.

```bash
chmod +x scripts/auto-deploy.sh
sudo ./scripts/auto-deploy.sh
```

## 🌐 API Usage

Base URL: `YOUR_APP_URL/api/v1` (e.g., `https://ephmail.whitebooking.com/api/v1`)

All API responses are JSON: `{ success: boolean, data: { ... }, message?: string, meta?: { ... } }`

### Private API (Requires `x-fingerprint` header)

#### Generate Email Address
-   **Endpoint**: `/api/v1/generate`
-   **Method**: `POST`
-   **Body**: `{ "customEmail": "mycustomaddress" }` (optional)
-   **Example Response**:
    ```json
    {
      "success": true,
      "data": {
        "address": "mycustomaddress@ephmail.whitebooking.com",
        "expiresAt": "2025-08-24T12:00:00.000Z"
      }
    }
    ```

#### Get Generated Emails
-   **Endpoint**: `/api/v1/emails`
-   **Method**: `GET`
-   **Query**: `includeDeleted=true` (optional)

#### Get Received Messages
-   **Endpoint**: `/api/v1/received`
-   **Method**: `GET`
-   **Query**: `emailAddress=your@email.com`

#### Soft Delete Email
-   **Endpoint**: `/api/v1/emails`
-   **Method**: `DELETE`
-   **Body**: `{ "emailAddress": "your@email.com" }`

#### Recover Soft-Deleted Email
-   **Endpoint**: `/api/v1/emails`
-   **Method**: `PATCH`
-   **Body**: `{ "emailAddress": "your@email.com" }`

#### Download Attachment
-   **Endpoint**: `/api/v1/attachments/download`
-   **Method**: `POST`
-   **Body**: `{ "emailId": "...", "attachmentName": "..." }`

### Public API (No Authentication, No Rate Limit)

All public API responses include `"credits": "EphemeralMail by @0xt4cs - https://github.com/0xt4cs"`

#### Generate Public Email Address
-   **Endpoint**: `/api/v1/public/generate`
-   **Method**: `POST`
-   **Body**: `{ "customEmail": "publicuser" }` (optional)
-   **Example Response**:
    ```json
    {
      "success": true,
      "data": {
        "address": "publicuser@ephmail.whitebooking.com",
        "generatedBy": "public-api"
      }
    }
    ```

#### Check Public Email Existence / Get Details
-   **Endpoint**: `/api/v1/public/emails`
-   **Method**: `GET`
-   **Query**: `emailAddress=public@email.com`

#### Get Received Messages for Public Email
-   **Endpoint**: `/api/v1/public/received`
-   **Method**: `GET`
-   **Query**: `emailAddress=public@email.com`

#### Soft Delete Public Email
-   **Endpoint**: `/api/v1/public/emails/delete`
-   **Method**: `DELETE`
-   **Body**: `{ "emailAddress": "public@email.com" }`

#### Recover Public Email
-   **Endpoint**: `/api/v1/public/emails/recover`
-   **Method**: `PATCH`
-   **Body**: `{ "emailAddress": "public@email.com" }`

## 🗑️ Deletion Mechanism

Emails are soft-deleted (marked inactive) and automatically hard-deleted after 14 days. Users can recover soft-deleted emails via frontend or API.

## 📄 License

MIT License.
