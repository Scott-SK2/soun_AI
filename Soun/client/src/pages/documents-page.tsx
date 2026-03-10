import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DocumentViewer } from "@/components/document-viewer";
import { 
  FileIcon,
  FileTextIcon, 
  FolderIcon, 
  PlusIcon, 
  UploadIcon, 
  FileUp,
  PresentationIcon,
  FileType,
  BookOpen,
  GraduationCap,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DocumentAnalysisViewer } from "@/components/document/document-analysis-viewer";
import { CrossFileSearch } from "@/components/search/cross-file-search";
import { EnhancedDocumentProcessor } from "@/components/document/enhanced-document-processor";

const fileTypeIcons: Record<string, React.ReactNode> = {
  pptx: <PresentationIcon className="h-5 w-5" />,
  docx: <FileTextIcon className="h-5 w-5" />,
  pdf: <FileIcon className="h-5 w-5" />,
  default: <FileType className="h-5 w-5" />
};

type Document = {
  id: number;
  title: string;
  fileType: string;
  courseId: string | null;
  courseName: string;
  content: string | null;
  metadata: string | null;
  uploadDate: string;
  tags: string[] | null;
};

type Course = {
  id: number;
  courseId: string;
  name: string;
  instructor: string;
  semester: string;
  year: number;
};

