# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design Philosophy

### Core Principles
1. **Modular Architecture** - Small, focused modules with single responsibilities
2. **Abstraction Layers** - Database, file system, and external APIs abstracted behind interfaces
3. **Reusability** - One component/function per feature, reuse everywhere via props
4. **Type Safety** - Strict TypeScript, Zod validation at boundaries
5. **Edge-First** - Cloudflare Workers/Pages compatible (no Node.js-only APIs)
6. **Don't Reinvent** - Use battle-tested packages over custom implementations

### Architecture Layers
```
┌─────────────────────────────────────────────┐
│  UI Layer (React Components)                │
├─────────────────────────────────────────────┤
│  Application Layer (Server Actions/API)     │
├─────────────────────────────────────────────┤
│  Domain Layer (Business Logic/Services)     │
├─────────────────────────────────────────────┤
│  Infrastructure Layer (Repositories/Adapters)│
│  - Database Repository (Prisma abstracted)  │
│  - API Clients (Congress.gov, OpenStates)   │
│  - LLM Provider (OpenAI, Anthropic, etc.)   │
│  - Email Provider (Resend)                  │
│  - Cache (Upstash Redis)                    │
└─────────────────────────────────────────────┘
```

### Code Organization Rules
- **NO** raw Prisma calls outside `app/lib/db/repositories/`
- **NO** duplicate components - use props for variants
- **NO** reinventing - use existing packages
- **NO** 1000-line files - split into focused modules
- **YES** to composition over inheritance
- **YES** to server components by default, `"use client"` only when needed

## Commands

```bash
npm run dev        # Start development server with Turbopack
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run Vitest unit tests
npm run test:e2e   # Run Playwright E2E tests
```

**Database commands:**
```bash
npm run db:generate  # Generate Prisma client after schema changes
npm run db:push      # Push schema changes to database
npm run db:migrate   # Create and apply migrations
npm run db:studio    # Open database GUI
```

**Test commands:**
```bash
npm run test           # Run all unit tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
npm run test:e2e       # Run Playwright E2E tests
```

**Test scripts:**
```bash
node scripts/test-congress-api.js  # Test Congress.gov API integration
node scripts/sync-bills.js         # Manual bill synchronization
```

## Architecture

Firetrack is a Next.js 15 App Router application for tracking firearms legislation at federal and state levels.

### Key Directories

```
app/
├── lib/
│   ├── db/                    # Database abstraction layer
│   │   ├── client.ts          # Prisma client singleton
│   │   ├── repositories/      # Repository pattern implementations
│   │   │   ├── base.ts        # BaseRepository interface
│   │   │   ├── bill.repository.ts
│   │   │   ├── legislator.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   └── alert.repository.ts
│   │   └── types/             # Database entity types
│   │
│   ├── services/              # Business logic layer
│   │   ├── bill.service.ts
│   │   ├── legislator.service.ts
│   │   ├── sync.service.ts
│   │   ├── alert.service.ts
│   │   └── document/          # PDF/OCR processing
│   │       ├── pdf.service.ts
│   │       └── ocr.service.ts
│   │
│   ├── api-clients/           # External API abstractions
│   │   ├── base.ts            # BaseApiClient with retry/rate limiting
│   │   ├── congress.client.ts
│   │   └── openstates.client.ts
│   │
│   ├── llm/                   # LLM provider abstraction
│   │   └── index.ts           # Uses Vercel AI SDK
│   │
│   ├── actions/               # Server actions (thin, delegate to services)
│   ├── store/                 # Zustand client-side state
│   └── types/                 # Shared TypeScript types
│
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── bills/                 # Bill-related components
│   ├── legislators/           # Legislator-related components
│   ├── sync/                  # Sync UI components
│   ├── alerts/                # Alert UI components
│   └── shared/                # Reusable shared components
│
└── (routes)/                  # App router pages
```

### Data Flow

1. **UI Components** → Call server actions
2. **Server Actions** → Thin layer, delegate to services
3. **Services** → Business logic, orchestration
4. **Repositories** → Database access (Prisma abstracted)
5. **API Clients** → External API calls with rate limiting

