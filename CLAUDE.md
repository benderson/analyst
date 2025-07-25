# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an open-source AI chatbot template built with Next.js 15 and the Vercel AI SDK v5. It provides a production-ready foundation for building conversational AI applications with support for multiple model providers, artifact creation, and persistent chat storage.

### Research Integration

This frontend has been extended with a research mode that integrates with the LangGraph Interview Panel system for ESG (Environmental, Social, and Governance) controversy research. The integration supports:

- Real-time streaming of research progress and interviews
- AI SDK v5 data streaming protocol with transient/persistent data separation
- Backward compatibility with AI SDK v4 event formats
- ID-based reconciliation for smooth UI updates
- Integration with the Interview Panel multi-agent system

### Technology Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui components
- **AI Integration**: Vercel AI SDK v5 with support for xAI (default), OpenAI, and other providers
- **Database**: PostgreSQL (via Neon) with Drizzle ORM for chat persistence
- **Authentication**: NextAuth.js v5 (Auth.js) for user authentication
- **Storage**: Vercel Blob for file uploads and artifact storage
- **Streaming**: Server-Sent Events (SSE) with optional Redis-based resumable streams
- **Testing**: Playwright for E2E and route testing

## Development Commands

### Initial Setup
```bash
# Install dependencies
pnpm install

# Set up environment variables
# Copy .env.example to .env.local and fill in required values:
# - AUTH_SECRET (generate with: openssl rand -base64 32)
# - XAI_API_KEY (from https://console.x.ai/)
# - POSTGRES_URL (Neon database URL)
# - BLOB_READ_WRITE_TOKEN (Vercel Blob token)
# - REDIS_URL (optional, for resumable streams)

# Run database migrations
pnpm db:migrate
```

### Development
```bash
# Start development server (port 3000)
pnpm dev

# Start with Turbopack (faster HMR)
pnpm dev --turbo
```

### Database Management
```bash
# Generate migration files after schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Open Drizzle Studio for database inspection
pnpm db:studio

# Push schema changes directly (development only)
pnpm db:push
```

### Code Quality
```bash
# Run ESLint and Biome linters
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Format code with Biome
pnpm format
```

### Testing
```bash
# Run all Playwright tests
pnpm test

# Run specific test suites
pnpm exec playwright test tests/e2e/chat.test.ts
pnpm exec playwright test --project=routes

# Open Playwright UI for debugging
pnpm exec playwright test --ui

# Generate test report
pnpm exec playwright show-report
```

### Production
```bash
# Build for production (includes migration)
pnpm build

# Start production server
pnpm start
```

## Architecture

### Route Structure
- `/` - Main chat interface with message streaming
- `/chat/[id]` - Individual chat sessions with persistence
- `/login`, `/register` - Authentication pages
- `/api/chat` - Main chat API endpoint using AI SDK
- `/api/chat/[id]/stream` - Stream endpoint for resumable connections
- `/api/document`, `/api/files/upload` - Artifact and file handling

### Key Components

**Chat System** (`components/chat.tsx`):
- Uses AI SDK's `useChat` hook for message streaming
- Supports multimodal input (text + file attachments)
- Implements custom transport for error handling
- Integrates with data stream provider for artifact updates

**Message Components** (`components/messages.tsx`, `components/message.tsx`):
- Renders user and assistant messages with markdown support
- Displays message reasoning (for reasoning models)
- Shows tool invocations and results
- Supports message voting and editing

**Artifact System** (`artifacts/`):
- Code artifacts with syntax highlighting and editing
- Image artifacts with generation and editing
- Text document artifacts with rich text editing
- Sheet artifacts for spreadsheet data

**AI Configuration** (`lib/ai/`):
- Model abstraction supporting multiple providers
- Tool definitions (weather, document creation/update, suggestions)
- Configurable prompts and system messages
- Entitlements system for rate limiting

### Database Schema (`lib/db/schema.ts`)

Key tables:
- `chat`: Stores chat sessions with titles and visibility
- `message`: Chat messages with parts and attachments
- `messageVote`: User feedback on messages
- `user`: User accounts and metadata
- `session`: Auth.js session management

### Authentication Flow
1. Guest users get temporary sessions with limited access
2. Registered users authenticate via email/password
3. Sessions persist across devices with secure cookies
4. Different entitlements for guest vs registered users

## AI Model Integration

### Default Models (xAI)
- **Chat**: `grok-2-vision-1212` - General purpose conversations
- **Reasoning**: `grok-3-mini-beta` - Advanced reasoning with thought process
- **Title Generation**: `grok-2-1212` - Chat title generation
- **Artifacts**: `grok-2-1212` - Document and code generation

