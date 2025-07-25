export interface Analyst {
  name: string;
  role: string;
  affiliation: string;
  esgFocus: string;
  esgCategories?: string[];
}

export interface InterviewMessage {
  analystName: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SearchResult {
  tool: 'web_search' | 'wikipedia_search';
  query: string;
  resultsCount: number;
  sources: string[];
}

export type ResearchEventType = 
  | 'analyst' 
  | 'progress' 
  | 'interview' 
  | 'search' 
  | 'section' 
  | 'error' 
  | 'metadata';

export type InterviewStatus = 
  | 'started' 
  | 'questioning' 
  | 'searching' 
  | 'answering' 
  | 'completed';

export type SearchStatus = 
  | 'started' 
  | 'completed' 
  | 'error';

export type ResearchPhase = 
  | 'initialization'
  | 'topic_extraction'
  | 'research_brief'
  | 'analysts'
  | 'interviews'
  | 'report'
  | 'completed';

// Event data structures matching AI SDK emitter output
export interface AnalystEvent {
  type: 'analyst';
  data: {
    name: string;
    role: string;
    affiliation: string;
    esgFocus: string;
    esgCategories?: string[];
  };
  metadata?: {
    index?: number;
    total?: number;
  };
}

export interface ProgressEvent {
  type: 'progress';
  message: string;
  phase?: ResearchPhase;
  current?: number;
  total?: number;
  metadata?: Record<string, any>;
}

export interface InterviewEvent {
  type: 'interview';
  data: {
    analystName: string;
    status: InterviewStatus;
    turnNumber?: number;
    messagePreview?: string;
  };
  metadata?: {
    subgraphId?: string;
    role?: 'user' | 'assistant';
  };
}

export interface SearchEvent {
  type: 'search';
  data: {
    tool: string;
    query: string;
    status: SearchStatus;
    resultsCount?: number;
    error?: string;
  };
  metadata?: Record<string, any>;
}

export interface SectionEvent {
  type: 'section';
  data: {
    analystName: string;
    contentPreview: string;
    wordCount: number;
    sourcesCount: number;
  };
  metadata?: Record<string, any>;
}

export interface ErrorEvent {
  type: 'error';
  data: {
    error: string;
    errorType: string;
    timestamp: string;
    context?: Record<string, any>;
  };
}

export interface MetadataEvent {
  type: 'metadata';
  data: Record<string, any>;
}

export type ResearchEvent = 
  | AnalystEvent 
  | ProgressEvent 
  | InterviewEvent 
  | SearchEvent 
  | SectionEvent 
  | ErrorEvent 
  | MetadataEvent;

// State for tracking research progress
export interface ResearchState {
  topic: string;
  phase: ResearchPhase;
  analysts: Analyst[];
  interviews: Map<string, InterviewMessage[]>;
  sections: Map<string, string>;
  searches: SearchResult[];
  progress: {
    current: number;
    total: number;
    message: string;
  };
  error?: {
    message: string;
    type: string;
  };
}

// Data stream data types for AI SDK v5
export interface ResearchDataStreamData {
  topic?: string;
  analysts?: Analyst[];
  interviews?: Record<string, InterviewMessage[]>;
  sections?: Record<string, string>;
  searches?: SearchResult[];
  progress?: ResearchState['progress'];
  phase?: ResearchPhase;
  error?: ResearchState['error'];
}