import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, Lightbulb, Timer, CheckCircle, BookOpenCheck, 
  BrainCircuit, AlertTriangle, School, Target
} from 'lucide-react';

// Study strategy for a specific weakness
interface StudyStrategy {
  id: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  subject: string;
  title: string;
  description: string;
  steps: {
    name: string;
    description: string;
    timeEstimate: string;
  }[];
  resources: {
    type: 'book' | 'video' | 'website' | 'practice';
    title: string;
    description: string;
    link?: string;
  }[];
  tips: string[];
  estimatedTimeToMastery: string;
}

// Sample study strategies database
const studyStrategies: StudyStrategy[] = [
  {
    id: 'math-alg-1',
    topic: 'linear algebra',
    difficulty: 'intermediate',
    subject: 'mathematics',
    title: 'Mastering Matrix Operations',
    description: 'A structured approach to build your understanding of matrix operations and their applications.',
    steps: [
      {
        name: 'Review Basic Concepts',
        description: 'Ensure you understand what matrices are, basic notation, and how to represent them.',
        timeEstimate: '1-2 hours'
      },
      {
        name: 'Practice Matrix Addition & Subtraction',
        description: 'Work through multiple examples of adding and subtracting matrices of different dimensions.',
        timeEstimate: '2-3 hours'
      },
      {
        name: 'Master Matrix Multiplication',
        description: 'Focus on the process of multiplying matrices, paying attention to dimensions and order.',
        timeEstimate: '3-4 hours'
      },
      {
        name: 'Understand Determinants',
        description: 'Practice calculating determinants and understand their geometric interpretation.',
        timeEstimate: '2-3 hours'
      },
      {
        name: 'Apply to Real Problems',
        description: 'Solve problems involving systems of equations, transformations, and other applications.',
        timeEstimate: '4-5 hours'
      }
    ],
    resources: [
      {
        type: 'video',
        title: '3Blue1Brown: Essence of Linear Algebra',
        description: 'Excellent visual explanations of linear algebra concepts.',
        link: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab'
      },
      {
        type: 'book',
        title: 'Linear Algebra Done Right',
        description: 'A rigorous but approachable textbook on linear algebra.',
        link: 'https://link.springer.com/book/10.1007/978-3-319-11080-6'
      },
      {
        type: 'practice',
        title: 'Khan Academy: Linear Algebra',
        description: 'Practice problems with step-by-step solutions.',
        link: 'https://www.khanacademy.org/math/linear-algebra'
      }
    ],
    tips: [
      'Visualize matrices as transformations in space to better understand their meaning.',
      'Practice computing matrix operations by hand before using calculators.',
      'Create flashcards for matrix properties and theorems.',
      'Work through problems that connect linear algebra to other fields you are studying.'
    ],
    estimatedTimeToMastery: '2-3 weeks'
  },
  {
    id: 'cs-data-1',
    topic: 'data structures',
    difficulty: 'intermediate',
    subject: 'computer science',
    title: 'Mastering Trees and Graph Algorithms',
    description: 'A comprehensive approach to understanding tree and graph data structures and algorithms.',
    steps: [
      {
        name: 'Build a Strong Foundation',
        description: 'Review basic data structure concepts and ensure you understand pointers/references.',
        timeEstimate: '2-3 hours'
      },
      {
        name: 'Study Binary Trees',
        description: 'Learn about binary trees, their properties, and basic operations (insertion, deletion, traversal).',
        timeEstimate: '4-5 hours'
      },
      {
        name: 'Explore Tree Variants',
        description: 'Study BSTs, AVL trees, Red-Black trees, and B-trees, understanding their advantages.',
        timeEstimate: '6-8 hours'
      },
      {
        name: 'Graph Fundamentals',
        description: 'Learn graph representations (adjacency matrix, adjacency list) and basic graph theory.',
        timeEstimate: '3-4 hours'
      },
      {
        name: 'Graph Algorithms',
        description: 'Study and implement essential algorithms: BFS, DFS, Dijkstra, Prim, and Kruskal.',
        timeEstimate: '8-10 hours'
      },
      {
        name: 'Apply to Problems',
        description: 'Solve problems that utilize these data structures and algorithms.',
        timeEstimate: '10+ hours'
      }
    ],
    resources: [
      {
        type: 'book',
        title: 'Algorithms by Robert Sedgewick',
        description: 'Comprehensive coverage of data structures and algorithms.',
        link: 'https://algs4.cs.princeton.edu/home/'
      },
      {
        type: 'website',
        title: 'Visualgo.net',
        description: 'Visualizations of data structures and algorithms.',
        link: 'https://visualgo.net/'
      },
      {
        type: 'practice',
        title: 'LeetCode Data Structure Track',
        description: 'Practice problems specifically for data structures.',
        link: 'https://leetcode.com/explore/learn/'
      }
    ],
    tips: [
      'Implement each data structure from scratch to understand the details.',
      'Draw out tree and graph operations on paper before coding them.',
      'Study the time and space complexity of different operations.',
      'Regularly revisit and review concepts to strengthen memory.',
      'Join a study group to discuss difficult concepts and problems.'
    ],
    estimatedTimeToMastery: '4-6 weeks'
  },
  {
    id: 'phys-mech-1',
    topic: 'mechanics',
    difficulty: 'intermediate',
    subject: 'physics',
    title: 'Mastering Rotational Dynamics',
    description: 'A systematic approach to understanding rotational motion and angular momentum.',
    steps: [
      {
        name: 'Review Linear Motion',
        description: 'Ensure you have a solid foundation in linear kinematics and dynamics.',
        timeEstimate: '2-3 hours'
      },
      {
        name: 'Learn Angular Quantities',
        description: 'Study angular displacement, velocity, and acceleration, and their relationships.',
        timeEstimate: '3-4 hours'
      },
      {
        name: 'Understand Torque',
        description: 'Master the concept of torque, its calculation, and its effects on rotation.',
        timeEstimate: '4-5 hours'
      },
      {
        name: 'Study Moment of Inertia',
        description: 'Learn how mass distribution affects rotational motion through moment of inertia.',
        timeEstimate: '4-5 hours'
      },
      {
        name: 'Master Angular Momentum',
        description: 'Understand angular momentum, its conservation, and applications.',
        timeEstimate: '3-4 hours'
      },
      {
        name: 'Apply to Complex Problems',
        description: 'Solve problems involving combined translation and rotation.',
        timeEstimate: '6-8 hours'
      }
    ],
    resources: [
      {
        type: 'video',
        title: 'Khan Academy: Rotational Motion',
        description: 'Clear explanations of rotational dynamics concepts.',
        link: 'https://www.khanacademy.org/science/physics/torque-angular-momentum'
      },
      {
        type: 'book',
        title: 'University Physics with Modern Physics',
        description: 'Comprehensive textbook with excellent explanations and problems.',
        link: 'https://www.pearson.com/us/higher-education/program/Young-University-Physics-with-Modern-Physics-14th-Edition/PGM2697945.html'
      },
      {
        type: 'practice',
        title: 'MIT OpenCourseWare: Classical Mechanics',
        description: 'Problem sets and solutions from MIT physics course.',
        link: 'https://ocw.mit.edu/courses/physics/8-01sc-classical-mechanics-fall-2016/'
      }
    ],
    tips: [
      'Always draw free-body diagrams for forces and torques.',
      'Pay attention to the direction of vectors using the right-hand rule.',
      'Practice converting between linear and angular quantities.',
      'Build physical intuition by observing rotational motion in everyday objects.',
      'Create summary sheets with key equations and their applications.'
    ],
    estimatedTimeToMastery: '3-4 weeks'
  }
];

