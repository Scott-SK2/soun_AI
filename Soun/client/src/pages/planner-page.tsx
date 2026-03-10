import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarIcon, PlusIcon, UploadIcon, ExternalLink, Bell } from "lucide-react";
import { CalendarIntegrationButton, CalendarEventIndicator } from "@/components/planner/calendar-integration";
import { CalendarEvent } from "@/lib/calendar-integration";
import { SmartPlanner } from "@/components/planner/smart-planner";
import { NotificationCenter } from "@/components/notification/notification-center";
import { requestNotificationPermission } from "@/lib/notifications";
import { format } from "date-fns";

// Study session form schema
const studySessionSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  startTime: z.string().min(1, { message: "Start time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  notes: z.string().optional(),
  isPriority: z.boolean().default(false),
  type: z.literal("session").default("session"),
});

// Exam form schema
const examSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  date: z.string().min(1, { message: "Date is required" }),
  startTime: z.string().min(1, { message: "Start time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  location: z.string().optional(),
  notes: z.string().optional(),
  type: z.literal("exam").default("exam"),
});

// Test form schema
const testSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  date: z.string().min(1, { message: "Date is required" }),
  startTime: z.string().min(1, { message: "Start time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  location: z.string().optional(),
  notes: z.string().optional(),
  type: z.literal("test").default("test"),
});

// Deadline form schema
const deadlineSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  dueDate: z.string().min(1, { message: "Due date is required" }),
  dueTime: z.string().min(1, { message: "Due time is required" }),
  description: z.string().optional(),
  isPriority: z.boolean().default(false),
  type: z.literal("deadline").default("deadline"),
});

type StudySessionValues = z.infer<typeof studySessionSchema>;
type ExamValues = z.infer<typeof examSchema>;
type TestValues = z.infer<typeof testSchema>;
type DeadlineValues = z.infer<typeof deadlineSchema>;

