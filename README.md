# Firearms Legislation Tracker

A Next.js 14 application for tracking firearms legislation using server actions, Prisma, and SQLite.

## Features

- Track and monitor firearms legislation
- Filter bills by state, status, and keywords
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
- `MOCK_LEGISLATIVE_API`: Set to "true" for development
- `MOCK_LLM_ANALYSIS`: Set to "true" for development
- `RSS_FEED_URL`: URL for RSS feed (optional for MVP)

## Development Notes

- The application uses SQLite for development but can be easily switched to PostgreSQL for production
- Authentication is implemented with basic credentials for MVP
- Legislative API calls are mocked for development
- LLM analysis features use mock responses for MVP
