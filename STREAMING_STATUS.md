# Interview Streaming Status

## Current Implementation

### Backend (LangGraph)
- **Emitter**: `ai_sdk_emitter_compatible.py` supports both v4 and v5 formats
- **Interview Events**: Emitted with `status="questioning"` for questions and `status="answering"` for answers
- **Message Content**: Sent via `message_preview` field in interview events

### API Route (`route.ts`)
- **Event Processing**: Handles both v4 arrays and v5 individual events
- **Interview Accumulation**: Both `processResearchEvent` and `processV5DataPart` properly accumulate interview messages
- **Data Format**: Using v4 format (arrays) for compatibility with current frontend

### Frontend Components
- **research-panel.tsx**: 
  - Handles `data-interviews` events to update interview state
  - Also processes `data-interview` events for transient updates
  - Properly imports InterviewMessage type
  
- **interview-threads.tsx**:
  - Displays accumulated interview messages
  - Shows tabs for each analyst
  - Renders messages with proper role-based styling

## Event Flow

1. Backend emits interview update with `message_preview`
2. Route.ts processes the event and accumulates messages in state
3. Route.ts emits `data-interviews` with full interviews object
4. Frontend receives and updates the interviews state
5. InterviewThreads component renders the messages

## Key Points

- Interview messages ARE being accumulated in the route
- The frontend IS receiving the accumulated interviews via `data-interviews` events
- The issue was that the route was only processing messages with `status === 'answering'`, now fixed to handle both questions and answers

## Testing

To verify interview streaming:
1. Start the frontend: `cd analyst && npm run dev`
2. Start LangGraph: `cd .. && uv run langgraph dev`
3. Open http://localhost:3000/research
4. Enter a query and watch the interview messages appear

## V5 Migration Notes

Currently using v4 format for data events (arrays). To migrate to v5:
1. Update route.ts to use v5 format for writer.write
2. Update research-panel.tsx onData handler to expect v5 format
3. Consider using the v5 smooth streaming features for text content