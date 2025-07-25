'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User2, Building2, Target } from 'lucide-react';
import type { Analyst } from '@/lib/types/research';

interface AnalystListProps {
  analysts: Analyst[];
  selectedAnalyst?: string;
  onSelectAnalyst?: (name: string) => void;
  className?: string;
}

export function AnalystList({
  analysts,
  selectedAnalyst,
  onSelectAnalyst,
  className,
}: AnalystListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {analysts.map((analyst, index) => {
        const isSelected = selectedAnalyst === analyst.name;
        const initials = analyst.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={`${analyst.name}-${index}`}
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-transparent hover:border-border hover:bg-accent/50',
              onSelectAnalyst && 'cursor-pointer'
            )}
            onClick={() => onSelectAnalyst?.(analyst.name)}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`/api/avatar/${analyst.name}`} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{analyst.name}</h4>
                
                <div className="flex items-center gap-1 mt-1">
                  <User2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {analyst.role}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {analyst.affiliation}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 mt-2">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    {analyst.esgFocus}
                  </Badge>
                </div>
                
                {analyst.esgCategories && analyst.esgCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {analyst.esgCategories.map((category) => (
                      <Badge
                        key={category}
                        variant="outline"
                        className="text-xs px-1.5 py-0"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact version for sidebars
export function AnalystListCompact({
  analysts,
  selectedAnalyst,
  onSelectAnalyst,
  className,
}: AnalystListProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {analysts.map((analyst) => {
        const isSelected = selectedAnalyst === analyst.name;
        const initials = analyst.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={analyst.name}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
              isSelected
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
            onClick={() => onSelectAnalyst?.(analyst.name)}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{analyst.name}</span>
          </div>
        );
      })}
    </div>
  );
}