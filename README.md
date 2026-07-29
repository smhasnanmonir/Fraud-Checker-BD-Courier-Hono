# Fraud Checker BD Courier — Hono

![Hono](https://img.shields.io/badge/Hono-FF5A16?style=for-the-badge&logo=hono&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

> **Ported from** [AbiruzzamanMolla/Fraud-Checker-BD-Courier-Laravel](https://github.com/AbiruzzamanMolla/Fraud-Checker-BD-Courier-Laravel)
>
> Huge thanks to **Md Abiruzzaman Molla** ([@AbiruzzamanMolla](https://github.com/AbiruzzamanMolla)) for building the original Laravel package and discovering the courier API endpoints. This project would not exist without his work.
>
> This TypeScript/Hono port was built entirely with AI **Mimo v2.5** model + **Pi Coding Agent**.

---

A fraud detection API for Bangladeshi e-commerce platforms. Analyzes customer delivery behavior across 5 major couriers: **Steadfast**, **Pathao**, **RedX**, **Paperfly**, and **Carrybee**.

Check a phone number → get success/cancel ratios → decide whether to approve COD orders.

---

## 🚀 Deployment

This project can be deployed to several serverless platforms with minimal configuration.

### Cloudflare Workers (Recommended)

Cloudflare Workers is the native runtime for Hono and offers the best performance.

**1. Install Wrangler**

```bash
npm install -g wrangler
```

**2. Login**

```bash
wrangler login
```

**3. Deploy**

```bash
wrangler deploy
```

Your app will be available at:

```
https://<worker-name>.<subdomain>.workers.dev
```

#### Environment Variables (Cloudflare)

**Local** — create a `.dev.vars` file:

```env
STEADFAST_USER=your_email
STEADFAST_PASSWORD=your_password
PATHAO_USER=your_email
PATHAO_PASSWORD=your_password
REDX_PHONE=01XXXXXXXXX
REDX_PASSWORD=your_password
PAPERFLY_USER=your_username
PAPERFLY_PASSWORD=your_password
CARRYBEE_PHONE=01XXXXXXXXX
CARRYBEE_PASSWORD=your_password
```

**Production** — use `wrangler secret put`:

```bash
wrangler secret put STEADFAST_USER
wrangler secret put STEADFAST_PASSWORD
wrangler secret put PATHAO_USER
# ... repeat for all secrets
```

**Access in code:**

```ts
type Bindings = {
  STEADFAST_USER: string
  STEADFAST_PASSWORD: string
  // ... other bindings
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  const user = c.env.STEADFAST_USER
  return c.text(user)
})
```

---

### Vercel

**1. Install the Vercel CLI**

```bash
npm install -g vercel
```

**2. Login**

```bash
vercel login
```

**3. Deploy**

```bash
vercel
```

For production:

```bash
vercel --prod
```

#### Vercel Setup

Install the Vercel adapter:

```bash
npm install @hono/node-server @hono/vercel
```

Create `api/index.ts`:

```ts
import { handle } from '@hono/vercel'
import app from '../src/app'

export default handle(app)
```

Create `vercel.json`:

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.ts"
    }
  ]
}
```

#### Environment Variables (Vercel)

**Locally:**

```bash
vercel env pull .env.local
```

**On Vercel Dashboard:**

Go to your project → Settings → Environment Variables and add:

```env
STEADFAST_USER=your_email
STEADFAST_PASSWORD=your_password
PATHAO_USER=your_email
PATHAO_PASSWORD=your_password
REDX_PHONE=01XXXXXXXXX
REDX_PASSWORD=your_password
PAPERFLY_USER=your_username
PAPERFLY_PASSWORD=your_password
CARRYBEE_PHONE=01XXXXXXXXX
CARRYBEE_PASSWORD=your_password
```

---

### Netlify

**1. Install the Netlify CLI**

```bash
npm install -g netlify-cli
```

**2. Login**

```bash
netlify login
```

**3. Deploy**

```bash
netlify deploy
```

For production:

```bash
netlify deploy --prod
```

---

### Railway

```bash
npm install -g @railway/cli
railway login
railway up
```

---

### Docker

**Quick start with Docker Compose:**

```bash
docker compose up -d
```

**Or build and run manually:**

```bash
# Build the image
docker build -t fraud-checker-bd-courier .

# Run the container
docker run -p 3000:3000 --env-file .env fraud-checker-bd-courier
```

The Docker image uses a multi-stage build for minimal size and runs as a non-root user for security.

**Features:**
- Multi-stage build (deps → build → production)
- Non-root user (`appuser`)
- Built-in health check (`/health` endpoint)
- `.dockerignore` excludes dev files

---

### One-click Deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

---

### Supported Platforms

- ✅ Cloudflare Workers (Recommended)
- ✅ Vercel
- ✅ Netlify
- ✅ Railway
- ✅ Docker

---

## 🔄 CI/CD

GitHub Actions workflows run automatically on push/PR to `main`:

| Workflow | What it does |
|----------|-------------|
| **CI** (`ci.yml`) | Runs TypeScript lint, tests, and build |
| **Docker Publish** (`docker-publish.yml`) | Builds and pushes Docker image to GitHub Container Registry (GHCR) |

**Docker image:**

```bash
# Pull from GHCR
docker pull ghcr.io/smhasnanmonir/fraud-checker-bd-courier:main
```

---

## Tech Stack

- [Hono](https://hono.dev/) — lightweight web framework
- [TypeScript](https://www.typescriptlang.org/) — strict mode
- [Zod](https://zod.dev/) — schema validation
- [Pino](https://getpino.io/) — structured logging
- [Vitest](https://vitest.dev/) — testing

## Architecture

```
Request
  ↓
Router (routes/)              ← Zod validation
  ↓
Controller (controllers/)     ← orchestration
  ↓
Service (services/)           ← business logic + API calls
  ↓
External Courier API
```

**Layer responsibilities:**
- **Routes** — HTTP method + path + validation only
- **Controllers** — orchestrate services, format responses
- **Services** — business logic, external API calls
- **Schemas** — Zod validation + TypeScript type inference
- **DTOs** — response shapes, never expose raw objects
- **Mappers** — service results → DTOs
- **Shared** — cache, HTTP client, validators, logger

---

## Project Structure

```
src/
├── index.ts                              # Entry point
├── app.ts                                # Hono app + middleware
├── config/
│   └── env.ts                            # Typed env config (Zod validated)
├── middleware/
│   ├── error-handler.ts                  # Global error handler
│   └── pino-logger.ts                    # Request logging
├── shared/
│   ├── cache/                            # In-memory TTL cache
│   ├── errors/                           # Custom error classes
│   ├── http/                             # Fetch wrapper with cookie support
│   ├── logger/                           # Pino logger
│   ├── response/                         # Consistent API response helpers
│   └── validator/                        # Phone validation
├── modules/
│   ├── fraud/
│   │   ├── controllers/                  # HTTP handlers
│   │   ├── routes/                       # Path definitions + Zod validation
│   │   ├── services/                     # Business logic (each courier in own folder)
│   │   │   ├── base/                     # Abstract base with shared error handling
│   │   │   ├── steadfast/
│   │   │   ├── pathao/
│   │   │   ├── redx/
│   │   │   ├── paperfly/
│   │   │   └── carrybee/
│   │   ├── dtos/                         # Response shapes
│   │   ├── mappers/                      # Service → DTO mapping
│   │   └── schemas/                      # Zod schemas
│   └── health/
│       ├── controllers/
│       └── routes/
└── types/
    └── index.ts                          # All TypeScript types
```

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your courier credentials:

```env
STEADFAST_USER="your_email"
STEADFAST_PASSWORD="your_password"

PATHAO_USER="your_email"
PATHAO_PASSWORD="your_password"

REDX_PHONE="01XXXXXXXXX"
REDX_PASSWORD="your_password"

PAPERFLY_USER="your_username"
PAPERFLY_PASSWORD="your_password"

CARRYBEE_PHONE="01XXXXXXXXX"
CARRYBEE_PASSWORD="your_password"

# Security (optional — see Security section for details)
# ALLOWED_ORIGINS="https://yourapp.com"
# RATE_LIMIT_PER_MINUTE=30
```

### 3. Run

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

## API Endpoints (v1)

All endpoints are prefixed with `/api/v1`. Every response uses a consistent JSON envelope and camelCase fields. Successful responses include `X-Request-Id` and `ETag` headers; validation errors include a machine-readable `error.code` plus `details` for field-level form errors.

### Resources

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/fraud-reports/:phone` | Fraud report for a phone across all (or a subset of) couriers |
| `GET` | `/api/v1/couriers/:courier/fraud-reports/:phone` | Fraud report for a phone on a single courier |
| `GET` | `/api/v1/health/live` | Liveness probe — always `200` if the process is up |
| `GET` | `/api/v1/health/ready` | Readiness probe — `200` when ≥1 courier is configured, `503` otherwise |

### `GET /api/v1/fraud-reports/:phone`

Check fraud stats across all 5 couriers.

```bash
curl http://localhost:3000/api/v1/fraud-reports/01712345678
```

Optional filter (subset of couriers — comma-separated):

```bash
curl http://localhost:3000/api/v1/fraud-reports/01712345678?couriers=pathao,redx
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "couriers": {
      "steadfast": { "success": 3, "cancel": 1, "total": 4, "successRatio": 75.0 },
      "pathao":    { "success": 5, "cancel": 2, "total": 7, "successRatio": 71.43 },
      "redx":      { "success": 20, "cancel": 5, "total": 25, "successRatio": 80.0 },
      "paperfly":  { "success": 0, "cancel": 0, "total": 1, "successRatio": 0 },
      "carrybee":  { "success": 10, "cancel": 0, "total": 10, "successRatio": 100.0 }
    },
    "aggregate": {
      "totalSuccess": 38,
      "totalCancel": 8,
      "totalDeliveries": 47,
      "successRatio": 80.85,
      "cancelRatio": 17.02
    }
  },
  "meta": {
    "partial": false,
    "succeeded": 5,
    "failed": 0,
    "failedCouriers": [],
    "generatedAt": "2026-07-30T12:00:00Z"
  }
}
```

### `GET /api/v1/couriers/:courier/fraud-reports/:phone`

Check a single courier. Returns `503 COURIER_UNAVAILABLE` when the service cannot satisfy the request.

```bash
curl http://localhost:3000/api/v1/couriers/pathao/fraud-reports/01712345678
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "courier": "pathao",
    "phone": "01712345678",
    "result": { "success": 5, "cancel": 2, "total": 7, "successRatio": 71.43 }
  },
  "meta": {
    "partial": false,
    "succeeded": 1,
    "failed": 0,
    "failedCouriers": [],
    "generatedAt": "2026-07-30T12:00:00Z"
  }
}
```

### Error envelope

All errors share the same shape:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid input. Please check your request parameters.",
    "details": [
      { "field": "phone", "code": "invalid_string", "message": "Invalid Bangladeshi mobile number…" }
    ],
    "requestId": "6f0b8b7e-1c5f-4f0d-8c5a-7e0e7e7e7e7e",
    "meta": { "retryAfter": 30 }
  }
}
```

`requestId` echoes the `X-Request-Id` request header (auto-generated UUID when the client does not provide one). Use it to correlate user reports with server logs.

### Error codes

| Code | HTTP | When |
|---|---|---|
| `INVALID_INPUT` | 400 | Validation failed — see `details[]` for per-field reasons |
| `UNAUTHORIZED` | 401 | Missing/invalid credentials |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource does not exist (route or courier) |
| `COURIER_UNAVAILABLE` | 503 | One courier service failed |
| `UPSTREAM_ERROR` | 502 | Upstream courier returned 5xx |
| `RATE_LIMITED` | 429 | Rate limit hit — see `meta.retryAfter` |
| `PAYLOAD_TOO_LARGE` | 413 | Body exceeded 4kb |
| `TIMEOUT` | 504 | Request exceeded 10s |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Per-courier error codes

Individual courier results inside a report use a separate `errorCode` (no HTTP status mapping — the request itself is still `200` when at least one courier responded):

| `errorCode` | Meaning |
|---|---|
| `COURIER_UNAVAILABLE` | Generic upstream failure |
| `COURIER_AUTH_FAILED` | Courier rejected credentials (401/403) |
| `COURIER_RATE_LIMITED` | Courier rate-limited the request (429) |
| `COURIER_TIMEOUT` | Courier call timed out |
| `COURIER_CONFIG_MISSING` | Courier credentials not configured |

### Caching

Fraud reports include `ETag` and `Cache-Control: private, max-age=60, must-revalidate`. Clients may send `If-None-Match` to receive `304 Not Found` when nothing has changed.

---

## Phone Number Format

The API automatically normalizes phone numbers before validation. Any common BD mobile format is cleaned up server-side.

| Accepted (auto-normalized) | Normalizes to |
|---|---|
| `01712345678` | `01712345678` |
| `+8801712345678` | `01712345678` |
| `8801712345678` | `01712345678` |
| `+880 171-234 5678` | `01712345678` |
| `017 1234 5678` | `01712345678` |
| `017-1234-5678` | `01712345678` |

| Rejected after normalization |
|---|
| `1234567890` (too short / wrong prefix) |
| `02171234567` (landline, not mobile) |
| `01234567890` (12 digits) |

**What gets stripped:**
1. All non-digit characters — aggressively removed first (XSS/SQLi/RCE prevention)
2. `880` country code prefix
3. Spaces, dashes `-`, parentheses `()`, dots `.`

---

## Security

All user inputs are sanitized, validated, and rate-limited server-side. The API never logs PII (phone numbers, passwords, tokens) and never leaks them to clients.

### Input Sanitization

| Threat | Mitigation |
|---|---|
| XSS (Cross-Site Scripting) | Phone params stripped to digits-only; HTML tags stripped from string inputs |
| SQL Injection | Non-digit characters removed before any DB query; no raw string interpolation |
| CSRF | Stateless API (no session cookies); courier auth uses Bearer tokens |
| Remote Code Execution | Input sanitized to digits-only; no `eval()`, `Function()`, or shell interpolation |

**Normalization pipeline:**
```
Raw input → stripToDigits() → normalizeBdPhone() → regex validation → safe output
```

Example attack payloads that get neutralized:
```
"<script>alert(1)</script>01712345678"  → "01712345678" accepted
"'; DROP TABLE users; --"              → "" rejected
"<img onerror=alert(1) src=x>"          → "" rejected
```

### HTTP & API Hardening

| Threat | Mitigation | Where |
|---|---|---|
| Missing security headers | `secureHeaders()` — HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy | `app.ts` |
| CORS abuse | Restricted origins via `ALLOWED_ORIGINS`; GET/HEAD/OPTIONS only | `app.ts` |
| DoS / credential abuse | `hono-rate-limiter` — default 30 req/min per IP, configurable via `RATE_LIMIT_PER_MINUTE`; `Retry-After` set on 429 | `app.ts` |
| Oversized body DoS | `bodyLimit()` — 4kb cap | `app.ts` |
| Slow-loris hangs | Custom `requestTimeout()` — 10s request timeout | `middleware/timeout.ts` |
| Hanging courier requests | `AbortSignal.timeout()` — 15s per outbound HTTP call | `http.ts` |
| URL injection / SSRF | `encodeURIComponent()` on all user-derived URL segments | courier services |
| Stack-trace leak | Hono `HTTPException` mapped to our error envelope; unexpected errors return generic `INTERNAL_ERROR` | `middleware/error-handler.ts` |
| PII in logs | Pino redaction for `phone`, `password`, `token`, `accessToken`, `cookies`, `authorization`, `cookie`, `set-cookie`, upstream `data` payloads | `shared/logger/logger.ts` |

### Information Leakage Prevention

| Threat | Mitigation | Where |
|---|---|---|
| Internal error messages | All errors return a canonical envelope; detailed messages stay in server logs | `middleware/error-handler.ts` |
| Courier API details | Services translate failures to typed `errorCode` (`COURIER_AUTH_FAILED`, `COURIER_TIMEOUT`, etc.) — raw upstream strings/status never reach the client | `services/base/base-courier.service.ts` |
| Validation error detail | Field-level `details[]` returned to client (frontend needs them for form errors); schema structure not exposed otherwise | `middleware/error-handler.ts` |
| Path reflection | 404 handler returns generic `'Resource not found'`; no request path echoed | `app.ts` |
| PII in access logs | `X-Request-Id` and request method/path logged; phone number never logged at info level | `middleware/pino-logger.ts`, `shared/logger/logger.ts` |

### Logging Policy

- **INFO/DEBUG logs** contain only: event name, request method/path, request id, courier name, success counts, failure counts. **Never** phone numbers, passwords, or tokens.
- **ERROR/WARN logs** may include `errorCode`, upstream HTTP status, and a generic failure message — but Pino's `redact` paths strip every `phone`, `*.phone`, `password`, `*.password`, `token`, `*.token`, `accessToken`, `*.accessToken`, `csrfToken`, `businessId`, `session`, `cookies`, `authorization`, `cookie`, `set-cookie`, and upstream `data` payloads before they leave the process.
- Set `LOG_LEVEL=debug` in non-production for verbose traces.

### Security Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `*` (all) | Comma-separated CORS origins. **Set this in production!** |
| `RATE_LIMIT_PER_MINUTE` | `30` | Max requests per minute per IP |
| `LOG_LEVEL` | `info` | Pino log level (`trace`/`debug`/`info`/`warn`/`error`/`fatal`) |

---

## Testing

```bash
npm test
```

**116 tests** across 11 suites covering:

- Phone validation (valid/invalid/formatted numbers + XSS/SQLi payloads)
- Cache (TTL expiry, cache-aside pattern)
- Cookie helpers (parse, merge)
- Zod schemas (request/response/query validation, camelCase DTOs, partial-failure meta)
- All 5 courier services (mocked HTTP, `errorCode` propagation)
- Controller (aggregation, partial failures, courier filter, `CourierUnavailableError` on single-courier failure)
- Integration via real `app.request()` — routes, error envelope, status codes, ETag/304, `X-Request-Id` echo, partial-failure meta, health endpoints

---

## Courier Auth Methods

| Courier | Auth Method | Caching |
|---|---|---|
| Steadfast | CSRF token + cookie session login | None |
| Pathao | REST token login | None |
| RedX | REST token login | 50 min TTL |
| Paperfly | REST token login | 55 min TTL |
| Carrybee | NextAuth 3-step CSRF + cookie jar | 55 min TTL |

---

## Migration from `v0` (pre-versioned)

| Old | New |
|---|---|
| `GET /check/:phone` | `GET /api/v1/fraud-reports/:phone` |
| `GET /check/:phone/:courier` | `GET /api/v1/couriers/:courier/fraud-reports/:phone` |
| `GET /health` | `GET /api/v1/health/live` |
| `{ "success_ratio": … }` | `{ "successRatio": … }` |
| `{ "steadfast": {…} }` (top-level keys) | `{ "data": { "couriers": { "steadfast": {…} } } }` |
| `{ "error": "Internal server error" }` | `{ "error": { "code": "INTERNAL_ERROR", "message": "…" } }` |
| `500` on every courier failure | `200` with per-courier `errorCode` + `meta.partial: true`; aggregate `successRatio` is `null` |

---

## License

GPL-3.0 (matches original Laravel package)
