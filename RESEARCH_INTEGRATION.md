# Research Integration with AI SDK v5

This document explains how the Interview Panel research system has been integrated with the analyst frontend using AI SDK v5's data streaming capabilities.

## Architecture Overview

The integration consists of several key components:

### 1. API Route (`/api/research`)
- Accepts AI SDK v5 message format
- Connects to LangGraph Interview Panel API
- Streams events using `createUIMessageStream` and data parts
- Transforms Interview Panel events to AI SDK v5 `data-*` format

### 2. TypeScript Types (`lib/types/research.ts`)
- Defines all research-related interfaces
- Maps Interview Panel event types to frontend data structures
- Ensures type safety throughout the pipeline

### 3. UI Components
- **ResearchPanel**: Main container with search input and layout
- **AnalystList**: Displays expert analysts with their credentials
- **InterviewThreads**: Shows real-time interview conversations
- **ResearchProgress**: Tracks research phases and progress

## Data Flow

1. User enters research query in ResearchPanel
2. `useChat` hook sends message to `/api/research`
3. API route:
   - Extracts query from messages
   - Creates LangGraph thread
   - Streams Interview Panel events
   - Transforms events to AI SDK v5 data parts
4. Frontend receives data through `useChat` hook's `data` property
5. UI components update in real-time based on streamed data

## Event Mapping

Interview Panel events are mapped to AI SDK v5 data parts:

| Interview Panel Event | AI SDK v5 Data Part | Purpose |
|---------------------|-------------------|---------|
| `analyst` | Persistent data | Store analyst info in message |
| `progress` | Transient data | UI progress updates |
| `interview` | Transient data | Real-time interview status |
| `search` | Transient data | Search status updates |
| `section` | Persistent data | Store report sections |
| `error` | Transient data | Error notifications |

## Usage

### Basic Research Page

```tsx
import { ResearchPanel } from '@/components/research-panel';

export default function ResearchPage() {
  return <ResearchPanel />;
}
```

### Custom Integration

```tsx
import { useChat } from 'ai/react';
import type { ResearchDataStreamData } from '@/lib/types/research';

function CustomResearch() {
  const { data, append } = useChat({
    api: '/api/research',
    streamProtocol: 'data',
  });

  const researchData = data as ResearchDataStreamData;
  
  // Use researchData.analysts, researchData.interviews, etc.
}
```

## Environment Variables

Required for LangGraph connection:
- `LANGGRAPH_API_URL`: LangGraph API endpoint (default: http://192.168.1.193:2024)
- `LANGGRAPH_API_KEY`: API key for authentication (optional for local development)

### Local Development
For local development without authentication:
```bash
# .env.local
LANGGRAPH_API_URL=http://192.168.1.193:2024
# LANGGRAPH_API_KEY can be omitted
```

### Production
For production environments, always set the API key:
```bash
# .env.local
LANGGRAPH_API_URL=https://your-production-url
LANGGRAPH_API_KEY=your-secure-api-key
```

## Testing

Run the test script to verify the integration:

```bash
pnpm tsx test-research-api.ts
```

This will:
1. Send a test research query
2. Stream and log all events
3. Verify the data format

## Next Steps

To extend the integration:
1. Add more event types as needed
2. Implement research history/persistence
3. Add export functionality for reports
4. Integrate with existing chat interface for hybrid mode