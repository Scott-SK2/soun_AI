import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, GraduationCap, History, Lightbulb, TrendingUp, UserRoundCheck } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

// Types
export interface StudySuggestion {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  reason: string;
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening';
  suggestedDate: string;
  topics: string[];
  estimatedCompletionTime: number; // in minutes
}

interface StudySuggestionsProps {
  suggestions: StudySuggestion[];
  onSchedule: (suggestion: StudySuggestion) => void;
  isLoading?: boolean;
}

export function StudySuggestions({ suggestions, onSchedule, isLoading = false }: StudySuggestionsProps) {
  const { toast } = useToast();

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const timeOfDayIcon = {
    morning: <Calendar className="h-4 w-4" />,
    afternoon: <Clock className="h-4 w-4" />,
    evening: <History className="h-4 w-4" />,
  };

  // Group suggestions by priority
  const groupedSuggestions = {
    high: suggestions.filter(s => s.priority === 'high'),
    medium: suggestions.filter(s => s.priority === 'medium'),
    low: suggestions.filter(s => s.priority === 'low'),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-semibold">
          <Lightbulb className="h-5 w-5 mr-2 text-primary" />
          Smart Study Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 mx-auto text-primary opacity-40" />
            <h3 className="mt-2 font-medium">No Study Suggestions Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete more study sessions to get personalized suggestions
            </p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4 w-full grid grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="high" className="text-red-700">
                High Priority
                {groupedSuggestions.high.length > 0 && (
                  <Badge variant="outline" className="ml-1.5">{groupedSuggestions.high.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="medium" className="text-yellow-700">
                Medium
                {groupedSuggestions.medium.length > 0 && (
                  <Badge variant="outline" className="ml-1.5">{groupedSuggestions.medium.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="low" className="text-green-700">
                Low
                {groupedSuggestions.low.length > 0 && (
                  <Badge variant="outline" className="ml-1.5">{groupedSuggestions.low.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {suggestions.map((suggestion) => (
                <SuggestionCard 
                  key={suggestion.id} 
                  suggestion={suggestion} 
                  priorityColors={priorityColors} 
                  timeOfDayIcon={timeOfDayIcon}
                  onSchedule={onSchedule}
                />
              ))}
            </TabsContent>

            <TabsContent value="high" className="space-y-4">
              {groupedSuggestions.high.length > 0 ? (
                groupedSuggestions.high.map((suggestion) => (
                  <SuggestionCard 
                    key={suggestion.id} 
                    suggestion={suggestion} 
                    priorityColors={priorityColors} 
                    timeOfDayIcon={timeOfDayIcon}
                    onSchedule={onSchedule}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No high priority suggestions
                </div>
              )}
            </TabsContent>

            <TabsContent value="medium" className="space-y-4">
              {groupedSuggestions.medium.length > 0 ? (
                groupedSuggestions.medium.map((suggestion) => (
                  <SuggestionCard 
                    key={suggestion.id} 
                    suggestion={suggestion} 
                    priorityColors={priorityColors} 
                    timeOfDayIcon={timeOfDayIcon}
                    onSchedule={onSchedule}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No medium priority suggestions
                </div>
              )}
            </TabsContent>

            <TabsContent value="low" className="space-y-4">
              {groupedSuggestions.low.length > 0 ? (
                groupedSuggestions.low.map((suggestion) => (
                  <SuggestionCard 
                    key={suggestion.id} 
                    suggestion={suggestion} 
                    priorityColors={priorityColors} 
                    timeOfDayIcon={timeOfDayIcon}
                    onSchedule={onSchedule}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No low priority suggestions
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

interface SuggestionCardProps {
  suggestion: StudySuggestion;
  priorityColors: {[key: string]: string};
  timeOfDayIcon: {[key: string]: React.ReactNode};
  onSchedule: (suggestion: StudySuggestion) => void;
}

function SuggestionCard({ suggestion, priorityColors, timeOfDayIcon, onSchedule }: SuggestionCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{suggestion.title}</h3>
              <Badge className={priorityColors[suggestion.priority]}>
                {suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)} Priority
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{suggestion.subject}</p>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{suggestion.duration} min</span>
          </div>
        </div>

        <div className="mt-3 text-sm">
          <div className="flex items-start gap-1">
            <Lightbulb className="h-4 w-4 mt-0.5 text-primary" />
            <p className="flex-1">{suggestion.reason}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {suggestion.topics && suggestion.topics.length > 0 ? suggestion.topics.map((topic, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {topic}
            </Badge>
          )) : (
            <Badge variant="secondary" className="text-xs">
              General Study
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-sm">
            <div className="flex items-center mr-3">
              {timeOfDayIcon[suggestion.bestTimeOfDay]}
              <span className="ml-1 capitalize">{suggestion.bestTimeOfDay}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>
                {new Date(suggestion.suggestedDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
          <Button size="sm" onClick={() => onSchedule(suggestion)}>
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook for getting study suggestions
export function useStudySuggestions() {
  return {
    suggestionsQuery: {
      queryKey: ['/api/study-suggestions'],
      queryFn: async () => {
        try {
          // In a real implementation, this would fetch from the API
          const response = await fetch('/api/study-suggestions');
          
          if (!response.ok) {
            // Return empty array if API fails
            return [] as StudySuggestion[];
          }
          
          return await response.json();
        } catch (error) {
          console.error("Error fetching study suggestions:", error);
          return [];
        }
      }
    },
    scheduleSuggestion: useMutation({
      mutationFn: async (suggestion: StudySuggestion) => {
        try {
          // This would call the API in a real implementation
          // return apiRequest("POST", "/api/study-sessions", {
          //   title: suggestion.title,
          //   subject: suggestion.subject,
          //   date: suggestion.suggestedDate,
          //   duration: suggestion.duration,
          //   topics: suggestion.topics,
          //   priority: suggestion.priority === 'high'
          // });
          
          // For now, simulate a successful response
          return new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error("Error scheduling suggestion:", error);
          throw error;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/study-sessions'] });
      }
    })
  };
}