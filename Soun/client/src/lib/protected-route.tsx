import { useAuth } from '@/context/auth-context';
import { Redirect, Route } from 'wouter';
import { PageLayout } from '@/components/layout/page-layout';

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
  showBanner?: boolean;
};

export function ProtectedRoute({ 
  path, 
  component: Component, 
  showBanner = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        // If auth is still loading, show a loading spinner
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          );
        }
        
        // If not authenticated, redirect to login
        if (!isAuthenticated) {
          return <Redirect to="/login" />;
        }
        
        // If authenticated, show the component with layout
        return (
          <PageLayout showBanner={showBanner}>
            <Component />
          </PageLayout>
        );
      }}
    </Route>
  );
}