interface StudyStrategyComponentProps {
  topic?: string;
  subject?: string;
}

export function StudyStrategyComponent({ topic, subject }: StudyStrategyComponentProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>(subject || "all");
  
  // Filter strategies based on selections
  const filteredStrategies = studyStrategies.filter(strategy => {
    const matchesDifficulty = selectedDifficulty === "all" || strategy.difficulty === selectedDifficulty;
    const matchesSubject = selectedSubject === "all" || strategy.subject === selectedSubject;
    const matchesTopic = !topic || strategy.topic.toLowerCase().includes(topic.toLowerCase());
    
    return matchesDifficulty && matchesSubject && matchesTopic;
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Study Strategies</CardTitle>
            <CardDescription>
              Personalized approaches to master challenging concepts
            </CardDescription>
          </div>
          <BrainCircuit className="h-8 w-8 text-primary opacity-80" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!topic && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="computer science">Computer Science</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Difficulty</label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        {filteredStrategies.length === 0 ? (
          <div className="text-center py-8">
            <School className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">No Study Strategies Found</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              We couldn't find any strategies matching your criteria. Try adjusting your filters or check back later as we add more content.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredStrategies.map((strategy) => (
              <div key={strategy.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{strategy.title}</h3>
                        <Badge variant="outline" className="capitalize">
                          {strategy.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                    </div>
                    <Badge className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/10">
                      {strategy.subject}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="steps">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Study Plan</span>
                          <Badge variant="outline" className="ml-2 bg-primary/5 text-xs">
                            {strategy.steps.length} steps
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="ml-6 space-y-4 pt-2">
                          {strategy.steps.map((step, index) => (
                            <div key={index} className="border-l-2 pl-4 pb-4 relative">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">{index + 1}</span>
                              </div>
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium">{step.name}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                                </div>
                                <Badge variant="outline" className="flex gap-1 items-center whitespace-nowrap">
                                  <Timer className="h-3 w-3" /> {step.timeEstimate}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="resources">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>Learning Resources</span>
                          <Badge variant="outline" className="ml-2 bg-primary/5 text-xs">
                            {strategy.resources.length} resources
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {strategy.resources.map((resource, index) => (
                            <div key={index} className="p-3 border rounded-md flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {resource.type === 'book' && (
                                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded">
                                      <BookOpen className="h-4 w-4" />
                                    </div>
                                  )}
                                  {resource.type === 'video' && (
                                    <div className="p-1.5 bg-red-100 text-red-700 rounded">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                                    </div>
                                  )}
                                  {resource.type === 'website' && (
                                    <div className="p-1.5 bg-purple-100 text-purple-700 rounded">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                    </div>
                                  )}
                                  {resource.type === 'practice' && (
                                    <div className="p-1.5 bg-green-100 text-green-700 rounded">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15v-5H7v5h2Z"/><path d="M17 15h-4v-2h2v-3h-2V8h4v7Z"/></svg>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium">{resource.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                                </div>
                              </div>
                              {resource.link && (
                                <a 
                                  href={resource.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
                                >
                                  Open resource
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="tips">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          <span>Expert Tips</span>
                          <Badge variant="outline" className="ml-2 bg-primary/5 text-xs">
                            {strategy.tips.length} tips
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {strategy.tips.map((tip, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="mt-0.5 p-1 bg-amber-100 text-amber-800 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/><path d="M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>
                              </div>
                              <span className="text-sm">{tip}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                
                <div className="px-4 py-3 bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Estimated time to mastery:</span>
                    <span className="font-medium">{strategy.estimatedTimeToMastery}</span>
                  </div>
                  <Button size="sm">
                    <Target className="h-4 w-4 mr-2" />
                    Add to Study Plan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {topic && (
        <CardFooter className="flex justify-center border-t pt-4">
          <Button variant="outline" className="w-full sm:w-auto">
            <BookOpenCheck className="h-4 w-4 mr-2" />
            View All Study Strategies
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}