export default function PlannerPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isExamOpen, setIsExamOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  
  const { toast } = useToast();
  
  // Set up forms for different types
  const studySessionForm = useForm<StudySessionValues>({
    resolver: zodResolver(studySessionSchema),
    defaultValues: {
      title: "",
      subject: "",
      startTime: "",
      endTime: "",
      notes: "",
      isPriority: false,
      type: "session",
    },
  });

  const examForm = useForm<ExamValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      subject: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      notes: "",
      type: "exam",
    },
  });

  const testForm = useForm<TestValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: "",
      subject: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      notes: "",
      type: "test",
    },
  });

  const deadlineForm = useForm<DeadlineValues>({
    resolver: zodResolver(deadlineSchema),
    defaultValues: {
      title: "",
      subject: "",
      dueDate: "",
      dueTime: "",
      description: "",
      isPriority: false,
      type: "deadline",
    },
  });
  
  // Check for notification permission on component mount
  React.useEffect(() => {
    const checkPermission = async () => {
      // Check if browser supports notifications
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
        
        // Request permission if not granted
        if (Notification.permission !== 'granted') {
          const permission = await requestNotificationPermission();
          setNotificationPermission(permission ? 'granted' : 'denied');
        }
      }
    };
    
    checkPermission();
  }, []);
  
  // Create study session mutation
  const createStudySession = useMutation({
    mutationFn: async (sessionData: StudySessionValues) => {
      return apiRequest("POST", "/api/study-sessions", {
        ...sessionData,
        date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      });
    },
    onSuccess: () => {
      toast({
        title: "Study session created",
        description: "Your study session has been scheduled successfully",
      });
      setIsSessionOpen(false);
      studySessionForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/study-sessions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create study session",
        variant: "destructive",
      });
    }
  });

  // Create exam mutation
  const createExam = useMutation({
    mutationFn: async (examData: ExamValues) => {
      return apiRequest("POST", "/api/exams", examData);
    },
    onSuccess: () => {
      toast({
        title: "Exam scheduled",
        description: "Your exam has been added to your calendar",
      });
      setIsExamOpen(false);
      examForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-sessions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule exam",
        variant: "destructive",
      });
    }
  });

  // Create test mutation
  const createTest = useMutation({
    mutationFn: async (testData: TestValues) => {
      return apiRequest("POST", "/api/tests", testData);
    },
    onSuccess: () => {
      toast({
        title: "Test scheduled",
        description: "Your test has been added to your calendar",
      });
      setIsTestOpen(false);
      testForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-sessions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule test",
        variant: "destructive",
      });
    }
  });

  // Create deadline mutation
  const createDeadline = useMutation({
    mutationFn: async (deadlineData: DeadlineValues) => {
      return apiRequest("POST", "/api/deadlines", deadlineData);
    },
    onSuccess: () => {
      toast({
        title: "Deadline added",
        description: "Your deadline has been added to your planner",
      });
      setIsDeadlineOpen(false);
      deadlineForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-sessions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add deadline",
        variant: "destructive",
      });
    }
  });

  // Upload syllabus mutation
  const uploadSyllabus = useMutation({
    mutationFn: async (fileType: string) => {
      return apiRequest("POST", "/api/syllabus/upload", { fileType });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Syllabus has been uploaded and processed",
      });
      setIsUploadOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/study-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-suggestions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not upload syllabus",
        variant: "destructive",
      });
    }
  });
  
  const onUpload = (fileType: string) => {
    uploadSyllabus.mutate(fileType);
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Study Planner</h1>
          <p className="text-muted-foreground mt-1">
            Organize your studies with AI-powered recommendations and tracking
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Notification permission button */}
          {notificationPermission === 'denied' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                const permission = await requestNotificationPermission();
                setNotificationPermission(permission ? 'granted' : 'denied');
              }}
              className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
            >
              <Bell className="h-4 w-4 mr-1.5" />
              Enable Notifications
            </Button>
          )}

          {/* Add Study Session Button */}
          <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Study Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Study Session</DialogTitle>
                <DialogDescription>
                  Create a new study session for {date ? format(date, 'MMMM d, yyyy') : 'today'}
                </DialogDescription>
              </DialogHeader>
              <Form {...studySessionForm}>
                <form onSubmit={studySessionForm.handleSubmit(createStudySession.mutate)} className="space-y-4">
                  <FormField
                    control={studySessionForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Review Chapter 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={studySessionForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mathematics" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={studySessionForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={studySessionForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={studySessionForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Study goals or reminders..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={studySessionForm.control}
                    name="isPriority"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">High Priority</FormLabel>
                          <FormMessage />
                        </div>
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value} 
                            onChange={field.onChange}
                            className="ml-auto"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createStudySession.isPending}>
                      {createStudySession.isPending ? "Creating..." : "Create Session"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Add Exam Button */}
          <Dialog open={isExamOpen} onOpenChange={setIsExamOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Add Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Exam</DialogTitle>
                <DialogDescription>
                  Add an upcoming exam to your calendar
                </DialogDescription>
              </DialogHeader>
              <Form {...examForm}>
                <form onSubmit={examForm.handleSubmit(createExam.mutate)} className="space-y-4">
                  <FormField
                    control={examForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Midterm Exam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={examForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Biology" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={examForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={examForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={examForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={examForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Room 101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={examForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Topics covered, materials needed..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createExam.isPending}>
                      {createExam.isPending ? "Scheduling..." : "Schedule Exam"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Add Test Button */}
          <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Add Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Test</DialogTitle>
                <DialogDescription>
                  Add an upcoming test to your calendar
                </DialogDescription>
              </DialogHeader>
              <Form {...testForm}>
                <form onSubmit={testForm.handleSubmit(createTest.mutate)} className="space-y-4">
                  <FormField
                    control={testForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Quiz 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={testForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Biology" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={testForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={testForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={testForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={testForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Room 101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={testForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Topics covered, materials needed..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createTest.isPending}>
                      {createTest.isPending ? "Scheduling..." : "Schedule Test"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Add Deadline Button */}
          <Dialog open={isDeadlineOpen} onOpenChange={setIsDeadlineOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Add Deadline
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Assignment Deadline</DialogTitle>
                <DialogDescription>
                  Add an important assignment or project deadline
                </DialogDescription>
              </DialogHeader>
              <Form {...deadlineForm}>
                <form onSubmit={deadlineForm.handleSubmit(createDeadline.mutate)} className="space-y-4">
                  <FormField
                    control={deadlineForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignment Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Research Paper" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={deadlineForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., History" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={deadlineForm.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={deadlineForm.control}
                      name="dueTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={deadlineForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Assignment details, requirements..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={deadlineForm.control}
                    name="isPriority"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">High Priority</FormLabel>
                          <FormMessage />
                        </div>
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value} 
                            onChange={field.onChange}
                            className="ml-auto"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createDeadline.isPending}>
                      {createDeadline.isPending ? "Adding..." : "Add Deadline"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload Syllabus
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Syllabus</DialogTitle>
                <DialogDescription>
                  Upload your course syllabus to automatically generate a study plan.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <FormLabel>Select File Type</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      className="justify-start font-normal"
                      onClick={() => onUpload('pdf')}
                    >
                      PDF Document
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start font-normal"
                      onClick={() => onUpload('docx')}
                    >
                      Word Document
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start font-normal"
                      onClick={() => onUpload('pptx')}
                    >
                      PowerPoint
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button disabled={uploadSyllabus.isPending}>
                  {uploadSyllabus.isPending ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Notification Center */}
          <NotificationCenter />
        </div>
      </div>
      
      {/* Smart Planner Component */}
      <SmartPlanner initialDate={date} />
    </div>
  );
}