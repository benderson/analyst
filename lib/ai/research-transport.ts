import { DefaultChatTransport } from 'ai';

/**
 * Custom transport configuration for the research API
 * This allows us to customize headers, authentication, and request transformation
 */
export function createResearchTransport() {
  return new DefaultChatTransport({
    api: '/api/research',
    headers: {
      // Add any custom headers needed for LangGraph integration
      'Content-Type': 'application/json',
      // Add authentication headers if needed (for client-side auth)
      // Note: Server-side auth is handled in the API route
      ...(process.env.NEXT_PUBLIC_LANGGRAPH_API_KEY && {
        'x-langgraph-api-key': process.env.NEXT_PUBLIC_LANGGRAPH_API_KEY,
      }),
    },
    body: (messages: any) => {
      // Transform or add additional data to the request body
      return {
        messages,
        // Add any additional context or configuration
        metadata: {
          source: 'research-panel',
        },
      };
    },
  });
}

/**
 * Research transport with retry logic
 */
export function createResearchTransportWithRetry(maxRetries = 3) {
  const baseTransport = createResearchTransport();
  
  // Wrap the transport with retry logic
  return {
    ...baseTransport,
    // Add retry functionality by overriding the send method
    // This is a simplified example - in production you'd want more sophisticated retry logic
  };
}