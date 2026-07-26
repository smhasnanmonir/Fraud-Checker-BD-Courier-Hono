# Fraud Checker BD Courier — Hono

> **Ported from** [AbiruzzamanMolla/Fraud-Checker-BD-Courier-Laravel](https://github.com/AbiruzzamanMolla/Fraud-Checker-BD-Courier-Laravel)
>
> Huge thanks to **Md Abiruzzaman Molla** ([@AbiruzzamanMolla](https://github.com/AbiruzzamanMolla)) for building the original Laravel package and discovering the courier API endpoints. This project would not exist without his work.
>
> This TypeScript/Hono port was built entirely with AI **Mimo v2.5** model + **Pi Coding Agent**.

---

A fraud detection API for Bangladeshi e-commerce platforms. Analyzes customer delivery behavior across 5 major couriers: **Steadfast**, **Pathao**, **RedX**, **Paperfly**, and **Carrybee**.

Check a phone number → get success/cancel ratios → decide whether to approve COD orders.

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

---

## API Endpoints

### `GET /check/:phone`

Check fraud stats across **all 5 couriers**.

```bash
curl http://localhost:3000/check/01712345678
```

**Response:**

```json
{
  "success": true,
  "data": {
    "steadfast": { "success": 3, "cancel": 1, "total": 4, "success_ratio": 75.0 },
    "pathao":    { "success": 5, "cancel": 2, "total": 7, "success_ratio": 71.43 },
    "redx":      { "success": 20, "cancel": 5, "total": 25, "success_ratio": 80.0 },
    "paperfly":  { "success": 0, "cancel": 0, "total": 1, "success_ratio": 0 },
    "carrybee":  { "success": 10, "cancel": 0, "total": 10, "success_ratio": 100.0 },
    "aggregate": {
      "total_success": 38,
      "total_cancel": 8,
      "total_deliveries": 47,
      "success_ratio": 80.85,
      "cancel_ratio": 17.02
    }
  }
}
```

### `GET /check/:phone/:courier`

Check a **single courier**.

```bash
curl http://localhost:3000/check/01712345678/pathao
```

**Response:**

```json
{
  "success": true,
  "data": {
    "courier": "pathao",
    "phone": "01712345678",
    "result": { "success": 5, "cancel": 2, "total": 7, "success_ratio": 71.43 }
  }
}
```

### `GET /health`

```bash
curl http://localhost:3000/health
```

---

## Phone Number Format

The API **automatically normalizes** phone numbers before validation. You can send any common BD mobile format and it will be cleaned up server-side.

| ✅ Accepted (auto-normalized) | Normalizes to |
|-------------------------------|---------------|
| `01712345678` | `01712345678` |
| `+8801712345678` | `01712345678` |
| `8801712345678` | `01712345678` |
| `+880 171-234 5678` | `01712345678` |
| `017 1234 5678` | `01712345678` |
| `017-1234-5678` | `01712345678` |

| ❌ Still invalid after normalization |
|--------------------------------------|
| `1234567890` (too short / wrong prefix) |
| `02171234567` (landline, not mobile) |
| `01234567890` (12 digits) |

**What gets stripped:**
1. **All non-digit characters** — aggressively removed first (XSS/SQLi/RCE prevention)
2. `880` country code prefix
3. Spaces, dashes `-`, parentheses `()`, dots `.`

---

## Security

All user inputs are sanitized, validated, and rate-limited server-side to prevent XSS, CSRF, SQL injection, remote code execution, and DoS attacks.

### Input Sanitization

| Threat | Mitigation |
|--------|------------|
| **XSS** (Cross-Site Scripting) | Phone params stripped to digits-only; HTML tags stripped from string inputs |
| **SQL Injection** | Non-digit characters removed before any DB query; no raw string interpolation |
| **CSRF** | Stateless API (no session cookies); courier auth uses Bearer tokens |
| **Remote Code Execution** | Input sanitized to digits-only; no `eval()`, `Function()`, or shell interpolation |

**Normalization pipeline:**
```
Raw input → stripToDigits() → normalizeBdPhone() → regex validation → safe output
```

Example attack payloads that get neutralized:
```
"<script>alert(1)</script>01712345678"  → "01712345678" ✅
"'; DROP TABLE users; --"              → "" → rejected ❌
"<img onerror=alert(1) src=x>"          → "" → rejected ❌
```

### HTTP & API Hardening

| Threat | Mitigation | Where |
|--------|-------------|-------|
| **No security headers** | `secureHeaders()` — HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy | `app.ts` |
| **CORS abuse** | Restricted to `ALLOWED_ORIGINS` env var; GET-only methods | `app.ts` |
| **DoS / credential abuse** | Rate limiting (`hono-rate-limiter`) — default 30 req/min per IP, configurable via `RATE_LIMIT_PER_MINUTE` | `app.ts` |
| **Oversized body DoS** | `bodyLimit()` — 100kb cap | `app.ts` |
| **Slow-loris hangs** | `timeout()` — 30s request timeout | `app.ts` |
| **Hanging courier requests** | `AbortSignal.timeout()` — 15s per outbound HTTP call | `http.ts` |
| **URL injection / SSRF** | `encodeURIComponent()` on all user-derived URL segments | courier services |

### Information Leakage Prevention

| Threat | Mitigation | Where |
|--------|-------------|-------|
| **Internal error messages** | Route handlers return generic `'Internal server error'`; full error logged server-side | `fraud.routes.ts` |
| **Courier API details** | `handleError()` returns generic `'Courier service unavailable'`; upstream status/messages stay in logs | `base-courier.service.ts` |
| **Zod schema structure** | Validation errors return generic message; detailed issues logged server-side | `error-handler.ts` |
| **Path reflection** | 404 handler returns generic `'Resource not found'` (no path reflection) | `app.ts` |

### Security Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `*` (all) | Comma-separated CORS origins. **Set this in production!** |
| `RATE_LIMIT_PER_MINUTE` | `30` | Max requests per minute per IP |

---

## Testing

```bash
npm test
```

**102 tests** covering:
- Phone validation (valid/invalid/formatted numbers + XSS/SQLi payloads)
- Cache (TTL expiry, cache-aside pattern)
- Cookie helpers (parse, merge)
- Zod schemas (request/response validation)
- All 5 courier services (mocked HTTP)
- Controller (aggregation, partial failures)
- Integration (full HTTP via `app.request()`)

---

## Courier Auth Methods

| Courier | Auth Method | Caching |
|---------|------------|---------|
| **Steadfast** | CSRF token + cookie session login | None |
| **Pathao** | REST token login | None |
| **RedX** | REST token login | 50 min TTL |
| **Paperfly** | REST token login | 55 min TTL |
| **Carrybee** | NextAuth 3-step CSRF + cookie jar | 55 min TTL |

---

## License

GPL-3.0 (matches original Laravel package)
