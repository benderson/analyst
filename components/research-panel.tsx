'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { AnalystList } from '@/components/analyst-list';
import { InterviewThreads } from '@/components/interview-threads';
import { ResearchProgress } from '@/components/research-progress';
import { createResearchTransport } from '@/lib/ai/research-transport';
import type { ResearchDataStreamData, InterviewMessage, ResearchPhase } from '@/lib/types/research';

// Import proper types from research-stream
import type { ResearchDataTypes as ImportedResearchDataTypes } from '@/lib/types/research-stream';

interface ResearchPanelProps {
  className?: string;
}

export function ResearchPanel({ className }: ResearchPanelProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // State for accumulated research data
  const [researchData, setResearchData] = useState<ResearchDataStreamData>({
    phase: 'initialization',
    analysts: [],
    interviews: {},
    sections: {},
    searches: [],
  });
  
  // State for transient data (v5 support)
  const [transientProgress, setTransientProgress] = useState<{
    message: string;
    current: number;
    total: number;
  } | null>(null);
  
  const [transientInterviews, setTransientInterviews] = useState<Map<string, {
    status: string;
    turnNumber?: number;
    messagePreview?: string;
  }>>(new Map());
  
  const {
    messages,
    status,
    error: chatError,
    sendMessage,
    stop,
  } = useChat({
    transport: createResearchTransport(),
    onError: (error) => {
      console.error('Research error:', error);
      setError(error.message || 'An error occurred during research');
    },
    onFinish: ({ message }) => {
      console.log('Research completed:', {
        messageId: message.id,
      });
      // Could persist research results here
    },
    onData: (dataPart: any) => {
      // Handle v5 data parts with proper typing
      // The transient property may not be present on all data parts
      // We'll treat missing transient property as false (persistent data)
      
      const isTransient = dataPart.transient === true;
      
      if (dataPart.type === 'data-research-state' && dataPart.data) {
        const data = dataPart.data as ImportedResearchDataTypes['research-state'];
        setResearchData(prev => ({
          ...prev,
          phase: data.phase,
          ...(data.topic && { topic: data.topic })
        }));
      } else if (dataPart.type === 'data-analysts' && !isTransient) {
        // Only update if not transient (persistent data)
        const data = dataPart.data as ImportedResearchDataTypes['analysts'];
        if (data.analysts) {
          setResearchData(prev => ({
            ...prev,
            analysts: data.analysts
          }));
        }
      } else if (dataPart.type === 'data-sections' && !isTransient) {
        // Only update if not transient (persistent data)
        const data = dataPart.data as ImportedResearchDataTypes['sections'];
        if (data.sections) {
          setResearchData(prev => ({
            ...prev,
            sections: data.sections
          }));
        }
      } else if (dataPart.type === 'data-interviews' && !isTransient) {
        // Only update if not transient (persistent data)
        const data = dataPart.data as ImportedResearchDataTypes['interviews'];
        if (data.interviews) {
          setResearchData(prev => ({
            ...prev,
            interviews: data.interviews
          }));
        }
      } else if (dataPart.type === 'data-progress' && isTransient) {
        // Handle transient progress updates
        const data = dataPart.data as ImportedResearchDataTypes['progress'];
        if (data.progress) {
          setTransientProgress(data.progress);
        }
        if (data.phase) {
          setResearchData(prev => ({
            ...prev,
            phase: data.phase
          }));
        }
      } else if (dataPart.type === 'data-interview' && isTransient) {
        // Handle transient interview updates (for UI feedback)
        const data = dataPart.data as ImportedResearchDataTypes['interview'];
        setTransientInterviews(prev => {
          const updated = new Map(prev);
          updated.set(data.analystName, {
            status: data.status,
            turnNumber: data.turnNumber,
            messagePreview: data.messagePreview,
          });
          return updated;
        });
      } else if (dataPart.type === 'data-search' && isTransient) {
        // Handle transient search events
        const data = dataPart.data as ImportedResearchDataTypes['search'];
        // Could show search progress in UI if needed
        console.log('Search event:', data);
      } else if (dataPart.type === 'data-searches' && !isTransient) {
        // Handle accumulated search results (persistent)
        const data = dataPart.data as ImportedResearchDataTypes['searches'];
        if (data.searches) {
          setResearchData(prev => ({
            ...prev,
            searches: data.searches
          }));
        }
      } else if (dataPart.type === 'data-error' && isTransient) {
        // Handle transient error events
        const data = dataPart.data as ImportedResearchDataTypes['error'];
        if (data.error) {
          const errorMessage = data.error.message;
          setError(errorMessage);
          // Don't persist transient errors to research data
        }
      } else if (dataPart.type === 'data-research-complete' && dataPart.data) {
        const data = dataPart.data as ImportedResearchDataTypes['research-complete'];
        setResearchData(prev => ({
          ...prev,
          ...data,
          phase: 'completed'
        }));
      }
    },
  });

  const isLoading = status === 'streaming';
  const hasStarted = messages.length > 0 || isLoading;
  
  // Merge transient progress with persisted data
  const currentProgress = transientProgress || researchData?.progress;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    // Clear any previous errors
    setError(null);

    // Send research query
    sendMessage({
      role: 'user' as const,
      parts: [{ type: 'text', text: query }],
    });
    
    setQuery('');
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search Input */}
      <div className="p-4 border-b">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a company or topic to research..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Research
              </>
            )}
          </Button>
          {isLoading && (
            <Button variant="outline" onClick={stop}>
              Stop
            </Button>
          )}
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-4 pt-2">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Research Content */}
      {hasStarted ? (
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
          {/* Left Column - Progress & Analysts */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            <ResearchProgress
              phase={researchData?.phase || 'initialization'}
              progress={currentProgress}
              error={researchData?.error || (error ? { message: error, type: 'Error' } : undefined)}
            />
            
            {researchData?.analysts && researchData.analysts.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Research Panel</h3>
                <AnalystList analysts={researchData.analysts} />
              </Card>
            )}
          </div>

          {/* Center Column - Interviews */}
          <div className="col-span-6 overflow-y-auto">
            {researchData?.interviews && (
              <InterviewThreads
                interviews={researchData.interviews}
                analysts={researchData.analysts || []}
              />
            )}
          </div>

          {/* Right Column - Sections/Report */}
          <div className="col-span-3 overflow-y-auto">
            {researchData?.sections && Object.keys(researchData.sections).length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Report Sections</h3>
                <div className="space-y-2">
                  {Object.entries(researchData.sections).map(([analyst, preview]) => (
                    <div key={analyst} className="pb-2 border-b last:border-0">
                      <p className="text-sm font-medium">{analyst}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {preview}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-semibold">Research Assistant</h2>
            <p className="text-muted-foreground">
              Enter a company name or topic to generate a comprehensive ESG controversy research report
              with insights from multiple expert analysts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}