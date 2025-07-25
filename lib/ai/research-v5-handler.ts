import type { UIMessage } from 'ai';
import type { Analyst, InterviewMessage, ResearchDataStreamData } from '@/lib/types/research';

/**
 * Processes v5 messages and extracts interview content
 * According to v5 docs, messages contain the actual streamed content
 */
export function extractInterviewsFromMessages(
  messages: UIMessage[],
  analysts: Analyst[]
): Record<string, InterviewMessage[]> {
  const interviews: Record<string, InterviewMessage[]> = {};
  
  // Initialize empty arrays for each analyst
  analysts.forEach(analyst => {
    interviews[analyst.name] = [];
  });
  
  // Track current context from metadata
  let currentAnalyst: string | null = null;
  let currentRole: 'user' | 'assistant' = 'assistant';
  
  messages.forEach((message) => {
    // Skip non-assistant messages (user input)
    if (message.role !== 'assistant') return;
    
    // Check if message has interview metadata in metadata field
    const metadata = message.metadata as any;
    if (metadata?.analystName) {
      currentAnalyst = metadata.analystName;
      currentRole = metadata.role || 'assistant';
    }
    
    // Extract content from message parts (v5 structure)
    if (message.parts && currentAnalyst && interviews[currentAnalyst]) {
      // Look for text parts in the message
      const textParts = message.parts.filter((part: any) => part.type === 'text');
      const content = textParts.map((part: any) => part.text).join('');
      
      if (content) {
        interviews[currentAnalyst].push({
          analystName: currentAnalyst,
          role: currentRole,
          content: content,
          timestamp: new Date().toISOString(),
        });
      }
    }
  });
  
  return interviews;
}

/**
 * Handles v5 data parts for research state updates
 * In v5, data parts are for metadata and UI state, not content
 */
export function handleResearchDataPart(
  dataPart: any,
  setResearchData: React.Dispatch<React.SetStateAction<ResearchDataStreamData>>
) {
  // Handle different data part types
  if (!dataPart.data) return;
  
  const data = dataPart.data;
  
  switch (data.type) {
    case 'research-state':
      setResearchData(prev => ({
        ...prev,
        phase: data.phase,
        topic: data.topic,
      }));
      break;
      
    case 'analysts':
      setResearchData(prev => ({
        ...prev,
        analysts: data.analysts || []
      }));
      break;
      
    case 'sections':
      setResearchData(prev => ({
        ...prev,
        sections: data.sections || {}
      }));
      break;
      
    case 'progress':
      setResearchData(prev => ({
        ...prev,
        progress: {
          message: data.message,
          current: data.current || 0,
          total: data.total || 0,
        },
        phase: data.phase || prev.phase
      }));
      break;
      
    case 'error':
      setResearchData(prev => ({
        ...prev,
        error: {
          message: data.error,
          type: data.errorType || 'Error'
        }
      }));
      break;
      
    case 'research-complete':
      setResearchData(prev => ({
        ...prev,
        phase: 'completed',
        ...data
      }));
      break;
  }
}