import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamWriter,
  type UIDataTypes,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { v4 as generateUUID } from 'uuid';
import { ChatSDKError } from '@/lib/errors';
import type { 
  ResearchEvent, 
  ResearchState, 
  Analyst,
  InterviewMessage,
  ResearchPhase 
} from '@/lib/types/research';
import type { ResearchDataTypes } from '@/lib/types/research-stream';
import { z } from 'zod';
import { 
  convertSimpleToLangGraph, 
  extractContent,
  UIMessageSchema,
  type LangGraphMessage
} from './utils/message-converter';

// Environment configuration
const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL || 'http://192.168.1.193:2024';
const LANGGRAPH_API_KEY = process.env.LANGGRAPH_API_KEY || '';
const ASSISTANT_ID = '4e4535bf-3da8-5acb-abeb-03fa5852e7e6'; // interview_panel assistant

// Request schema - matches AI SDK v5 format
const requestSchema = z.object({
  messages: z.array(UIMessageSchema),
});

type RequestBody = z.infer<typeof requestSchema>;

export async function POST(request: Request) {
  let requestBody: RequestBody;

  try {
    const json = await request.json();
    requestBody = requestSchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const { messages } = requestBody;
  
  // Extract the latest user message as the research query
  const userMessages = messages.filter(m => m.role === 'user');
  const latestUserMessage = userMessages[userMessages.length - 1];
  if (!latestUserMessage) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
  
  // Extract content from the message (handles both simple content and parts)
  const query = extractContent(latestUserMessage);
  
  if (!query.trim()) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
  
  // Convert all messages to LangGraph format for context
  const langGraphMessages = convertSimpleToLangGraph(
    messages.map(msg => ({
      role: msg.role,
      content: extractContent(msg)
    }))
  );

  // Create thread ID for this research session (must be a valid UUID)
  const threadId = generateUUID();

  // Initialize research state
  const researchState: ResearchState = {
    topic: query,
    phase: 'initialization',
    analysts: [],
    interviews: new Map(),
    sections: new Map(),
    searches: [],
    progress: {
      current: 0,
      total: 0,
      message: 'Starting research...',
    },
  };

  // Create UI message stream using v5 API
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      try {
        // Stream initial state in v5 format
        writer.write({
          type: 'data-research-state' as const,
          data: {
            phase: researchState.phase,
            topic: researchState.topic,
          }
        });

        // Connect to LangGraph Interview Panel
        await streamFromLangGraph(
          query,
          threadId,
          writer,
          researchState,
          langGraphMessages
        );
      } catch (error) {
        console.error('Research stream error:', error);
        writer.write({
          type: 'data-error' as const,
          data: {
            error: {
              message: error instanceof Error ? error.message : 'Research failed',
              type: error instanceof Error ? error.constructor.name : 'UnknownError',
            },
          },
          transient: true
        });
      }
    },
    onError: (error) => {
      console.error('Stream error:', error);
      return 'An error occurred during the research. Please try again.';
    },
    onFinish: ({ messages }) => {
      // This callback can be used for logging or analytics
      console.log('Research completed:', {
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Return the stream as a response
  return createUIMessageStreamResponse({
    stream,
  });
}

async function streamFromLangGraph(
  query: string,
  threadId: string,
  writer: UIMessageStreamWriter,
  state: ResearchState,
  langGraphMessages: LangGraphMessage[]
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Only add API key header if it exists
  if (LANGGRAPH_API_KEY) {
    headers['x-api-key'] = LANGGRAPH_API_KEY;
  }

  // LangGraph request configuration
  const requestData = {
    assistant_id: ASSISTANT_ID,
    input: {
      messages: langGraphMessages,
      topic: query, // Pass the actual query topic
    },
    stream_mode: ['updates', 'messages', 'custom'],
    stream_subgraphs: true,
    config: {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: '',
        analyst_model: 'openai:gpt-4o',
        max_analysts: 3,
        max_concurrent_interviews: 5,
        max_num_turns: 3,
      },
      recursion_limit: 100,
      run_name: `research_${new Date().toISOString()}`,
    },
  };

  // Log the request for debugging
  console.log('LangGraph request:', {
    url: `${LANGGRAPH_API_URL}/threads/${threadId}/runs/stream`,
    threadId,
    assistant_id: ASSISTANT_ID,
    inputMessagesCount: langGraphMessages.length,
    topic: query,
  });

  // Try to create thread, but don't fail if it already exists
  let actualThreadId = threadId;
  try {
    const threadResponse = await fetch(`${LANGGRAPH_API_URL}/threads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}), // LangGraph API expects empty object for thread creation
    });

    if (threadResponse.ok) {
      const threadData = await threadResponse.json();
      actualThreadId = threadData.thread_id || threadId;
      console.log('Thread created:', { actualThreadId, providedThreadId: threadId });
    } else if (threadResponse.status === 409) {
      // Thread might already exist, continue with the provided threadId
      console.log('Thread might already exist, continuing with:', threadId);
    } else {
      const errorBody = await threadResponse.text();
      console.error('Thread creation failed:', {
        status: threadResponse.status,
        statusText: threadResponse.statusText,
        body: errorBody,
      });
      // Don't throw here, try to continue with the run
    }
  } catch (error) {
    console.error('Error creating thread:', error);
    // Continue with the provided threadId
  }

  // Adjust request to use if_not_exists to create thread if needed
  const runRequest = {
    ...requestData,
    if_not_exists: 'create' as const, // Create thread if it doesn't exist
  };

  console.log('Starting run with request:', JSON.stringify(runRequest, null, 2));

  // Stream the run with extended timeout for long-running operations
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
  
  const response = await fetch(
    `${LANGGRAPH_API_URL}/threads/${actualThreadId}/runs/stream`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(runRequest),
      signal: controller.signal,
      // @ts-ignore - Next.js specific options
      cache: 'no-store',
    }
  );
  
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Research stream failed:', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      requestData: JSON.stringify(runRequest, null, 2),
    });
    throw new Error(`Failed to start research: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let lastActivityTime = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            await processLangGraphEvent(data, writer, state);
            lastActivityTime = Date.now();
          } catch (e) {
            console.error('Failed to parse event:', e);
          }
        }
      }
      
      // Check for stalled stream with better diagnostics
      const timeSinceLastActivity = Date.now() - lastActivityTime;
      if (timeSinceLastActivity > 30000) { // 30 seconds
        console.warn('Stream appears stalled, no activity for 30s', {
          lastActivityTime: new Date(lastActivityTime).toISOString(),
          currentTime: new Date().toISOString(),
          buffer: buffer.substring(0, 100), // Show first 100 chars of buffer
          statePhase: state.phase,
          analystsCount: state.analysts.length,
          interviewsCount: state.interviews.size
        });
        // Don't break, let the stream continue
      }
    }
  } catch (error) {
    console.error('Stream reading error:', error);
    // Re-throw to trigger error handling
    throw error;
  } finally {
    reader.releaseLock();
  }

  // Send final state with all accumulated data in v5 format
  writer.write({
    type: 'data-research-complete' as const,
    data: {
      phase: 'completed' as ResearchPhase,
      analysts: state.analysts,
      interviews: Object.fromEntries(state.interviews),
      sections: Object.fromEntries(state.sections),
      searches: state.searches,
    }
  });
}

