import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Achievement } from "@/lib/types";

export function Achievements() {
  const { data: achievements = [], isLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/achievements'],
  });

  const recentAchievements = achievements.slice(0, 3);

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-800 font-poppins">Recent Achievements</CardTitle>
      </CardHeader>
      
      <CardContent className="px-4 py-3">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Loading achievements...</div>
        ) : recentAchievements.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No achievements yet. Keep studying!</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              {recentAchievements.map((achievement) => (
                <div key={achievement.id} className="achievement-badge flex flex-col items-center group cursor-pointer" title={achievement.description}>
                  <div className={`h-14 w-14 rounded-full ${achievement.bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    <i className={`${achievement.icon} text-2xl ${achievement.iconColor}`}></i>
                  </div>
                  <span className="text-xs text-gray-700 mt-2 text-center">{achievement.title}</span>
                </div>
              ))}
            </div>
            
            {achievements.length > 3 && (
              <div className="mt-3 text-center">
                <Button variant="link" className="text-sm text-primary hover:text-primary/90 font-medium">
                  View all achievements
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
