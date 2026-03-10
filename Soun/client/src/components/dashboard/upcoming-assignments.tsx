import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Assignment } from "@/lib/types";

const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  course: z.string().min(1, { message: "Course is required" }),
  dueDate: z.string().min(1, { message: "Due date is required" }),
});

export function UpcomingAssignments() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/assignments'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      course: "",
      dueDate: "",
    },
  });

  const createAssignment = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/assignments", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      form.reset();
      setOpen(false);
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createAssignment.mutate(values);
  };

  const getDaysLeft = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return "Overdue";
    return `${diffDays} days left`;
  };

  const getStatusColor = (dueDate: string) => {
    const diffDays = getDaysLeft(dueDate);
    
    if (diffDays === "Today" || diffDays === "Tomorrow") 
      return "bg-amber-100 text-amber-600";
    if (diffDays === "Overdue") 
      return "bg-red-100 text-red-600";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <Card className="mb-6">
      <CardHeader className="px-4 py-5 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-800 font-poppins">Upcoming Deadlines</CardTitle>
      </CardHeader>
      
      <CardContent className="px-4 py-3 divide-y divide-gray-200">
        {isLoading ? (
          <div className="py-3 text-center text-gray-500">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="py-3 text-center text-gray-500">No upcoming assignments</div>
        ) : (
          assignments.map((assignment) => (
            <div className="py-3" key={assignment.id}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-800">{assignment.title}</h4>
                  <p className="text-xs text-gray-500">{assignment.course}</p>
                </div>
                <div className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(assignment.dueDate)}`}>
                  {getDaysLeft(assignment.dueDate)}
                </div>
              </div>
              <div className="mt-2">
                <Progress 
                  value={assignment.progress} 
                  className="h-1.5 bg-gray-100" 
                  indicatorClassName={
                    assignment.progress > 75 ? "bg-green-500" : 
                    assignment.progress > 50 ? "bg-primary" : 
                    assignment.progress > 25 ? "bg-amber-500" : "bg-red-500"
                  }
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
      
      <CardFooter className="px-4 py-3 bg-gray-50 rounded-b-lg">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center w-full justify-start p-0">
              <i className="ri-add-line mr-1"></i> Add new assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Assignment</DialogTitle>
              <DialogDescription>
                Create a new assignment to track your progress.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Title</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Algorithm Analysis Report" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="course"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., CS301 - Data Structures" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
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
                
                <DialogFooter>
                  <Button type="submit" disabled={createAssignment.isPending}>
                    {createAssignment.isPending ? "Creating..." : "Create Assignment"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