async function processLangGraphEvent(
  event: any,
  writer: UIMessageStreamWriter,
  state: ResearchState
) {
  // Log the event type for debugging
  console.log('Processing LangGraph event:', {
    type: event.type,
    isArray: Array.isArray(event),
    namespace: event.ns,
    keys: event.type === 'updates' ? Object.keys(event.data || {}) : undefined
  });

  // Track processed analyst names to avoid duplicates
  const processedAnalystNames = new Set(state.analysts.map(a => a.name));
  
  // Handle v4 format: custom events from AI SDK emitter (arrays)
  // This is what we receive from the CompatibleEventEmitter when emit_v4=true
  if (Array.isArray(event)) {
    // Process all arrays, even empty ones - they might be valid state updates
    for (const item of event) {
      // Skip if this is a duplicate analyst
      if (item.type === 'analyst' && processedAnalystNames.has(item.data?.name)) {
        continue;
      }
      
      // Convert v4 events to v5 format for the frontend
      await processResearchEvent(item, writer, state);
    }
    return;
  }

  // Handle v5 format: data-* events (individual events from CompatibleEventEmitter when emit_v5=true)
  if (typeof event === 'object' && event.type?.startsWith('data-')) {
    // Skip duplicate analysts in v5 format too
    if (event.type === 'data-analyst' && event.data?.name && processedAnalystNames.has(event.data.name)) {
      return;
    }
    
    // Handle keep-alive heartbeats
    if (event.type === 'data-heartbeat') {
      // Don't forward heartbeats to the client, they're just for keeping the connection alive
      console.log('Heartbeat:', event.data?.timestamp);
      return;
    }
    
    await processV5DataPart(event, writer, state);
    return;
  }

  // Handle state updates
  if (event.type === 'updates') {
    // Process state changes
    // This is where we might extract analysts, sections, etc.
    return;
  }

  // Handle messages (LLM tokens)
  if (event.type === 'messages' || event.type === 'messages/partial') {
    // For now, we'll accumulate these for the final report
    // In a future iteration, we might stream these directly
    return;
  }

  // Handle custom events from subgraphs
  if (event.type === 'custom' && event.data) {
    // Custom events can be arrays of events from subgraphs
    if (Array.isArray(event.data)) {
      for (const item of event.data) {
        // Skip duplicate analysts
        if (item.type === 'analyst' && processedAnalystNames.has(item.data?.name)) {
          continue;
        }
        await processResearchEvent(item, writer, state);
      }
    }
    return;
  }
  
  // Handle v5 wire protocol format (raw strings)
  if (typeof event === 'string') {
    // V5 protocol format: "type:content\n" or "type:name[data]\n"
    const trimmed = event.trim();
    
    // Text delta: "0:text content"
    if (trimmed.startsWith('0:')) {
      const text = trimmed.substring(2);
      writer.write({
        type: 'text-delta' as const,
        delta: text,
        id: 'research-text'
      });
      return;
    }
    
    // Data part: "2:name[{json}]"
    if (trimmed.startsWith('2:')) {
      const match = trimmed.match(/^2:([^[]+)\[(.+)\]$/);
      if (match) {
        const [, partName, jsonData] = match;
        try {
          const data = JSON.parse(jsonData);
          await processV5DataPart({
            type: `data-${partName}`,
            data
          }, writer, state);
        } catch (e) {
          console.error('Failed to parse v5 data part:', e);
        }
      }
      return;
    }
    
    // Error: "3:{error json}"
    if (trimmed.startsWith('3:')) {
      try {
        const errorData = JSON.parse(trimmed.substring(2));
        writer.write({
          type: 'data-error' as const,
          data: { error: errorData },
          transient: true
        });
      } catch (e) {
        console.error('Failed to parse v5 error:', e);
      }
      return;
    }
  }
  
  // Handle v5 text-start/delta/end events
  if (typeof event === 'object' && event.type) {
    switch (event.type) {
      case 'text-start': {
        // Text streaming started with an ID
        // We can track this if needed for proper text assembly
        console.log('Text stream started:', event.id);
        return;
      }
      
      case 'text-delta': {
        // Stream text delta to the UI
        if (event.delta) {
          writer.write({
            type: 'text-delta' as const,
            delta: event.delta,
            id: event.id || 'research-text'
          });
        }
        return;
      }
      
      case 'text-end': {
        // Text streaming completed
        console.log('Text stream ended:', event.id);
        return;
      }
    }
  }
}

async function processResearchEvent(
  event: ResearchEvent,
  writer: UIMessageStreamWriter,
  state: ResearchState
) {
  switch (event.type) {
    case 'analyst': {
      const analyst: Analyst = {
        name: event.data.name,
        role: event.data.role,
        affiliation: event.data.affiliation,
        esgFocus: event.data.esgFocus,
        esgCategories: event.data.esgCategories,
      };
      
      // Check if analyst already exists by name
      const existingIndex = state.analysts.findIndex(a => a.name === analyst.name);
      if (existingIndex >= 0) {
        // Update existing analyst
        state.analysts[existingIndex] = analyst;
      } else {
        // Add new analyst
        state.analysts.push(analyst);
      }
      
      // Stream analyst as persistent data in v5 format
      writer.write({
        type: 'data-analysts' as const,
        data: {
          analysts: state.analysts,
        }
      });
      break;
    }

    case 'progress': {
      state.progress = {
        current: event.current || state.progress.current,
        total: event.total || state.progress.total,
        message: event.message,
      };
      
      if (event.phase) {
        state.phase = event.phase;
      }

      // Stream progress as transient data in v5 format
      writer.write({
        type: 'data-progress' as const,
        data: {
          progress: state.progress,
          phase: state.phase,
        },
        transient: true
      });
      break;
    }

    case 'interview': {
      const { analystName, status, messagePreview, turnNumber } = event.data;
      const metadata = event.metadata || {};
      
      // Emit transient interview update in v5 format
      writer.write({
        type: 'data-interview' as const,
        data: {
          analystName,
          status,
          turnNumber,
          messagePreview,
          timestamp: new Date().toISOString(),
          metadata,
        },
        transient: true
      });
      
      // Initialize interview messages if needed
      if (!state.interviews.has(analystName)) {
        state.interviews.set(analystName, []);
      }

      // Add message preview if available
      if (messagePreview && analystName) {
        const messages = state.interviews.get(analystName)!;
        // Determine role based on metadata or status
        const role = metadata.role || 
          (status === 'questioning' ? 'user' : 
           status === 'answering' ? 'assistant' : 'assistant');
        
        // Check if this message already exists (avoid duplicates)
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.content !== messagePreview) {
          messages.push({
            analystName,
            role: role as 'user' | 'assistant',
            content: messagePreview,
            timestamp: new Date().toISOString(),
          });
          
          // Stream updated interviews as persistent data in v5 format
          writer.write({
            type: 'data-interviews' as const,
            data: {
              interviews: Object.fromEntries(state.interviews),
            }
          });
        }
      }
      break;
    }

    case 'search': {
      if (event.data.status === 'completed' && event.data.resultsCount) {
        state.searches.push({
          tool: event.data.tool as any,
          query: event.data.query,
          resultsCount: event.data.resultsCount,
          sources: [],
        });
      }
      break;
    }

    case 'section': {
      const { analystName, contentPreview } = event.data;
      
      // Store section preview
      state.sections.set(analystName, contentPreview);
      
      // Stream sections update as persistent data in v5 format
      writer.write({
        type: 'data-sections' as const,
        data: {
          sections: Object.fromEntries(state.sections),
        }
      });
      break;
    }

    case 'error': {
      state.error = {
        message: event.data.error,
        type: event.data.errorType,
      };
      
      // Stream error as transient data in v5 format
      writer.write({
        type: 'data-error' as const,
        data: {
          error: state.error,
        },
        transient: true
      });
      break;
    }

    case 'metadata': {
      // Handle any metadata updates
      break;
    }
  }
}

