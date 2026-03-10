import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PlusCircle, BarChart2, BookOpen } from "lucide-react";

// Form schema for adding a new exam score
const examScoreSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  courseName: z.string().min(1, "Course name is required"),
  examName: z.string().min(1, "Exam name is required"),
  score: z.string().min(1, "Score is required"),
  maxScore: z.string().min(1, "Maximum score is required"),
  date: z.string().min(1, "Date is required"),
  feedback: z.string().optional(),
});

export function ExamScores() {
  const { toast } = useToast();
  const [addExamOpen, setAddExamOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Query to get exam score analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/exam-scores/analytics'],
  });
  
  // Query to get all exam scores
  const { data: examScores, isLoading: scoresLoading } = useQuery({
    queryKey: ['/api/exam-scores'],
  });
  
  // Mutation to add a new exam score
  const addExamMutation = useMutation({
    mutationFn: (data: z.infer<typeof examScoreSchema>) => 
      apiRequest('POST', '/api/exam-scores', data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exam-scores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/exam-scores/analytics'] });
      setAddExamOpen(false);
      toast({
        title: "Exam score added",
        description: "Your exam score has been successfully recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add exam score",
        description: "There was an error adding your exam score. Please try again.",
        variant: "destructive",
      });
      console.error("Add exam error:", error);
    }
  });
  
  // Form for adding a new exam score
  const form = useForm<z.infer<typeof examScoreSchema>>({
    resolver: zodResolver(examScoreSchema),
    defaultValues: {
      courseId: "",
      courseName: "",
      examName: "",
      score: "",
      maxScore: "100",
      date: new Date().toISOString().split('T')[0],
      feedback: "",
    },
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof examScoreSchema>) => {
    addExamMutation.mutate(values);
  };
  
  return (
    <Card className="col-span-12 lg:col-span-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-2xl font-bold tracking-tight">Exam Scores</CardTitle>
          <CardDescription>
            Track your exam performance and receive personalized feedback
          </CardDescription>
        </div>
        <Button onClick={() => setAddExamOpen(true)} size="sm" className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4" />
          <span>Add Score</span>
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart2 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>Score History</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {analyticsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Average Score</h3>
                    <p className="text-3xl font-bold">{analyticsData?.averageScore || "--"}%</p>
                    {analyticsData?.improvement > 0 && (
                      <p className="text-sm text-green-500 mt-1">
                        +{analyticsData.improvement}% from previous exams
                      </p>
                    )}
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Exams</h3>
                    <p className="text-3xl font-bold">{analyticsData?.totalExams || 0}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Best Subject</h3>
                    <p className="text-3xl font-bold">
                      {analyticsData?.coursePerformance?.[0]?.courseName || "--"}
                    </p>
                    {analyticsData?.coursePerformance?.[0] && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {analyticsData.coursePerformance[0].averageScore}% average
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Performance by Course</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData?.coursePerformance || []}
                        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="courseName" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Average Score']} />
                        <Bar 
                          dataKey="averageScore" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {analyticsData?.recentExams?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Recent Exams</h3>
                    <div className="space-y-3">
                      {analyticsData.recentExams.map((exam: any) => (
                        <div key={exam.id} className="bg-muted/50 p-3 rounded-lg flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{exam.examName}</h4>
                            <p className="text-sm text-muted-foreground">{exam.courseName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{exam.score}/{exam.maxScore}</p>
                            <p className="text-xs text-muted-foreground">{new Date(exam.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            {scoresLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {!Array.isArray(examScores) || examScores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <p className="text-muted-foreground text-center">
                      You haven't recorded any exam scores yet.
                    </p>
                    <Button onClick={() => setAddExamOpen(true)} variant="outline" className="mt-4">
                      Add Your First Exam Score
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Group by course */}
                    {Object.entries(
                      Array.isArray(examScores) ? examScores.reduce((acc: any, score: any) => {
                        if (!acc[score.courseName]) {
                          acc[score.courseName] = [];
                        }
                        acc[score.courseName].push(score);
                        return acc;
                      }, {}) : {}
                    ).map(([courseName, scores]: [string, any]) => (
                      <div key={courseName}>
                        <h3 className="font-medium mb-2">{courseName}</h3>
                        <div className="rounded-md border">
                          <div className="grid grid-cols-12 bg-muted text-xs font-medium py-2 px-4">
                            <div className="col-span-4">Exam</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-2">Score</div>
                            <div className="col-span-4">Feedback</div>
                          </div>
                          <div className="divide-y">
                            {scores.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((score: any) => (
                                <div key={score.id} className="grid grid-cols-12 py-3 px-4 text-sm">
                                  <div className="col-span-4 font-medium">{score.examName}</div>
                                  <div className="col-span-2 text-muted-foreground">
                                    {new Date(score.date).toLocaleDateString()}
                                  </div>
                                  <div className="col-span-2 font-medium">
                                    {score.score}/{score.maxScore}
                                  </div>
                                  <div className="col-span-4 text-muted-foreground line-clamp-2">
                                    {score.feedback || "No feedback provided"}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Dialog for adding a new exam score */}
      <Dialog open={addExamOpen} onOpenChange={setAddExamOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Exam Score</DialogTitle>
            <DialogDescription>
              Record your exam results to track your progress over time.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course ID</FormLabel>
                      <FormControl>
                        <Input placeholder="CS301" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="courseName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Data Structures" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="examName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Midterm Exam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Score</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Score</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Any feedback or notes about this exam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddExamOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addExamMutation.isPending}
                >
                  {addExamMutation.isPending ? "Saving..." : "Save Score"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}