// Document upload schema
const uploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  fileType: z.string().min(1, "File type is required"),
  courseId: z.string().min(1, "Course is required"),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export default function DocumentsPage() {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set(['uncategorized']));
  const { toast } = useToast();

  // Mock user data for EnhancedDocumentProcessor
  const user = { id: 1, name: "John Doe" }; 

  // Set up form
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      fileType: "pptx",
      courseId: "",
    },
  });

  // Get all courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/courses");
        if (!res.ok) throw new Error("Failed to fetch courses");
        return res.json();
      } catch (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
    }
  });

  // Get all documents
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/documents");
        if (!res.ok) throw new Error("Failed to fetch documents");
        const docs = await res.json();
        console.log("Fetched documents:", docs);
        return docs;
      } catch (error) {
        console.error("Error fetching documents:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!navigator.onLine) return false;
      return failureCount < 3;
    }
  });

  // Get single document
  const { data: documentDetail, isLoading: isLoadingDoc } = useQuery<Document>({
    queryKey: ["/api/documents", selectedDoc?.id],
    queryFn: async () => {
      if (!selectedDoc) throw new Error("No document selected");
      const res = await fetch(`/api/documents/${selectedDoc.id}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!selectedDoc,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ formData, courseId }: { formData: FormData; courseId: string }) => {
      console.log('[UPLOAD] Starting upload mutation for course:', courseId);
      
      // Find the actual course to get its courseId (code)
      const course = courses.find(c => c.courseId === courseId);
      if (!course) {
        console.error('[UPLOAD] Course not found:', courseId);
        throw new Error("Course not found");
      }
      
      console.log('[UPLOAD] Uploading to course:', course.name, course.courseId);
      const res = await fetch(`/api/courses/${course.courseId}/documents`, {
        method: "POST",
        body: formData,
      });
      
      console.log('[UPLOAD] Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Upload failed" }));
        console.error('[UPLOAD] Upload failed:', errorData);
        throw new Error(errorData.error || "Upload failed");
      }
      
      const result = await res.json();
      console.log('[UPLOAD] Upload successful:', result);
      return result;
    },
    onSuccess: async () => {
      console.log('[UPLOAD] onSuccess triggered');
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
      form.reset();
      setIsUploadOpen(false);
      console.log('[UPLOAD] Resetting queries...');
      await queryClient.resetQueries({ queryKey: ["/api/documents"] });
      console.log('[UPLOAD] Reset complete');
    },
    onError: (error: Error) => {
      console.error('[UPLOAD] onError triggered:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      try {
        console.log('[DELETE] Starting delete for document:', documentId);
        const res = await apiRequest("DELETE", `/api/documents/${documentId}`);
        console.log('[DELETE] apiRequest completed, status:', res.status);
        const data = await res.json();
        console.log('[DELETE] Server response:', data);
        return data;
      } catch (error) {
        console.error('[DELETE] mutationFn error:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('[DELETE] onSuccess called with data:', data);
      toast({
        title: "Document deleted",
        description: `"${data.deletedDocument.title}" has been removed.`,
      });
      // Clear selected document if it was deleted
      if (selectedDoc?.id === data.deletedDocument.id) {
        setSelectedDoc(null);
      }
      // Reset queries to completely clear cache and force fresh fetch
      console.log('[DELETE] Resetting queries to clear cache...');
      await queryClient.resetQueries({ queryKey: ["/api/documents"] });
      console.log('[DELETE] Reset complete, fetching fresh data...');
    },
    onError: (error: Error) => {
      console.error('[DELETE] Error occurred:', error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: UploadFormValues) => {
    try {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = fileInput?.files?.[0];

      if (!file) {
        toast({
          title: "Error",
          description: "Please select a file to upload",
          variant: "destructive",
        });
        return;
      }

      console.log('Uploading file:', file.name, 'type:', file.type, 'size:', file.size);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', values.title);
      formData.append('tags', JSON.stringify([])); // Add empty tags array

      await uploadMutation.mutateAsync({ formData, courseId: values.courseId });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    }
  };

  const handleSelectDocument = (doc: Document) => {
    setSelectedDoc(doc);
  };

  const toggleCourseExpansion = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Group documents by course ID (numeric)
  const documentsByCourse = documents.reduce((acc, doc) => {
    const key = doc.courseId || 'uncategorized';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Get total document count
  const totalDocuments = documents.length;

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage your study materials organized by course ({totalDocuments} total documents)
          </p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <UploadIcon className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
              <DialogDescription>
                Upload a presentation, syllabus, or other study material to a specific course.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.courseId}>
                              {course.name} ({course.courseId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Document title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select File</label>
                  <input
                    type="file"
                    accept=".pdf,.pptx,.docx,.jpg,.jpeg,.png,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        form.setValue('fileType', file.type);
                        if (!form.getValues('title')) {
                          form.setValue('title', file.name);
                        }
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={uploadMutation.isPending}
                    className="w-full"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FileUp className="h-4 w-4 mr-2" />
                        Upload Document
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="enhanced">Enhanced Processing</TabsTrigger>
          <TabsTrigger value="search">Search Across Files</TabsTrigger>
          <TabsTrigger value="upload">Upload Document</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!selectedDoc}>
            Analysis {selectedDoc && `- ${selectedDoc.title}`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Course-organized document list */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Documents by Course
                  </CardTitle>
                  <CardDescription>
                    {courses.length === 0 ? 
                      "No courses yet" : 
                      `${courses.length} course${courses.length === 1 ? '' : 's'}, ${totalDocuments} documents`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingDocs ? (
                    <div className="py-8 flex justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : courses.length === 0 ? (
                    <div className="py-8 text-center">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/60" />
                      <h3 className="mt-4 text-sm font-medium">No courses</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create a course first to upload documents
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Show uncategorized documents first if any */}
                      {documentsByCourse['uncategorized'] && documentsByCourse['uncategorized'].length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div 
                            className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleCourseExpansion('uncategorized')}
                          >
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-yellow-500" />
                              <div>
                                <h4 className="text-sm font-medium">Uncategorized Documents</h4>
                                <p className="text-xs text-muted-foreground">Documents without course assignment</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {documentsByCourse['uncategorized'].length}
                              </Badge>
                              <div className={`transition-transform ${expandedCourses.has('uncategorized') ? 'rotate-90' : ''}`}>
                                →
                              </div>
                            </div>
                          </div>

                          {expandedCourses.has('uncategorized') && (
                            <div className="border-t">
                              <div className="divide-y">
                                {documentsByCourse['uncategorized'].map((doc) => (
                                  <div
                                    key={doc.id}
                                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                                      selectedDoc?.id === doc.id ? "bg-muted/50" : ""
                                    }`}
                                    onClick={() => handleSelectDocument(doc)}
                                  >
                                    <div className="text-muted-foreground">
                                      {fileTypeIcons[doc.fileType] || fileTypeIcons.default}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{doc.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDate(doc.uploadDate)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {courses.map((course) => {
                        const courseDocuments = documentsByCourse[course.courseId] || [];
                        const isExpanded = expandedCourses.has(course.courseId);

                        return (
                          <div key={course.id} className="border rounded-lg overflow-hidden">
                            <div 
                              className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleCourseExpansion(course.courseId)}
                            >
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                <div>
                                  <h4 className="text-sm font-medium">{course.name}</h4>
                                  <p className="text-xs text-muted-foreground">{course.courseId}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {courseDocuments.length}
                                </Badge>
                                <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  →
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t">
                                {courseDocuments.length === 0 ? (
                                  <div className="p-4 text-center">
                                    <FolderIcon className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                                    <p className="text-xs text-muted-foreground">No documents yet</p>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        form.setValue('courseId', course.courseId);
                                        setIsUploadOpen(true);
                                      }}
                                      className="mt-2 text-xs"
                                    >
                                      <PlusIcon className="h-3 w-3 mr-1" />
                                      Add Document
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="divide-y">
                                    {courseDocuments.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className={`flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors ${
                                          selectedDoc?.id === doc.id ? "bg-muted/50" : ""
                                        }`}
                                      >
                                        <div className="text-muted-foreground">
                                          {fileTypeIcons[doc.fileType] || fileTypeIcons.default}
                                        </div>
                                        <div 
                                          className="flex-1 min-w-0 cursor-pointer"
                                          onClick={() => handleSelectDocument(doc)}
                                        >
                                          <p className="text-sm font-medium truncate">{doc.title}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatDate(doc.uploadDate)}
                                          </p>
                                        </div>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                              data-testid={`button-delete-document-${doc.id}`}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete "{doc.title}"? This action cannot be undone and will permanently remove the document from your library.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => deleteMutation.mutate(doc.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Document viewer */}
            <div className="lg:col-span-2">
              <DocumentViewer 
                document={documentDetail || selectedDoc} 
                isLoading={isLoadingDoc}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="enhanced" className="mt-6">
          {user && (
            <EnhancedDocumentProcessor 
              documents={documents} 
              userId={user.id}
            />
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <CrossFileSearch documents={documents} />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <div className="flex justify-center items-center h-96">
            <Button onClick={() => setIsUploadOpen(true)} size="lg">
              <UploadIcon className="h-5 w-5 mr-2" />
              Upload a New Document
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          {selectedDoc ? (
            <DocumentAnalysisViewer 
              document={selectedDoc} 
              isLoading={isLoadingDoc}
            />
          ) : (
            <div className="flex justify-center items-center h-96">
              <p className="text-muted-foreground">Select a document from the list to view its analysis.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}