async function processV5DataPart(
  event: any,
  writer: UIMessageStreamWriter,
  state: ResearchState
) {
  const { type, data, id, transient } = event;
  const eventType = type.replace('data-', ''); // Remove 'data-' prefix

  switch (eventType) {
    case 'analyst': {
      const analyst: Analyst = {
        name: data.name,
        role: data.role,
        affiliation: data.affiliation,
        esgFocus: data.esgFocus,
        esgCategories: data.esgCategories,
      };
      
      // Check if analyst already exists by name to avoid duplicates
      const existingIndex = state.analysts.findIndex(a => a.name === analyst.name);
      if (existingIndex >= 0) {
        // Update existing analyst
        state.analysts[existingIndex] = analyst;
      } else {
        // Add new analyst
        state.analysts.push(analyst);
      }
      
      // Stream as persistent data (not transient) in v5 format
      if (!transient) {
        writer.write({
          type: 'data-analysts' as const,
          data: {
            analysts: state.analysts,
          }
        });
      }
      break;
    }

    case 'progress': {
      // Progress is transient - send through onData callback
      if (transient) {
        writer.write({
          type: 'data-progress' as const,
          data: data,
          transient: true
        });
      }
      
      // Update local state
      state.progress = {
        current: data.current || state.progress.current,
        total: data.total || state.progress.total,
        message: data.message,
      };
      
      if (data.phase) {
        state.phase = data.phase;
      }
      break;
    }

    case 'interview': {
      // Handle interview updates
      const { analystName, status, messagePreview } = data;
      
      // Initialize interview messages if needed
      if (!state.interviews.has(analystName)) {
        state.interviews.set(analystName, []);
      }
      
      // Add message if we have content
      if (messagePreview) {
        const messages = state.interviews.get(analystName)!;
        const role = data.metadata?.role || 
          (status === 'questioning' ? 'user' : 'assistant');
        
        // Avoid duplicates
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.content !== messagePreview) {
          messages.push({
            analystName,
            role: role as 'user' | 'assistant',
            content: messagePreview,
            timestamp: data.timestamp || new Date().toISOString(),
          });
          
          // Stream updated interviews in v5 format
          writer.write({
            type: 'data-interviews' as const,
            data: {
              interviews: Object.fromEntries(state.interviews),
            }
          });
        }
      }
      
      // Don't emit again if already emitted above
      break;
    }

    case 'search': {
      // Search updates are transient
      if (transient) {
        writer.write({
          type: 'data-search' as const,
          data: data,
          transient: true
        });
      }
      break;
    }

    case 'section': {
      const { analystName, contentPreview } = data;
      
      // Update or add section (ID-based reconciliation)
      if (id) {
        state.sections.set(analystName, contentPreview);
      }
      
      // Stream as persistent data in v5 format
      if (!transient) {
        writer.write({
          type: 'data-sections' as const,
          data: {
            sections: Object.fromEntries(state.sections),
          }
        });
      }
      break;
    }

    case 'error': {
      // Errors are transient
      if (transient) {
        writer.write({
          type: 'data-error' as const,
          data: data,
          transient: true
        });
      }
      
      state.error = {
        message: data.error,
        type: data.errorType,
      };
      break;
    }

    case 'metadata': {
      // Metadata is transient
      if (transient) {
        writer.write({
          type: 'data-metadata' as const,
          data: data,
          transient: true
        });
      }
      break;
    }
  }
}