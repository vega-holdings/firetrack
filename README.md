# Firearms Legislation Tracker

A Next.js 14 application for tracking firearms legislation using server actions, Prisma, and SQLite.

## Features

- Track and monitor firearms legislation at both federal and state levels
- Filter bills by jurisdiction (federal/state), state, status, and keywords
- Integration with Congress.gov API for federal bills
- Integration with OpenStates API for state bills
- RSS feed integration for legislative updates
- Basic authentication system
- Responsive dashboard interface

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: Prisma with SQLite
- **Authentication**: NextAuth.js v5 (beta)
- **State Management**: Zustand
- **Styling**: Tailwind CSS + shadcn/ui
- **Form Handling**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/firetrack.git
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

### Authentication

For the MVP, use these credentials:
- Username: admin
- Password: password

## Project Structure

```
firetrack/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Auth-related pages
│   ├── components/        # React components
│   └── lib/               # Utility functions, hooks, etc.
├── prisma/                # Prisma schema and migrations
└── public/               # Static files
```

## Environment Variables

- `DATABASE_URL`: SQLite database URL
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js session encryption
- `NEXTAUTH_URL`: Base URL of your application
- `CONGRESS_API_KEY`: API key from api.data.gov for Congress.gov API access
- `OPENSTATES_API_KEY`: API key for OpenStates API access
- `OPENSTATES_API_URL`: OpenStates API base URL
- `MOCK_LLM_ANALYSIS`: Set to "true" for development
- `RSS_FEED_URL`: URL for RSS feed (optional for MVP)

## API Keys

### Congress.gov API
1. Visit [api.data.gov](https://api.data.gov/signup/) to sign up for an API key
2. Add your API key to the `.env` file as `CONGRESS_API_KEY`

### OpenStates API
1. Visit [OpenStates.org](https://openstates.org/api/register/) to register for an API key
2. Add your API key to the `.env` file as `OPENSTATES_API_KEY`

## Development Notes

- The application uses SQLite for development but can be easily switched to PostgreSQL for production
- Authentication is implemented with basic credentials for MVP
- Both Congress.gov and OpenStates APIs are integrated for comprehensive bill tracking
- LLM analysis features use mock responses for MVP
- Rate limiting is implemented for both APIs to stay within usage limits

## Testing API Integration

Test the Congress.gov API integration:
```bash
node scripts/test-congress-api.js
```

This will verify your API key and test the bill search and detail endpoints.
