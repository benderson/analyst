import { z } from 'zod';

// AI SDK v5 message types
export const UIMessagePartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('file'),
    fileId: z.string(),
    mimeType: z.string(),
    data: z.string(),
  }),
  z.object({
    type: z.literal('reasoning'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('tool-call'),
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.any(),
  }),
  z.object({
    type: z.literal('tool-result'),
    toolCallId: z.string(),
    result: z.any(),
  }),
]);

export const UIMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().optional(), // For backward compatibility
  parts: z.array(UIMessagePartSchema).optional(),
  metadata: z.record(z.any()).optional(),
});

export type UIMessage = z.infer<typeof UIMessageSchema>;
export type UIMessagePart = z.infer<typeof UIMessagePartSchema>;

// LangGraph message types
export interface LangGraphMessage {
  type: 'human' | 'ai' | 'system';
  content: string;
  id?: string;
  name?: string;
  additional_kwargs?: Record<string, any>;
}

/**
 * Convert AI SDK v5 messages to LangGraph format
 */
export function convertToLangGraphMessages(messages: UIMessage[]): LangGraphMessage[] {
  return messages.map(message => {
    // Map roles: user -> human, assistant -> ai, system -> system
    const type = message.role === 'user' ? 'human' : 
                 message.role === 'assistant' ? 'ai' : 
                 'system';

    // Extract content from parts or use direct content
    let content = message.content || '';
    let additional_kwargs: Record<string, any> = {};

    if (message.parts && message.parts.length > 0) {
      // Combine text parts
      const textParts = message.parts
        .filter(part => part.type === 'text' || part.type === 'reasoning')
        .map(part => {
          if (part.type === 'text') return part.text;
          if (part.type === 'reasoning') return `[Reasoning] ${part.text}`;
          return '';
        })
        .filter(text => text.length > 0);

      if (textParts.length > 0) {
        content = textParts.join('\n\n');
      }

      // Handle file attachments
      const fileParts = message.parts.filter(part => part.type === 'file');
      if (fileParts.length > 0) {
        additional_kwargs.attachments = fileParts.map(part => ({
          fileId: part.fileId,
          mimeType: part.mimeType,
          data: part.data,
        }));
      }

      // Handle tool calls
      const toolCalls = message.parts.filter(part => part.type === 'tool-call');
      if (toolCalls.length > 0) {
        additional_kwargs.tool_calls = toolCalls.map(part => ({
          id: part.toolCallId,
          name: part.toolName,
          args: part.args,
        }));
      }

      // Handle tool results
      const toolResults = message.parts.filter(part => part.type === 'tool-result');
      if (toolResults.length > 0) {
        additional_kwargs.tool_results = toolResults.map(part => ({
          tool_call_id: part.toolCallId,
          result: part.result,
        }));
      }
    }

    const lgMessage: LangGraphMessage = {
      type,
      content,
    };

    if (message.id) {
      lgMessage.id = message.id;
    }

    if (Object.keys(additional_kwargs).length > 0) {
      lgMessage.additional_kwargs = additional_kwargs;
    }

    if (message.metadata) {
      lgMessage.additional_kwargs = {
        ...lgMessage.additional_kwargs,
        metadata: message.metadata,
      };
    }

    return lgMessage;
  });
}

/**
 * Convert LangGraph messages to AI SDK v5 format
 */
export function convertFromLangGraphMessages(lgMessages: LangGraphMessage[]): UIMessage[] {
  return lgMessages.map(lgMsg => {
    // Map types: human -> user, ai -> assistant, system -> system
    const role = lgMsg.type === 'human' ? 'user' : 
                 lgMsg.type === 'ai' ? 'assistant' : 
                 'system';

    const parts: UIMessagePart[] = [];

    // Add text content as a text part
    if (lgMsg.content) {
      parts.push({
        type: 'text',
        text: lgMsg.content,
      });
    }

    // Process additional_kwargs for attachments, tool calls, etc.
    if (lgMsg.additional_kwargs) {
      // Handle attachments
      if (lgMsg.additional_kwargs.attachments) {
        for (const attachment of lgMsg.additional_kwargs.attachments) {
          parts.push({
            type: 'file',
            fileId: attachment.fileId,
            mimeType: attachment.mimeType,
            data: attachment.data,
          });
        }
      }

      // Handle tool calls
      if (lgMsg.additional_kwargs.tool_calls) {
        for (const toolCall of lgMsg.additional_kwargs.tool_calls) {
          parts.push({
            type: 'tool-call',
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            args: toolCall.args,
          });
        }
      }

      // Handle tool results
      if (lgMsg.additional_kwargs.tool_results) {
        for (const toolResult of lgMsg.additional_kwargs.tool_results) {
          parts.push({
            type: 'tool-result',
            toolCallId: toolResult.tool_call_id,
            result: toolResult.result,
          });
        }
      }
    }

    const uiMessage: UIMessage = {
      role,
      content: lgMsg.content,
    };

    if (lgMsg.id) {
      uiMessage.id = lgMsg.id;
    }

    if (parts.length > 0) {
      uiMessage.parts = parts;
    }

    // Extract metadata from additional_kwargs if present
    if (lgMsg.additional_kwargs?.metadata) {
      uiMessage.metadata = lgMsg.additional_kwargs.metadata;
    }

    return uiMessage;
  });
}

/**
 * Extract just the content for simple text-based conversion
 */
export function extractContent(message: UIMessage): string {
  if (message.content) {
    return message.content;
  }

  if (message.parts) {
    return message.parts
      .filter(part => part.type === 'text' || part.type === 'reasoning')
      .map(part => {
        if (part.type === 'text') return part.text;
        if (part.type === 'reasoning') return part.text;
        return '';
      })
      .filter(text => text.length > 0)
      .join('\n\n');
  }

  return '';
}

/**
 * Convert a simple v5 message format (just role and content) to LangGraph
 */
export function convertSimpleToLangGraph(messages: Array<{ role: string; content: string }>): LangGraphMessage[] {
  return messages.map(msg => ({
    type: msg.role === 'user' ? 'human' : msg.role === 'assistant' ? 'ai' : 'system',
    content: msg.content,
  }));
}