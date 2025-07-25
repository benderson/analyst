'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, User } from 'lucide-react';
import { ClientOnlyDate } from '@/components/client-only-date';
import type { Analyst, InterviewMessage } from '@/lib/types/research';

interface InterviewThreadsProps {
  interviews: Record<string, InterviewMessage[]>;
  analysts: Analyst[];
  className?: string;
}

export function InterviewThreads({
  interviews,
  analysts,
  className,
}: InterviewThreadsProps) {
  const [activeTab, setActiveTab] = useState<string>(
    Object.keys(interviews)[0] || ''
  );

  const getAnalystByName = (name: string) => 
    analysts.find((a) => a.name === name);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (Object.keys(interviews).length === 0) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="text-center space-y-2">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Interviews will appear here as analysts research your topic
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b px-4 pt-4">
          <h3 className="font-semibold mb-3">Expert Interviews</h3>
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
            {Object.keys(interviews).map((analystName) => {
              const analyst = getAnalystByName(analystName);
              const messageCount = interviews[analystName].length;
              
              return (
                <TabsTrigger
                  key={analystName}
                  value={analystName}
                  className="data-[state=active]:bg-primary/10 rounded-t-md px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(analystName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{analystName}</span>
                    {messageCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {messageCount}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {Object.entries(interviews).map(([analystName, messages]) => {
            const analyst = getAnalystByName(analystName);
            
            return (
              <TabsContent
                key={analystName}
                value={analystName}
                className="h-full m-0"
              >
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* Analyst Info Header */}
                    {analyst && (
                      <div className="flex items-start gap-3 pb-4 border-b">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(analystName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{analyst.name}</h4>
                          <p className="text-sm text-muted-foreground">{analyst.role}</p>
                          <p className="text-xs text-muted-foreground">{analyst.affiliation}</p>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {analyst.esgFocus}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {messages.map((message, index) => (
                      <div
                        key={`${analystName}-${index}`}
                        className={cn(
                          'flex gap-3',
                          message.role === 'user' && 'justify-end'
                        )}
                      >
                        {message.role === 'assistant' && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs">
                              {getInitials(analystName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-4 py-2',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            <ClientOnlyDate date={message.timestamp} format="time" />
                          </p>
                        </div>
                        
                        {message.role === 'user' && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    
                    {messages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Interview in progress...</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </Card>
  );
}