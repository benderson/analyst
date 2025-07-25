/**
 * Type definitions for research streaming data
 * These types extend the AI SDK v5 UIDataTypes
 */

import type { Analyst, InterviewMessage, ResearchPhase, SearchResult } from './research';

// Define our custom data types for the AI SDK
export interface ResearchDataTypes {
  'research-state': {
    phase: ResearchPhase;
    topic: string;
  };
  'analysts': {
    analysts: Analyst[];
  };
  'interviews': {
    interviews: Record<string, InterviewMessage[]>;
  };
  'sections': {
    sections: Record<string, string>;
  };
  'searches': {
    searches: SearchResult[];
  };
  'progress': {
    progress?: {
      current: number;
      total: number;
      message: string;
    };
    phase?: ResearchPhase;
    message?: string;
    current?: number;
    total?: number;
  };
  'interview': {
    analystName: string;
    status: string;
    turnNumber?: number;
    messagePreview?: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  };
  'search': {
    tool: string;
    query: string;
    status: string;
    resultsCount?: number;
    error?: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  };
  'section': {
    analystName: string;
    contentPreview: string;
    wordCount: number;
    sourcesCount: number;
    timestamp?: string;
    metadata?: Record<string, any>;
  };
  'error': {
    error: {
      message: string;
      type: string;
    };
  };
  'metadata': any;
  'research-complete': {
    phase: ResearchPhase;
    analysts: Analyst[];
    interviews: Record<string, InterviewMessage[]>;
    sections: Record<string, string>;
    searches: SearchResult[];
  };
}

// Helper type for creating properly typed data events
export type ResearchDataEvent<K extends keyof ResearchDataTypes> = {
  type: `data-${K}`;
  data: ResearchDataTypes[K][];
  transient?: boolean;
  id?: string;
};