### API Integration Notes

- **OpenStates API**: 250 requests/day, 10/minute
- **Congress.gov API**: 1000 requests/hour
- Rate limiting via Upstash Redis (persistent, not in-memory)

### Server Action Return Pattern

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Database

- **Development**: SQLite (`file:./prisma/dev.db`)
- **Production**: PostgreSQL (Neon, Supabase, or Turso for Cloudflare)
- **Abstraction**: All access through repositories, allowing easy DB swap

### Authentication

NextAuth v5 with credentials + OAuth providers. Protected routes via middleware.

## Path Aliases

`@/*` maps to `./app/*` (configured in tsconfig.json)

## Environment Variables

**Required:**
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - NextAuth encryption key
- `NEXTAUTH_URL` - Base URL for NextAuth

**API Keys:**
- `OPENSTATES_API_KEY` - Register at openstates.org/api/register/
- `CONGRESS_API_KEY` - Register at api.data.gov/signup/
- `OPENAI_API_KEY` - For OpenAI LLM features
- `ANTHROPIC_API_KEY` - For Anthropic Claude features

**Optional:**
- `UPSTASH_REDIS_REST_URL` - For rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - For rate limiting
- `RESEND_API_KEY` - For email notifications

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Database**: Prisma ORM with SQLite/PostgreSQL
- **Auth**: NextAuth v5
- **State**: Zustand with persistence
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **LLM**: Vercel AI SDK (OpenAI, Anthropic)
- **PDF Processing**: pdf-parse + Tesseract.js + Sharp

## Testing

Tests are located in the `tests/` directory:

```
tests/
├── setup.ts              # Test setup with mocks and matchers
├── unit/                 # Unit tests
│   ├── bill.repository.test.ts
│   ├── pdf.service.test.ts
│   └── ocr.service.test.ts
└── integration/          # Integration tests
    └── bill-pdf-sync.test.ts
```

### Writing Tests

- Use Vitest (`describe`, `it`, `expect`, `vi`)
- Mock external dependencies (Prisma, axios, pdf-parse, tesseract.js)
- Use `vi.mock()` for module mocking before imports
- Use `vi.mocked()` for type-safe mock access
- Reset mocks in `beforeEach`/`afterEach`

## PDF & OCR Processing

The document service handles bill text extraction from PDFs:

1. **Text Extraction** (`pdf.service.ts`):
   - Downloads PDF from URL
   - Extracts text using pdf-parse
   - Validates text quality (>100 chars, >50% alphanumeric)
   - Falls back to OCR if text extraction fails

2. **OCR** (`ocr.service.ts`):
   - Uses Tesseract.js for optical character recognition
   - Preprocesses images with Sharp (grayscale, normalize, sharpen)
   - Supports PDF-to-image conversion via pdf-poppler (requires system install)

### OCR System Requirements

For full OCR on scanned PDFs, install Poppler:
- **Windows**: Download from https://github.com/oschwartz10612/poppler-windows
- **macOS**: `brew install poppler`
- **Linux**: `apt-get install poppler-utils`

Without Poppler, OCR works on image files only.

## Authentication

NextAuth v5 is configured for authentication:

### Route Protection
- **Public routes**: `/`, `/bills/*`, `/federal/*` - Browse bills without login
- **Protected routes**: `/dashboard`, `/settings`, `/tracking` - Require authentication
- Middleware in `middleware.ts` handles redirects

### Auth Files
- `app/auth.ts` - NextAuth configuration with credentials provider
- `app/api/auth/[...nextauth]/route.ts` - Auth API endpoints
- `middleware.ts` - Route protection middleware
- `app/auth/signin/page.tsx` - Sign-in page

### Session Access
```typescript
// Server component
import { auth } from "@/auth";
const session = await auth();

// Client component
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

### Environment Variables
Required for authentication:
- `NEXTAUTH_SECRET` - Secret key for JWT encryption
- `NEXTAUTH_URL` - Base URL (e.g., `http://localhost:3000`)
