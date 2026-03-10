import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearningInsights } from './learning-insights';
import { StudyStrategyComponent } from './study-strategy';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Brain, ChartBar, Lightbulb, School, Target
} from 'lucide-react';

interface StudentAnalysisProps {
  courseId?: string; // Optional - if provided, will filter for specific course
}

export function StudentAnalysis({ courseId }: StudentAnalysisProps) {
  const [selectedTab, setSelectedTab] = useState('insights');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Academic Analysis</h2>
          <p className="text-muted-foreground">
            Insights into your strengths, weaknesses, and personalized study recommendations
          </p>
        </div>
        <Badge 
          variant="outline" 
          className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 py-1.5 px-4"
        >
          <Brain className="mr-1 h-4 w-4" />
          <span>AI-Powered Analysis</span>
        </Badge>
      </div>

      <Tabs 
        defaultValue={selectedTab} 
        onValueChange={setSelectedTab}
        className="space-y-4"
      >
        <div className="bg-muted rounded-lg p-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights" className="rounded-md py-2.5 data-[state=active]:bg-background">
              <div className="flex items-center gap-2">
                <ChartBar className="h-4 w-4" />
                <span>Learning Insights</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="strategies" className="rounded-md py-2.5 data-[state=active]:bg-background">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>Study Strategies</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>
  
        <TabsContent 
          value="insights" 
          className="m-0"
        >
          <div className="grid grid-cols-1 gap-6">
            <LearningInsights courseId={courseId} />
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quiz Performance Trends</CardTitle>
                    <CardDescription>
                      Performance analysis based on your quiz and test results
                    </CardDescription>
                  </div>
                  <School className="h-8 w-8 text-primary opacity-80" />
                </div>
              </CardHeader>
              <CardContent className="text-center py-16">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">Quiz Data Coming Soon</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  Complete more quizzes and assessments to generate detailed performance analytics.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
  
        <TabsContent 
          value="strategies" 
          className="m-0"
        >
          <StudyStrategyComponent subject={courseId ? undefined : "computer science"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}