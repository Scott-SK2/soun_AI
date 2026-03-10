
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Mic, Play, MessageCircle, Star, Clock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    level: number;
  }>;
  currentTopic: string;
  isActive: boolean;
  language: string;
}

interface VocalExchange {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  topic: string;
  audioUrl: string;
  transcript: string;
  timestamp: Date;
  ratings: Array<{
    userId: string;
    score: number;
    feedback: string;
  }>;
  type: 'explanation' | 'question' | 'answer' | 'teaching';
}

export function VocalCollaborationHub() {
  const { user } = useAuth();
  const [activeGroups, setActiveGroups] = useState<StudyGroup[]>([]);
  const [vocalExchanges, setVocalExchanges] = useState<VocalExchange[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Load mock data - in production this would come from your API
    setActiveGroups([
      {
        id: 'group1',
        name: 'Calculus Study Circle',
        subject: 'mathematics',
        members: [
          { id: '1', name: 'Alice', level: 85 },
          { id: '2', name: 'Bob', level: 72 },
          { id: '3', name: 'Carol', level: 91 }
        ],
        currentTopic: 'Integration by Parts',
        isActive: true,
        language: 'English'
      },
      {
        id: 'group2',
        name: 'Physics Problem Solvers',
        subject: 'physics',
        members: [
          { id: '4', name: 'David', level: 78 },
          { id: '5', name: 'Eve', level: 83 }
        ],
        currentTopic: 'Electromagnetic Induction',
        isActive: true,
        language: 'English'
      }
    ]);

    setVocalExchanges([
      {
        id: 'ex1',
        groupId: 'group1',
        userId: '1',
        userName: 'Alice',
        topic: 'Integration by Parts',
        audioUrl: '',
        transcript: 'Let me explain integration by parts step by step. First, we identify u and dv...',
        timestamp: new Date(),
        ratings: [
          { userId: '2', score: 4, feedback: 'Very clear explanation!' },
          { userId: '3', score: 5, feedback: 'Perfect pace and examples' }
        ],
        type: 'explanation'
      }
    ]);
  }, []);

  const joinVocalSession = async (groupId: string) => {
    // Implementation for joining a vocal study session
    console.log('Joining vocal session for group:', groupId);
  };

  const startTeaching = () => {
    setIsRecording(true);
    // Start recording implementation
  };

  const submitVocalExplanation = () => {
    setIsRecording(false);
    // Submit the recorded explanation
  };

  const rateExplanation = (exchangeId: string, rating: number, feedback: string) => {
    // Submit rating for a vocal explanation
    console.log('Rating explanation:', exchangeId, rating, feedback);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vocal Learning Community
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Learn by teaching others and listening to peer explanations
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">Study Groups</TabsTrigger>
          <TabsTrigger value="exchanges">Vocal Exchanges</TabsTrigger>
          <TabsTrigger value="teach">Teach Others</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid gap-4">
            {activeGroups.map((group) => (
              <Card key={group.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Current topic: {group.currentTopic}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{group.subject}</Badge>
                        <Badge variant={group.isActive ? "default" : "secondary"}>
                          {group.isActive ? 'Active' : 'Scheduled'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {group.members.length} members
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => joinVocalSession(group.id)}>
                      <Mic className="h-4 w-4 mr-2" />
                      Join Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exchanges" className="space-y-4">
          <div className="space-y-4">
            {vocalExchanges.map((exchange) => (
              <Card key={exchange.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{exchange.userName}</span>
                        <Badge variant="outline">{exchange.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {exchange.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm mb-2">{exchange.topic}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {exchange.transcript}
                      </p>
                      
                      {/* Ratings Display */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">
                            {exchange.ratings.length > 0 
                              ? (exchange.ratings.reduce((sum, r) => sum + r.score, 0) / exchange.ratings.length).toFixed(1)
                              : 'No ratings'
                            }
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {exchange.ratings.length} ratings
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="teach" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teach by Explaining</CardTitle>
              <p className="text-sm text-muted-foreground">
                Record explanations to help others learn and improve your own understanding
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Choose a topic to explain:</label>
                <select className="w-full mt-1 p-2 border rounded">
                  <option>Integration by Parts</option>
                  <option>Electromagnetic Induction</option>
                  <option>Molecular Bonding</option>
                  <option>Algorithm Complexity</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Explanation type:</label>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="cursor-pointer">Step-by-step</Badge>
                  <Badge variant="outline" className="cursor-pointer">Conceptual</Badge>
                  <Badge variant="outline" className="cursor-pointer">Problem solving</Badge>
                  <Badge variant="outline" className="cursor-pointer">Real-world example</Badge>
                </div>
              </div>

              <Button 
                onClick={isRecording ? submitVocalExplanation : startTeaching}
                className="w-full"
                variant={isRecording ? "destructive" : "default"}
              >
                <Mic className="h-4 w-4 mr-2" />
                {isRecording ? 'Stop & Submit' : 'Start Teaching'}
              </Button>

              {isRecording && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 font-medium">Recording your explanation...</span>
                  </div>
                  <p className="text-red-600 text-xs mt-1">
                    Speak clearly and explain as if teaching a friend
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
