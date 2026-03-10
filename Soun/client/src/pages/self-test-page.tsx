
import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, BookOpen, TrendingUp, Clock } from 'lucide-react';
import { SelfTestComponent } from '@/components/study/self-test-component';
import { PageLayout } from '@/components/layout/page-layout';
import { useAuth } from '@/context/auth-context';

export function SelfTestPage() {
  const { user } = useAuth();
  const [recentResults, setRecentResults] = useState<any[]>([]);

  // Fetch available topics from user's documents and courses
  const { data: availableTopics = [] } = useQuery({
    queryKey: ['/api/self-test/available-topics'],
    queryFn: async () => {
      // In production, this would fetch from your API
      return [
        'Calculus', 'Linear Algebra', 'Statistics', 'Physics', 'Chemistry',
        'Computer Science', 'Biology', 'Economics', 'Engineering', 'Psychology'
      ];
    }
  });

  // Fetch user's documents for test generation
  const { data: userDocuments = [] } = useQuery({
    queryKey: ['/api/documents/for-testing'],
    queryFn: async () => {
      const response = await fetch('/api/documents');
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    }
  });

  // Fetch weak areas from learning analytics
  const { data: weakAreas = [] } = useQuery({
    queryKey: ['/api/learning-analytics/weak-areas'],
    queryFn: async () => {
      // In production, this would analyze user performance
      return [
        'Integration Techniques', 'Trigonometric Identities', 'Probability Distributions'
      ];
    }
  });

  // Fetch recent test history
  const { data: testHistory = [] } = useQuery({
    queryKey: ['/api/self-test/history'],
    queryFn: async () => {
      // Mock data - in production, fetch from API
      return [
        {
          id: '1',
          date: new Date('2024-01-15'),
          topics: ['Calculus', 'Linear Algebra'],
          score: 85,
          duration: 25,
          questionCount: 10
        },
        {
          id: '2',
          date: new Date('2024-01-10'),
          topics: ['Physics'],
          score: 72,
          duration: 30,
          questionCount: 15
        }
      ];
    }
  });

  const handleTestComplete = (results: any) => {
    // Store results and update history
    setRecentResults(prev => [results, ...prev.slice(0, 4)]);
  };

  return (
    <PageLayout title="Self-Test" subtitle="Assess your knowledge and identify areas for improvement">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Tests Taken</p>
                  <p className="text-2xl font-bold">{testHistory.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Avg Score</p>
                  <p className="text-2xl font-bold">
                    {testHistory.length > 0 
                      ? Math.round(testHistory.reduce((sum, test) => sum + test.score, 0) / testHistory.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Topics Studied</p>
                  <p className="text-2xl font-bold">{availableTopics.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Study Time</p>
                  <p className="text-2xl font-bold">
                    {testHistory.reduce((sum, test) => sum + test.duration, 0)}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weak Areas Alert */}
        {weakAreas.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">Areas Needing Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700 mb-3">
                Based on your recent performance, consider focusing on these areas:
              </p>
              <div className="flex flex-wrap gap-2">
                {weakAreas.map((area, index) => (
                  <Badge key={index} variant="outline" className="border-orange-300 text-orange-700">
                    {area}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Test History */}
        {testHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Test History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testHistory.slice(0, 3).map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{test.topics.join(', ')}</div>
                      <div className="text-sm text-muted-foreground">
                        {test.questionCount} questions • {test.duration} minutes
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={test.score >= 80 ? "default" : test.score >= 60 ? "secondary" : "destructive"}>
                        {test.score}%
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {test.date.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Self-Test Component */}
        <SelfTestComponent
          availableTopics={availableTopics}
          userDocuments={userDocuments}
          weakAreas={weakAreas}
          onComplete={handleTestComplete}
        />
      </div>
    </PageLayout>
  );
}
