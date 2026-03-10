import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from '@tanstack/react-query';
import { 
  BookOpen, Brain, CheckCircle, AlertTriangle, 
  Award, TrendingUp, Lightbulb, Timer, 
  BookOpenCheck, Target, Puzzle
} from 'lucide-react';
import { StudyTip, getRecommendationsForWeaknesses } from '@/lib/study-recommendations';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMotivation } from '@/context/motivation-context';

interface LearningInsightsProps {
  courseId?: string; // Optional - if provided, will filter insights for this course
}

export function LearningInsights({ courseId }: LearningInsightsProps) {
  const [openTipId, setOpenTipId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('weaknesses');
  const { recordStudyStruggle } = useMotivation();

  // Fetch study level data from the API
  const { data: studyLevels = [], isLoading: isStudyLevelsLoading } = useQuery({
    queryKey: [courseId ? `/api/progress/mastery/${courseId}` : '/api/progress/mastery'],
    queryFn: async () => {
      try {
        // For demo purposes, return mock data
        if (courseId) {
          return [
            {
              id: 1,
              userId: 1,
              courseId: "cs101",
              topic: "Algorithms",
              masteryLevel: 85,
              questionsAttempted: 45,
              questionsCorrect: 38,
              lastUpdated: new Date().toISOString(),
              strengths: ["Sorting algorithms", "Big O notation", "Array manipulation"],
              weaknesses: ["Dynamic programming", "Graph algorithms"],
              recommendedActions: ["Practice more complex graph problems", "Review dynamic programming patterns"]
            },
            {
              id: 2,
              userId: 1,
              courseId: "cs101",
              topic: "Data Structures",
              masteryLevel: 72,
              questionsAttempted: 38,
              questionsCorrect: 27,
              lastUpdated: new Date().toISOString(),
              strengths: ["Arrays", "Linked lists", "Stacks"],
              weaknesses: ["Trees", "Heaps", "Hash tables"],
              recommendedActions: ["Build a binary search tree implementation", "Practice heap operations"]
            },
            {
              id: 3,
              userId: 1,
              courseId: "cs101",
              topic: "Programming Concepts",
              masteryLevel: 92,
              questionsAttempted: 50,
              questionsCorrect: 46,
              lastUpdated: new Date().toISOString(),
              strengths: ["Variables", "Loops", "Functions", "Object-oriented concepts"],
              weaknesses: ["Recursion"],
              recommendedActions: ["Practice recursive problem solving"]
            }
          ];
        } else {
          return [
            {
              id: 1,
              userId: 1,
              courseId: "cs101",
              topic: "Algorithms",
              masteryLevel: 85,
              questionsAttempted: 45,
              questionsCorrect: 38,
              lastUpdated: new Date().toISOString(),
              strengths: ["Sorting algorithms", "Big O notation", "Array manipulation"],
              weaknesses: ["Dynamic programming", "Graph algorithms"],
              recommendedActions: ["Practice more complex graph problems", "Review dynamic programming patterns"]
            },
            {
              id: 2,
              userId: 1,
              courseId: "cs101",
              topic: "Data Structures",
              masteryLevel: 72,
              questionsAttempted: 38,
              questionsCorrect: 27,
              lastUpdated: new Date().toISOString(),
              strengths: ["Arrays", "Linked lists", "Stacks"],
              weaknesses: ["Trees", "Heaps", "Hash tables"],
              recommendedActions: ["Build a binary search tree implementation", "Practice heap operations"]
            },
            {
              id: 4,
              userId: 1,
              courseId: "math201",
              topic: "Calculus",
              masteryLevel: 68,
              questionsAttempted: 32,
              questionsCorrect: 22,
              lastUpdated: new Date().toISOString(),
              strengths: ["Derivatives", "Basic integration"],
              weaknesses: ["Integration by parts", "Implicit differentiation", "Related rates"],
              recommendedActions: ["Practice integration techniques", "Work through related rates word problems"]
            },
            {
              id: 5,
              userId: 1,
              courseId: "phys101",
              topic: "Mechanics",
              masteryLevel: 78,
              questionsAttempted: 40,
              questionsCorrect: 31,
              lastUpdated: new Date().toISOString(),
              strengths: ["Newton's laws", "Projectile motion"],
              weaknesses: ["Rotational dynamics", "Conservation of energy"],
              recommendedActions: ["Solve energy conservation problems", "Practice moment of inertia calculations"]
            }
          ];
        }
      } catch (error) {
        console.error("Error fetching study levels:", error);
        return [];
      }
    }
  });

  // Calculate overall mastery level
  const overallMastery = studyLevels.length > 0 
    ? Math.round(studyLevels.reduce((sum, level) => sum + level.masteryLevel, 0) / studyLevels.length) 
    : 0;
  
  // Collect all strengths and weaknesses
  const allStrengths = studyLevels.flatMap(level => level.strengths || []);
  const allWeaknesses = studyLevels.flatMap(level => level.weaknesses || []);
  
  // Get unique strengths and weaknesses
  const uniqueStrengths = Array.from(new Set(allStrengths));
  const uniqueWeaknesses = Array.from(new Set(allWeaknesses));
  
  // Get the course name for recommendations
  const courseName = studyLevels.length > 0 ? studyLevels[0].topic : "";
  
  // Get tailored study recommendations
  const studyRecommendations = uniqueWeaknesses.length > 0 
    ? getRecommendationsForWeaknesses("computer science", uniqueWeaknesses) 
    : [];
    
  // Trigger motivation system when weaknesses are detected
  useEffect(() => {
    if (uniqueWeaknesses.length > 2) {
      // If student has multiple weaknesses, record a study struggle
      recordStudyStruggle();
    }
  }, [uniqueWeaknesses.length, recordStudyStruggle]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Learning Insights</CardTitle>
            <CardDescription>
              Your personalized learning analysis and study recommendations
            </CardDescription>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="relative h-16 w-16">
              <Progress 
                value={overallMastery} 
                className="h-16 w-16 [&>*]:stroke-[6px]" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-lg font-bold">{overallMastery}%</div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-1">Mastery Level</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isStudyLevelsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : studyLevels.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">No Data Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete quizzes and assignments to generate learning insights
            </p>
          </div>
        ) : (
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="weaknesses" className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Weaknesses</span>
              </TabsTrigger>
              <TabsTrigger value="strengths" className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Strengths</span>
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Study Tips</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="weaknesses" className="space-y-4">
              {uniqueWeaknesses.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    These topics need improvement based on your quiz performance:
                  </p>
                  <div className="space-y-3">
                    {uniqueWeaknesses.map((weakness, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 bg-amber-100 p-1.5 rounded text-amber-700">
                              <Target className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium">{weakness}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {getWeaknessDescription(weakness)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-100">
                            Focus Area
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 mx-auto text-primary opacity-80" />
                  <h3 className="mt-2 font-medium">No Weaknesses Identified</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Great job! Continue practicing to maintain your knowledge
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="strengths" className="space-y-4">
              {uniqueStrengths.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    You've demonstrated strong understanding in these areas:
                  </p>
                  <div className="space-y-3">
                    {uniqueStrengths.map((strength, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 bg-green-100 p-1.5 rounded text-green-700">
                              <Award className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium">{strength}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {getStrengthDescription(strength)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                            Mastered
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <BookOpenCheck className="h-8 w-8 mx-auto text-muted-foreground opacity-80" />
                  <h3 className="mt-2 font-medium">No Strengths Identified Yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Complete more quizzes to identify your strong areas
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4">
              {studyRecommendations.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Personalized study recommendations based on your weaker areas:
                  </p>
                  <div className="space-y-4">
                    {studyRecommendations.map((tip) => (
                      <div 
                        key={tip.id} 
                        className="bg-muted/50 rounded-lg overflow-hidden"
                      >
                        <div 
                          className="p-3 cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => setOpenTipId(openTipId === tip.id ? null : tip.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 bg-primary/10 p-1.5 rounded text-primary">
                              {getCategoryIcon(tip.category)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{tip.technique}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {tip.timeRequired}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {tip.description}
                              </p>
                              {openTipId !== tip.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 h-7 text-xs text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenTipId(tip.id);
                                  }}
                                >
                                  See details
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {openTipId === tip.id && (
                          <div className="px-4 pb-3 pt-0">
                            <Separator className="mb-3" />
                            <div className="space-y-3">
                              <div>
                                <h5 className="text-sm font-medium mb-1">Benefits:</h5>
                                <ul className="list-disc list-inside text-sm text-muted-foreground pl-1 space-y-1">
                                  {tip.benefits.map((benefit, i) => (
                                    <li key={i}>{benefit}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="text-sm font-medium">Effectiveness:</h5>
                                  <div className="flex items-center mt-1">
                                    {Array(5).fill(0).map((_, i) => (
                                      <div 
                                        key={i} 
                                        className={`h-1.5 w-5 rounded-full mx-0.5 ${
                                          i < tip.effectiveness 
                                            ? 'bg-primary' 
                                            : 'bg-muted-foreground/30'
                                        }`} 
                                      />
                                    ))}
                                  </div>
                                </div>
                                
                                {tip.source && (
                                  <div className="text-xs text-muted-foreground">
                                    Source: {tip.source}
                                  </div>
                                )}
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenTipId(null);
                                }}
                              >
                                Hide details
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground opacity-80" />
                  <h3 className="mt-2 font-medium">No Recommendations Available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Complete quizzes to receive personalized study recommendations
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions to provide descriptions for strengths and weaknesses
function getWeaknessDescription(topic: string): string {
  const descriptions: Record<string, string> = {
    "Dynamic programming": "You're finding it challenging to identify and solve problems using dynamic programming techniques.",
    "Graph algorithms": "You're having difficulty understanding and applying graph-based algorithms.",
    "Trees": "You need more practice with tree data structures and operations.",
    "Heaps": "You're struggling with heap operations and applications.",
    "Hash tables": "You need more practice with hash table implementations and collision resolution.",
    "Recursion": "You're finding recursive problem-solving approaches challenging.",
    "Integration by parts": "You need more practice applying this integration technique.",
    "Implicit differentiation": "You're struggling with derivatives of implicitly defined functions.",
    "Related rates": "You find it difficult to set up and solve related rates problems.",
    "Rotational dynamics": "You're having trouble with rotational motion concepts and calculations.",
    "Conservation of energy": "You need more practice applying energy conservation principles."
  };
  
  return descriptions[topic] || "Focus on this area to improve your overall understanding.";
}

function getStrengthDescription(topic: string): string {
  const descriptions: Record<string, string> = {
    "Sorting algorithms": "You have a strong understanding of different sorting methods and their applications.",
    "Big O notation": "You're proficient in analyzing algorithm complexity and efficiency.",
    "Array manipulation": "You're skilled at working with arrays and performing operations on them.",
    "Arrays": "You have mastered basic array operations and implementations.",
    "Linked lists": "You demonstrate good understanding of linked list operations and applications.",
    "Stacks": "You've mastered stack data structures and their use cases.",
    "Variables": "You have strong comprehension of variable declaration, scope, and usage.",
    "Loops": "You're proficient with different looping structures and their implementations.",
    "Functions": "You demonstrate excellent understanding of functions and parameter passing.",
    "Object-oriented concepts": "You grasp object-oriented programming principles well.",
    "Derivatives": "You're skilled at applying differentiation rules and techniques.",
    "Basic integration": "You understand fundamental integration concepts and methods.",
    "Newton's laws": "You've mastered Newton's laws of motion and their applications.",
    "Projectile motion": "You're skilled at solving projectile motion problems."
  };
  
  return descriptions[topic] || "You've demonstrated strong skills in this area!";
}

// Helper function to get the appropriate icon for each study tip category
function getCategoryIcon(category: string) {
  switch (category) {
    case 'memory':
      return <Brain className="h-4 w-4" />;
    case 'understanding':
      return <BookOpen className="h-4 w-4" />;
    case 'problem_solving':
      return <Puzzle className="h-4 w-4" />;
    case 'focus':
      return <Target className="h-4 w-4" />;
    case 'time_management':
      return <Timer className="h-4 w-4" />;
    case 'note_taking':
      return <BookOpenCheck className="h-4 w-4" />;
    case 'test_preparation':
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <Lightbulb className="h-4 w-4" />;
  }
}