import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Book, BookOpen, PlusCircle, Clock, Calendar, Brain, Upload, FileText } from "lucide-react";
import { CourseVoiceAssistant } from "@/components/course/course-voice-assistant";
import type { Course } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { MobileNav } from "@/components/ui/mobile-nav";

// Course form schema
const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  code: z.string().min(2, { message: "Course code is required" }),
  instructor: z.string().min(2, { message: "Instructor name is required" }),
  description: z.string().optional(),
  term: z.string().min(2, { message: "Term is required (e.g., 'Fall 2025')" }),
  credits: z.coerce.number().min(1, { message: "Credits must be at least 1" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function CoursesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("my-courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [uploadingCourse, setUploadingCourse] = useState<Course | null>(null);
  const [uploading, setUploading] = useState(false);

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, course: Course | null) => {
    const file = event.target.files?.[0];
    if (!file || !course) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', course.courseId);
      formData.append('courseName', course.name);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        try {
          const result = await response.json();
          toast({ 
            title: "Success", 
            description: `${file.name} uploaded and processed successfully!` 
          });
        } catch (parseError) {
          // Even if JSON parsing fails, the upload was successful
          toast({ 
            title: "Success", 
            description: `${file.name} uploaded successfully!` 
          });
        }
        setUploadingCourse(null);
        // Reset file input
        event.target.value = '';
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Set up course form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      code: "",
      instructor: "",
      description: "",
      term: "",
      credits: 3,
    },
  });

  // Query to get courses with extended caching
  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/courses');
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - courses don't change frequently
    placeholderData: (previousData) => previousData, // Keep showing old data while refetching
  });

  // Create course mutation
  const createCourse = useMutation({
    mutationFn: async (courseData: any) => {
      return apiRequest("POST", "/api/courses", courseData);
    },
    onSuccess: () => {
      toast({
        title: "Course created",
        description: "Your course has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create course",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: FormValues) => {
    // Map form data to match the database schema
    const courseData = {
      courseId: data.code,                                           // Map code -> courseId
      name: data.title,                                             // Map title -> name  
      instructor: data.instructor,
      description: data.description,
      semester: data.term.split(' ')[0] || data.term,              // Extract semester from term
      year: parseInt(data.term.split(' ')[1]) || new Date().getFullYear(), // Extract year from term
      credits: data.credits,
    };
    createCourse.mutate(courseData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome to Your Study Hub</h1>
          <p className="text-muted-foreground">Select a course to start studying, or add a new course to get started</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
              <DialogDescription>
                Create a new course to track your studies and progress
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Introduction to Psychology" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., PSYC 101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="instructor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructor</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Dr. Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the course..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Fall 2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="credits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credits</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="6" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button type="submit" disabled={createCourse.isPending}>
                    {createCourse.isPending ? "Creating..." : "Create Course"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-courses">My Courses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-courses">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Your Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Book className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Ready to start studying?</h3>
                  <p className="text-muted-foreground mb-6 text-lg">
                    Add your first course to unlock AI-powered study tools, voice assistance, and personalized learning
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="lg" className="text-base px-8">
                        <PlusCircle className="h-5 w-5 mr-2" />
                        Add Your First Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Course</DialogTitle>
                        <DialogDescription>
                          Create a new course to track your studies and progress
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Course Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Introduction to Psychology" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Course Code</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., PSYC 101" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="instructor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Instructor</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Dr. Smith" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Brief description of the course..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="term"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Term/Semester</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Fall 2025" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="credits"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Credits</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" max="6" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <DialogFooter>
                            <Button type="submit" disabled={createCourse.isPending}>
                              {createCourse.isPending ? "Creating..." : "Create Course"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course) => (
                    <Card key={course.id} className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-xl font-bold text-primary">
                              {course.name}
                            </CardTitle>
                            <CardDescription className="text-base font-medium">
                              {course.courseId}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {course.credits || 0} Credits
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{course.semester} {course.year}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{course.instructor}</span>
                          </div>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                              {course.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="mt-6 space-y-2">
                          <Link href={`/courses/${course.courseId}/study`}>
                            <Button 
                              size="lg" 
                              className="w-full text-base font-semibold py-3"
                            >
                              <Brain className="h-5 w-5 mr-2" />
                              Start Studying
                            </Button>
                          </Link>
                          <Button 
                            size="default" 
                            variant="outline"
                            onClick={() => setUploadingCourse(course)}
                            className="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Materials
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Course Materials Upload Dialog */}
      {uploadingCourse && (
        <Dialog open={!!uploadingCourse} onOpenChange={() => setUploadingCourse(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Materials for {uploadingCourse.name}</DialogTitle>
              <DialogDescription>
                Add notes, PowerPoints, PDFs, and other study materials for this course
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Course Materials</label>
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.pptx,.docx,.doc,.jpg,.jpeg,.png,.txt"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, uploadingCourse)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="justify-start font-normal"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {uploading ? "Processing..." : "PDF Notes"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start font-normal"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Processing..." : "PowerPoint"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start font-normal"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {uploading ? "Processing..." : "Word Doc"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start font-normal"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Processing..." : "Images/Handwritten"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports: PDF, PowerPoint (.pptx only), Word (.docx only), Images (.jpg, .png), and Text files
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Legacy formats (.ppt, .doc) are not supported. Please convert to modern formats (.pptx, .docx) or PDF.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Course Voice Assistant */}
      {selectedCourse && (
        <CourseVoiceAssistant 
          courseId={selectedCourse.courseId}
          courseName={selectedCourse.name}
        />
      )}
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}