# Fraud Checker BD Courier — Hono

A fraud detection API for Bangladeshi e-commerce platforms. Analyzes customer delivery behavior across 5 major couriers: **Steadfast**, **Pathao**, **RedX**, **Paperfly**, and **Carrybee**.

Check a phone number → get success/cancel ratios → decide whether to approve COD orders.

**Ported from** [AbiruzzamanMolla/Fraud-Checker-BD-Courier-Laravel](https://github.com/AbiruzzamanMolla/Fraud-Checker-BD-Courier-Laravel) (PHP/Laravel) to **Hono + TypeScript**.

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
Router (fraud.routes.ts)      ← Zod validation
  ↓
Controller (fraud.controller.ts) ← orchestration
  ↓
Service (steadfast.service.ts)   ← business logic + API calls
  ↓
External Courier API
```

**Layer responsibilities:**
- **Routes** — HTTP method + path + validation only
- **Controllers** — orchestrate services, format responses
- **Services** — business logic, external API calls
- **Schemas** — Zod validation + TypeScript type inference
- **Shared** — cache, HTTP client, validators, logger

---

## Project Structure

```
src/
├── index.ts                          # Entry point
├── app.ts                            # Hono app + middleware
├── config/
│   └── env.ts                        # Typed env config (Zod validated)
├── middleware/
│   ├── error-handler.ts              # Global error handler
│   └── pino-logger.ts               # Request logging
├── shared/
│   ├── cache.ts                      # In-memory TTL cache
│   ├── errors.ts                     # Custom error classes
│   ├── http.ts                       # Fetch wrapper with cookie support
│   ├── logger.ts                     # Pino logger
│   ├── response.ts                   # Consistent API response helpers
│   └── validator.ts                  # Phone validation
├── modules/
│   ├── fraud/
│   │   ├── fraud.schema.ts           # Zod schemas
│   │   ├── fraud.dto.ts              # Data transfer objects
│   │   ├── fraud.mapper.ts           # Result → DTO mapping
│   │   ├── fraud.controller.ts       # checkAllCouriers(), checkSingleCourier()
│   │   ├── fraud.routes.ts           # GET /check/:phone, GET /check/:phone/:courier
│   │   └── services/
│   │       ├── base-courier.service.ts
│   │       ├── steadfast.service.ts
│   │       ├── pathao.service.ts
│   │       ├── redx.service.ts
│   │       ├── paperfly.service.ts
│   │       └── carrybee.service.ts
│   └── health/
│       ├── health.controller.ts
│       └── health.routes.ts
└── types/
    └── index.ts                      # All TypeScript types
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

Numbers must be **11-digit Bangladeshi mobile** in local format:

| ✅ Valid | ❌ Invalid |
|----------|-----------|
| `01712345678` | `+8801712345678` |
| `01876543219` | `1234567890` |
| `01312345678` | `02171234567` |

---

## Testing

```bash
npm test
```

**74 tests** covering:
- Phone validation (valid/invalid numbers)
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
