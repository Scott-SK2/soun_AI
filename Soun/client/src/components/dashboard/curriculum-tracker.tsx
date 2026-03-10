import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2 } from "lucide-react";

export function CurriculumTracker() {
  const curriculumItems = [
    { 
      id: 1, 
      topic: "Introduction to Innovation", 
      progress: 100, 
      completed: true 
    },
    { 
      id: 2, 
      topic: "Strategic Framework", 
      progress: 75, 
      completed: false 
    },
    { 
      id: 3, 
      topic: "Implementation Methods", 
      progress: 40, 
      completed: false 
    },
    { 
      id: 4, 
      topic: "Case Studies", 
      progress: 0, 
      completed: false 
    },
  ];

  const totalProgress = Math.round(
    curriculumItems.reduce((sum, item) => sum + item.progress, 0) / curriculumItems.length
  );

  return (
    <Card data-testid="card-curriculum-tracker">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Curriculum Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" data-testid="progress-overall" />
        </div>

        <div className="space-y-3">
          {curriculumItems.map((item) => (
            <div key={item.id} className="space-y-1" data-testid={`curriculum-item-${item.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.completed && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                  <span className="text-sm">{item.topic}</span>
                </div>
                <span className="text-xs text-muted-foreground">{item.progress}%</span>
              </div>
              <Progress value={item.progress} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
