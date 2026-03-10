import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { WeeklyStudyData, SubjectDistribution } from "@/lib/types";

export function StudyProgress() {
  const { data: weeklyData = [], isLoading: weeklyLoading } = useQuery<WeeklyStudyData[]>({
    queryKey: ['/api/progress/weekly'],
  });

  const { data: subjectDistribution = [], isLoading: subjectLoading } = useQuery<SubjectDistribution[]>({
    queryKey: ['/api/progress/subjects'],
  });

  const { data: weekSummary, isLoading: summaryLoading } = useQuery<{
    total: number;
    percentChange: number;
  }>({
    queryKey: ['/api/progress/summary'],
  });

  const totalStudyTime = weekSummary?.total || 0;
  const percentChange = weekSummary?.percentChange || 0;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Get maximum value for scaling chart bars
  const maxStudyTime = weeklyData.length > 0 
    ? Math.max(...weeklyData.map(day => day.minutes)) 
    : 100;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card className="bg-white rounded-lg shadow overflow-hidden">
      <CardHeader className="px-4 py-5 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-800 font-poppins">Weekly Study Progress</CardTitle>
      </CardHeader>
      
      <CardContent className="px-4 py-5">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total study time this week</p>
            <p className="text-2xl font-semibold text-gray-800">
              {summaryLoading ? "Loading..." : formatTime(totalStudyTime)}
            </p>
          </div>
          <div>
            {!summaryLoading && (
              <span 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  percentChange >= 0 
                    ? "bg-green-100 text-green-600" 
                    : "bg-red-100 text-red-600"
                }`}
              >
                <i className={`${percentChange >= 0 ? "ri-arrow-up-line" : "ri-arrow-down-line"} mr-1`}></i>
                {Math.abs(percentChange)}% from last week
              </span>
            )}
          </div>
        </div>
        
        {/* Weekly Chart */}
        <div className="h-60 flex items-end justify-between space-x-2">
          {weeklyLoading ? (
            <div className="w-full flex items-center justify-center">
              <p className="text-gray-500">Loading chart data...</p>
            </div>
          ) : (
            weeklyData.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative w-full">
                  <div 
                    className={`chart-bar ${
                      day.isToday ? "bg-primary" : day.isPast ? "bg-primary/80" : "bg-primary/40"
                    } rounded-t-md w-full`} 
                    style={{ height: `${(day.minutes / maxStudyTime) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{dayNames[index]}</p>
              </div>
            ))
          )}
        </div>
        
        {/* Study Distribution */}
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Study Distribution by Subject</h4>
          <div className="space-y-4">
            {subjectLoading ? (
              <div className="text-center py-4 text-gray-500">Loading subject data...</div>
            ) : (
              subjectDistribution.map((subject, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700">{subject.name}</span>
                    <span className="text-sm text-gray-500">{formatTime(subject.minutes)}</span>
                  </div>
                  <Progress 
                    value={subject.percentage} 
                    className="h-2 bg-gray-100"
                    indicatorClassName={subject.color}
                  />
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <Button className="bg-primary hover:bg-primary/90">
            View detailed analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
