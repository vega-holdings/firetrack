# Firearms Legislation Tracker

A Next.js 15 application for tracking firearms legislation at federal and state levels, with PDF processing, OCR capabilities, and comprehensive bill management.

## Features

- Track and monitor firearms legislation at both federal and state levels
- Filter bills by jurisdiction (federal/state), state, status, and keywords
- Integration with Congress.gov API for federal bills
- Integration with OpenStates API for state bills
- PDF text extraction with OCR fallback for scanned documents
- User authentication with protected routes
- Responsive dashboard interface
- Bill tracking and alerts system

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Database**: Prisma with SQLite (dev) / PostgreSQL (prod)
- **Authentication**: NextAuth.js v5
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **PDF Processing**: pdf-parse + Tesseract.js + Sharp

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vega-holdings/firetrack.git
   cd firetrack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your values:
   ```
   DATABASE_URL="file:./prisma/dev.db"
   NEXTAUTH_SECRET="your-secret-key-at-least-32-chars-long"
   NEXTAUTH_URL="http://localhost:3000"
   ```

5. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Development

Run the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### Running Tests

```bash
npm run test          # Run all unit tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run test:e2e      # Run Playwright E2E tests
```

## Project Structure

```
firetrack/
├── app/
│   ├── api/                    # API routes
│   ├── auth/                   # Auth pages (signin, etc.)
│   ├── components/
│   │   ├── bills/              # Bill-related components
│   │   ├── sync/               # Sync UI components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   └── ...
│   ├── dashboard/              # User dashboard (protected)
│   ├── lib/
│   │   ├── actions/            # Server actions
│   │   ├── db/                 # Database abstraction layer
│   │   │   ├── repositories/   # Repository pattern implementations
│   │   │   └── types/          # Database entity types
│   │   ├── services/           # Business logic layer
│   │   │   └── document/       # PDF/OCR processing
│   │   ├── store/              # Zustand state management
│   │   └── types/              # Shared TypeScript types
│   └── ...
├── prisma/                     # Prisma schema and migrations
├── tests/
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
└── types/                      # TypeScript type declarations
```

## Environment Variables

### Required
- `DATABASE_URL`: Database connection string
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js session encryption
- `NEXTAUTH_URL`: Base URL of your application

### API Keys
- `CONGRESS_API_KEY`: API key from api.data.gov for Congress.gov API access
- `OPENSTATES_API_KEY`: API key for OpenStates API access
- `OPENSTATES_API_URL`: OpenStates API base URL

### Optional
- `OPENAI_API_KEY`: For AI-powered bill analysis
- `ANTHROPIC_API_KEY`: For Claude-powered features
- `UPSTASH_REDIS_REST_URL`: For rate limiting
- `UPSTASH_REDIS_REST_TOKEN`: For rate limiting

## API Keys

### Congress.gov API
1. Visit [api.data.gov](https://api.data.gov/signup/) to sign up for an API key
2. Add your API key to the `.env` file as `CONGRESS_API_KEY`

### OpenStates API
1. Visit [OpenStates.org](https://openstates.org/api/register/) to register for an API key
2. Add your API key to the `.env` file as `OPENSTATES_API_KEY`

## Architecture

The application follows a layered architecture:

1. **UI Layer** - React components (server-first, client when needed)
2. **Application Layer** - Server actions and API routes
3. **Domain Layer** - Business logic in services
4. **Infrastructure Layer** - Repositories, API clients, external integrations

Key patterns:
- **Repository Pattern** - All database access through `app/lib/db/repositories/`
- **Service Layer** - Business logic in `app/lib/services/`
- **Unified Bill Model** - Single model for both federal and state bills

## PDF & OCR Processing

The application can extract text from bill PDFs:

1. **Text Extraction** - Uses pdf-parse for native PDF text
2. **OCR Fallback** - Uses Tesseract.js for scanned documents
3. **Image Preprocessing** - Sharp for better OCR accuracy

For full OCR on scanned PDFs, install Poppler:
- **Windows**: Download from https://github.com/oschwartz10612/poppler-windows
- **macOS**: `brew install poppler`
- **Linux**: `apt-get install poppler-utils`

## Route Protection

- **Public routes**: `/`, `/bills/*`, `/federal/*` - Browse without login
- **Protected routes**: `/dashboard`, `/settings`, `/tracking` - Require authentication

## Development Notes

- Uses SQLite for development, PostgreSQL-compatible for production
- Rate limiting implemented for both Congress.gov and OpenStates APIs
- 31 passing tests covering repositories, PDF processing, and OCR

## Scripts

```bash
npm run dev           # Start development server with Turbopack
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run test          # Run unit tests
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:migrate    # Create and apply migrations
npm run db:studio     # Open Prisma Studio
```

## License

Private - All rights reserved.
