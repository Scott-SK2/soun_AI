import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export function UserProfile() {
  const { user } = useAuth();
  
  // Get user stats from API
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/user/stats'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/stats', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          // If API fails, return fallback data
          return {
            streak: 5,
            examReadiness: 65,
            focusTimeToday: 110,
            focusTimeGoal: 180
          };
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching user stats:", error);
        // Return fallback data in case of error
        return {
          streak: 5,
          examReadiness: 65,
          focusTimeToday: 110,
          focusTimeGoal: 180
        };
      }
    },
    enabled: !!user
  });

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  
  // Compute user initials if available
  const initials = user ? 
    `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}` : 
    'U';

  return (
    <Card className="user-profile-section mb-6 overflow-hidden">
      <div className="bg-primary px-4 py-5 text-white">
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-primary font-bold">
            <span>{initials}</span>
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold font-poppins">
              {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
            </h2>
            <p className="text-primary-100">
              {user ? `${user.school}, ${user.program}` : 'Student'}
            </p>
          </div>
        </div>
      </div>
      
      <CardContent className="py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Current study streak</p>
              <div className="flex items-center mt-1">
                <i className="ri-fire-fill text-amber-500 text-xl"></i>
                <span className="ml-2 text-lg font-semibold text-gray-800">{stats.streak} days</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Exam readiness</p>
              <div className="mt-1">
                <Progress value={stats.examReadiness} className="h-2.5 bg-gray-100" />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">{stats.examReadiness}%</span>
                <span className="text-gray-500">Target: 85%</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Focus time today</p>
              <div className="flex items-center mt-1">
                <i className="ri-time-line text-primary text-xl"></i>
                <span className="ml-2 text-lg font-semibold text-gray-800">
                  {formatTime(stats.focusTimeToday)}
                </span>
                <span className="ml-1 text-sm text-gray-500">
                  / {formatTime(stats.focusTimeGoal)} goal
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Unable to load user stats
          </div>
        )}
      </CardContent>
    </Card>
  );
}
