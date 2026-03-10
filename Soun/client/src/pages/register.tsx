import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  school: z.string().min(1, { message: "School name is required" }),
  program: z.string().min(1, { message: "Program/Major is required" }),
  year: z.string().min(1, { message: "Year of study is required" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      school: "",
      program: "",
      year: "",
    },
  });

  const register = useMutation({
    mutationFn: (data: Omit<z.infer<typeof formSchema>, "confirmPassword">) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: async (_, variables) => {
      try {
        await login(variables.email, variables.password);
        setLocation("/dashboard");
      } catch (err) {
        console.error("Auto-login after registration failed:", err);
        setLocation("/login");
      }
    },
    onError: (err: any) => {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setError(null);
    const { confirmPassword, ...registerData } = values;
    register.mutate(registerData);
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <svg className="h-12 w-12 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3ZM18.82 9L12 12.72L5.18 9L12 5.28L18.82 9ZM17 16.08L12 19.08L7 16.08V12.27L12 15.27L17 12.27V16.08Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">Soun</h1>
          <p className="mt-2 text-gray-600">Your personal study assistant</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>
              Register to start tracking your study progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
                {error}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="school"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School/University</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your school or university" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="program"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program/Major</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your program or major" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Study</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., 1st, 2nd, Junior" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Create a password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={register.isPending}>
                  {register.isPending ? "Registering..." : "Register"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
              Already have an account? {" "}
              <Link href="/login" className="text-primary font-medium hover:text-primary/80">
                Log In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}