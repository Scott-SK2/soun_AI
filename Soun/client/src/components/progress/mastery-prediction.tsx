
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, Target, Zap, CheckCircle, AlertCircle, 
  Brain, BookOpen, MessageSquare, Calendar, Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function MasteryPrediction() {
  const { data: masteryStats, isLoading } = useQuery({
    queryKey: ['/api/user/mastery-stats'],
    queryFn: async () => {
      const res = await fetch('/api/user/mastery-stats');
      if (!res.ok) throw new Error('Failed to fetch mastery stats');
      return res.json();
    }
  });

  if (isLoading) {
    return <div>Loading mastery prediction...</div>;
  }

  const potential = masteryStats?.masteryPotential;
  const factors = masteryStats?.improvementFactors;

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Mastery Potential Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Mastery Potential
          </CardTitle>
          <CardDescription>
            Predicted mastery level based on your current learning patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Mastery</span>
                <Badge variant="outline">{potential?.currentMastery}%</Badge>
              </div>
              <Progress value={potential?.currentMastery} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Projected Mastery</span>
                <Badge className="bg-primary">{potential?.projectedMastery}%</Badge>
              </div>
              <Progress value={potential?.projectedMastery} className="h-3" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Potential Increase</span>
                <Badge className="bg-green-600">+{potential?.potentialIncrease}%</Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">Confidence:</span>
                <Badge variant="outline" className={getConfidenceColor(potential?.confidenceLevel)}>
                  {potential?.confidenceLevel}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <strong>Analysis:</strong> With consistent effort on the improvement factors below, 
              you can realistically achieve <strong>{potential?.projectedMastery}% mastery</strong> across 
              your courses. This represents a <strong>+{potential?.potentialIncrease}%</strong> improvement 
              from your current level.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Improvement Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Improvement Factors
          </CardTitle>
          <CardDescription>
            Key areas to focus on for maximum mastery improvement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={factors?.factors?.[0]?.factor || "overview"} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-4">
              {factors?.factors?.map((factor: any, idx: number) => (
                <TabsTrigger key={idx} value={factor.factor} className="text-xs">
                  {factor.factor.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {factors?.factors?.map((factor: any, idx: number) => (
              <TabsContent key={idx} value={factor.factor} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {getImpactIcon(factor.impact)}
                      {factor.factor}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {factor.impact === 'high' ? 'High impact on mastery improvement' : 
                       factor.impact === 'medium' ? 'Moderate impact on mastery' : 
                       'Supporting factor for mastery'}
                    </p>
                  </div>
                  <Badge className={
                    factor.impact === 'high' ? 'bg-red-600' :
                    factor.impact === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                  }>
                    {factor.impact} impact
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Score</span>
                      <span className="font-semibold">{factor.current}%</span>
                    </div>
                    <Progress value={factor.current} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Target Score</span>
                      <span className="font-semibold text-green-600">{factor.target}%</span>
                    </div>
                    <Progress value={factor.target} className="h-2 bg-green-100" />
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Recommended Actions
                  </h4>
                  <ul className="space-y-2">
                    {factor.recommendations.map((rec: string, recIdx: number) => (
                      <li key={recIdx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-start gap-3">
              <Star className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Overall Improvement Potential</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  By addressing these {factors?.factors?.length} factors, you can significantly 
                  boost your mastery scores.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Impact Score:</span>
                  <Progress value={factors?.overallImpactScore} className="h-2 flex-1" />
                  <Badge variant="outline">{Math.round(factors?.overallImpactScore)}%</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
