
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Award, Target, TrendingUp, BookOpen } from "lucide-react";

interface ConceptMastery {
  concept: string;
  masteryLevel: number;
  strengths: string[];
  weaknesses: string[];
  recommendedActions: string[];
}

interface CourseMastery {
  courseId: string;
  courseName: string;
  averageMastery: number;
  topicsStudied: number;
  accuracy: number;
  totalQuestionAttempts: number;
  masteryLevels: Array<{
    topic: string;
    masteryLevel: number;
    lastUpdated: Date;
  }>;
}

export function MasteryDashboard() {
  const { data: masteryData, isLoading } = useQuery({
    queryKey: ['/api/user/mastery'],
    queryFn: async () => {
      const res = await fetch('/api/user/mastery');
      if (!res.ok) throw new Error('Failed to fetch mastery data');
      return res.json();
    }
  });

  if (isLoading) {
    return <div>Loading mastery data...</div>;
  }

  const getMasteryColor = (level: number) => {
    if (level >= 80) return 'bg-green-100 text-green-800';
    if (level >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Mastery</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{masteryData?.overallMastery || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Across {masteryData?.topicsStudied || 0} topics
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Studied</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{masteryData?.courses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active learning paths
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topics Mastered</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {masteryData?.courses?.reduce((sum: number, course: CourseMastery) => 
                sum + course.masteryLevels.filter(level => level.masteryLevel >= 80).length, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              80%+ mastery achieved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12%</div>
            <p className="text-xs text-muted-foreground">
              This week vs last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Mastery Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {masteryData?.courses?.map((course: CourseMastery) => (
          <Card key={course.courseId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{course.courseName}</span>
                <Badge className={getMasteryColor(course.averageMastery)}>
                  {course.averageMastery}% mastery
                </Badge>
              </CardTitle>
              <CardDescription>
                {course.topicsStudied} topics • {course.accuracy}% accuracy • {course.totalQuestionAttempts} questions attempted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.masteryLevels.map((topic) => (
                <div key={topic.topic} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{topic.topic}</span>
                    <span className="text-muted-foreground">{topic.masteryLevel}%</span>
                  </div>
                  <Progress value={topic.masteryLevel} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Most Studied Course */}
      {masteryData?.mostStudiedCourse && (
        <Card>
          <CardHeader>
            <CardTitle>🏆 Most Active Course</CardTitle>
            <CardDescription>Your most engaged learning path</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{masteryData.mostStudiedCourse.courseName}</h3>
                <p className="text-sm text-muted-foreground">
                  {masteryData.mostStudiedCourse.totalQuestionAttempts} questions • {masteryData.mostStudiedCourse.accuracy}% accuracy
                </p>
              </div>
              <Badge className={getMasteryColor(masteryData.mostStudiedCourse.averageMastery)}>
                {masteryData.mostStudiedCourse.averageMastery}% mastery
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