### Adding New Providers
Edit `lib/ai/providers.ts` to add new model providers:
```typescript
import { openai } from '@ai-sdk/openai';

export const myProvider = customProvider({
  languageModels: {
    'chat-model': openai('gpt-4-turbo'),
    // ...
  }
});
```

## Common Tasks

### Running a Single Test
```bash
# Run specific test file
pnpm exec playwright test tests/e2e/artifacts.test.ts

# Run with specific browser
pnpm exec playwright test --project=e2e --browser=chromium

# Debug mode with headed browser
pnpm exec playwright test --debug
```

### Research Mode Integration

#### API Route (`app/(chat)/api/research/route.ts`)
The research endpoint connects to the LangGraph Interview Panel and streams events in AI SDK format:

```typescript
// Handles both v4 and v5 event formats
const processEvent = (event) => {
  if (Array.isArray(event)) {
    // v4 format: [{type: "analyst", data: {...}}]
    processV4Events(event);
  } else if (event.type?.startsWith('data-')) {
    // v5 format: {type: "data-analyst", data: {...}}
    processV5DataPart(event);
  }
};
```

#### Research Panel Component (`components/research-panel.tsx`)
Uses the AI SDK's `useChat` hook with onData callback for transient events:

```typescript
const { messages, data, handleSubmit } = useChat({
  api: '/api/research',
  onData: (dataPart) => {
    // Handle transient v5 events
    if (dataPart.type === 'progress') {
      setTransientProgress(dataPart.data);
    }
  }
});
```

#### Event Types
The research integration supports these event types:
- `analyst`: ESG analyst creation/updates (persistent)
- `progress`: Progress messages (transient)
- `interview`: Interview messages (transient)
- `search`: Search status updates (transient)
- `section`: Report section completion (persistent)
- `error`: Error events (transient)
- `metadata`: Graph metadata (persistent)

### Modifying the Database Schema
1. Edit `lib/db/schema.ts` with your changes
2. Generate migration: `pnpm db:generate`
3. Review generated SQL in `lib/db/migrations/`
4. Apply migration: `pnpm db:migrate`

### Adding New Tools
1. Create tool definition in `lib/ai/tools/`
2. Add to tools object in chat route (`app/(chat)/api/chat/route.ts`)
3. Update `experimental_activeTools` list if needed
4. Tools automatically integrate with streaming UI

### Customizing the Chat UI
- Main chat interface: `components/chat.tsx`
- Message rendering: `components/message.tsx`
- Input area: `components/multimodal-input.tsx`
- Sidebar: `components/app-sidebar.tsx`

## Environment Variables

Required:
- `AUTH_SECRET`: Session encryption key
- `XAI_API_KEY`: xAI API key for LLM access
- `POSTGRES_URL`: PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token

Optional:
- `REDIS_URL`: Redis connection for resumable streams
- `VERCEL_URL`: Deployment URL (auto-set on Vercel)
- `LANGGRAPH_API_URL`: LangGraph API endpoint (default: http://192.168.1.193:2024)
- `LANGGRAPH_API_KEY`: API key for LangGraph (optional for local development)
- `AI_SDK_V5_MODE`: Enable dual v4/v5 emission in backend (default: false)
- `AI_SDK_V5_ONLY`: Emit only v5 format from backend (default: false)

## Performance Considerations

- Messages stream using Server-Sent Events (SSE)
- Optional Redis integration enables resumable streams
- Database queries use prepared statements via Drizzle
- React Server Components minimize client bundle
- Turbopack available for faster local development
- Research mode uses ID-based reconciliation to prevent duplicate UI updates
- Transient data updates don't persist to reduce database load

## AI SDK v5 Compatibility

The research integration is fully prepared for AI SDK v5 while maintaining v4 compatibility:

### Migration Status
- ✅ Backend emits both v4 and v5 formats (controlled by environment)
- ✅ Frontend handles both event formats automatically
- ✅ onData callback implemented for transient events
- ✅ ID-based reconciliation prevents duplicates
- ✅ Transient/persistent data separation

### Testing AI SDK v5 Features
```bash
# Test with v4 format only (default)
pnpm dev

# Test with dual emission (v4 + v5)
AI_SDK_V5_MODE=true pnpm dev

# Test with v5-only mode
AI_SDK_V5_MODE=true AI_SDK_V5_ONLY=true pnpm dev
```

### Event Format Examples

**v4 Format (Default):**
```json
[{"type": "analyst", "data": {"name": "Dr. Chen", ...}}]
```

**v5 Format (When AI_SDK_V5_MODE=true):**
```json
{"type": "data-analyst", "id": "analyst-0", "data": {...}, "transient": false}
```