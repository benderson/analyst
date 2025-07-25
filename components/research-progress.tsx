'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Search,
  Users,
  MessageSquare,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { ResearchPhase, ResearchState } from '@/lib/types/research';

interface ResearchProgressProps {
  phase: ResearchPhase;
  progress?: ResearchState['progress'];
  error?: ResearchState['error'];
  className?: string;
}

const PHASE_INFO: Record<ResearchPhase, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  initialization: {
    label: 'Initializing',
    icon: Sparkles,
    description: 'Setting up research environment',
  },
  topic_extraction: {
    label: 'Topic Analysis',
    icon: Search,
    description: 'Analyzing research topic',
  },
  research_brief: {
    label: 'Research Brief',
    icon: FileText,
    description: 'Creating research brief',
  },
  analysts: {
    label: 'Expert Panel',
    icon: Users,
    description: 'Assembling expert analysts',
  },
  interviews: {
    label: 'Interviews',
    icon: MessageSquare,
    description: 'Conducting expert interviews',
  },
  report: {
    label: 'Report Generation',
    icon: FileText,
    description: 'Compiling final report',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    description: 'Research complete',
  },
};

const PHASE_ORDER: ResearchPhase[] = [
  'initialization',
  'topic_extraction',
  'research_brief',
  'analysts',
  'interviews',
  'report',
  'completed',
];

export function ResearchProgress({
  phase,
  progress,
  error,
  className,
}: ResearchProgressProps) {
  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);
  const progressPercentage = progress?.total
    ? (progress.current / progress.total) * 100
    : (currentPhaseIndex / (PHASE_ORDER.length - 1)) * 100;

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="font-semibold mb-4">Research Progress</h3>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message}
            {error.type && (
              <span className="text-xs block mt-1">Error: {error.type}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Progress Bar */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        {progress?.message && (
          <p className="text-xs text-muted-foreground">{progress.message}</p>
        )}
      </div>

      {/* Phase Steps */}
      <div className="space-y-3">
        {PHASE_ORDER.map((phaseKey, index) => {
          const phaseInfo = PHASE_INFO[phaseKey];
          const Icon = phaseInfo.icon;
          const isCompleted = index < currentPhaseIndex;
          const isCurrent = index === currentPhaseIndex;
          const isPending = index > currentPhaseIndex;

          return (
            <div
              key={phaseKey}
              className={cn(
                'flex items-start gap-3 transition-opacity',
                isPending && 'opacity-50'
              )}
            >
              <div className="mt-0.5">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCurrent && 'text-primary',
                      isCompleted && 'text-green-600'
                    )}
                  >
                    {phaseInfo.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {phaseInfo.description}
                </p>
                
                {/* Sub-progress for current phase */}
                {isCurrent && progress?.current !== undefined && progress?.total && (
                  <div className="mt-2">
                    <Progress
                      value={(progress.current / progress.total) * 100}
                      className="h-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress.current} of {progress.total} steps
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}