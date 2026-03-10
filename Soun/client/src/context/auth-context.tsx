import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiPost, apiGet } from '@/lib/api-client';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
  program: string;
  year: string;
  name: string;
  education: string;
  password: string;
  initials?: string;
  programChoiceReason?: string;
  careerGoals?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { 
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    school: string;
    program: string;
    year: string;
    programChoiceReason?: string;
    careerGoals?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  error: Error | null;
}

// For testing purposes, create a mock user object
const mockUser: User = {
  id: 1,
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
  school: "Demo University",
  program: "Computer Science",
  year: "2023",
  education: "Demo University - Computer Science (2023)",
  name: "Test User",
  initials: "TU",
  password: "",
  programChoiceReason: "I chose Computer Science because I've always been fascinated by technology and how software works. I want to build tools that help people learn more effectively.",
  careerGoals: "I aim to become a software engineer specializing in educational technology, developing AI-powered learning systems that adapt to individual student needs."
};

// Mock auth context for temporary development use
export const mockAuthContext: AuthContextType = {
  user: mockUser,
  isLoading: false,
  isAuthenticated: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  error: null
};

export const AuthContext = createContext<AuthContextType>(mockAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<User | null>(null); // Add state for user
  const [loading, setLoading] = useState<boolean>(true); // State to manage initial loading

  // Fetch user data
  const { data: fetchedUser, isLoading: queryIsLoading, error: queryError } = useQuery<User | null, Error, User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiGet('/api/auth/me'); // Use apiGet for consistent handling

      if (!response.ok) {
        if (response.status === 401) {
          // 401 is expected for unauthenticated users - return null silently
          return null;
        }
        // Only throw for unexpected errors (500, network issues, etc.)
        throw new Error(`Authentication check failed: ${response.statusText}`);
      }

      const userData = await response.json();
      return userData;
    },
    retry: (failureCount, error) => {
      // Don't retry on expected authentication failures
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Update local user state when fetchedUser changes
  useEffect(() => {
    if (fetchedUser !== undefined) {
      setUser(fetchedUser);
      setLoading(false); // Set loading to false once initial auth check is done
    }
  }, [fetchedUser]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiPost('/api/auth/login', { email, password }); // Use apiPost

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const userData = await response.json();
      return userData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data);
      setError(null);

      // Force a query invalidation to ensure the latest user data is fetched
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (err) => {
      setError(err as Error);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: { 
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      school: string;
      program: string;
      year: string;
      programChoiceReason?: string;
      careerGoals?: string;
    }) => {
      const response = await apiPost('/api/auth/register', userData); // Use apiPost

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data);
      setError(null);
    },
    onError: (err) => {
      setError(err as Error);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiPost('/api/auth/logout', {}); // Use apiPost

      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      setError(null);
    },
    onError: (err) => {
      setError(err as Error);
    },
  });

  const login = async (email: string, password: string): Promise<void> => {
    console.log("Auth context login called with:", { email, password: "***" });
    try {
      const response = await apiPost("/api/auth/login", { email, password }); // Use apiPost
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        queryClient.setQueryData(['/api/auth/me'], data.user); // Update query cache with user data only
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] }); // Invalidate to ensure consistency
        setError(null);
      } else {
        const errorData = await response.json(); // Ensure error data is parsed
        console.error("Login error:", errorData);
        throw new Error(errorData.error || "Login failed"); // Throw error instead of returning it
      }
    } catch (err) {
      console.error("Login exception:", err);
      setError(err as Error); // Set network error state
      throw err; // Re-throw to maintain Promise<void> contract
    }
  };

  const register = async (userData: { 
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    school: string;
    program: string;
    year: string;
    programChoiceReason?: string;
    careerGoals?: string;
  }) => {
    await registerMutation.mutateAsync(userData);
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      // Make a direct fetch to ensure proper session cleanup
      const response = await fetch('/api/auth/logout', { // Using fetch for logout as per common practice for session invalidation
        method: 'POST',
        credentials: 'include'
      });

      console.log('Logout response status:', response.status);

      // Clear the query cache and local state
      queryClient.setQueryData(['/api/auth/me'], null);
      setUser(null); // Clear local user state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      // Force a redirect to the login page
      console.log('Redirecting to login page...');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, still try to redirect to login
      window.location.href = '/login';
    }
  };

  // Disable auto-login to allow manual login with custom credentials
  // useEffect(() => {
  //   const autoLogin = async () => {
  //     if (import.meta.env.DEV && !isLoading && !user) {
  //       try {
  //         await login('test', 'password');
  //       } catch (err) {
  //         console.error('Auto-login failed:', err);
  //       }
  //     }
  //   };
  //   
  //   // Auto-login in development for easier testing
  //   autoLogin();
  // }, [isLoading, user]);

  return (
    <AuthContext.Provider
      value={{
        user: user,
        isLoading: loading || queryIsLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}