
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Brain, 
  Clock, 
  Target, 
  Zap,
  MessageCircle,
  Eye,
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle,
  Activity
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

interface AnalyticsInsight {
  type: 'interaction_pattern' | 'optimal_timing' | 'effective_features' | 'learning_velocity';
  title: string;
  description: string;
  data: any;
  confidence: number;
  recommendations: string[];
}

interface PerformanceDashboard {
  overallEffectiveness: number;
  categoryPerformance: Array<{
    category: string;
    effectiveness: number;
    volume: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  learningVelocity: number;
  retentionRate: number;
  engagementMetrics: {
    averageSessionLength: number;
    interactionsPerDay: number;
    completionRate: number;
  };
  recommendations: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function VoiceAnalyticsDashboard() {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('week');

  // Fetch analytics data
  const { data: insights, isLoading: insightsLoading } = useQuery<{ insights: AnalyticsInsight[] }>({
    queryKey: ['/api/voice/analytics/insights', user?.id, selectedTimeframe],
    enabled: !!user?.id
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<PerformanceDashboard>({
    queryKey: ['/api/voice/analytics/dashboard', user?.id],
    enabled: !!user?.id
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<any>({
    queryKey: ['/api/voice/analytics/recommendations', user?.id],
    enabled: !!user?.id
  });

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please log in to view voice analytics.</p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'interaction_pattern':
        return <MessageCircle className="h-5 w-5" />;
      case 'optimal_timing':
        return <Clock className="h-5 w-5" />;
      case 'effective_features':
        return <Eye className="h-5 w-5" />;
      case 'learning_velocity':
        return <Zap className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Prepare chart data
  const categoryData = dashboard?.categoryPerformance?.map(cat => ({
    name: cat.category.replace('_', ' '),
    effectiveness: Math.round(cat.effectiveness),
    volume: cat.volume
  })) || [];

  const engagementData = dashboard ? [
    { name: 'Session Length', value: Math.round(dashboard.engagementMetrics.averageSessionLength / 60), unit: 'min' },
    { name: 'Daily Interactions', value: Math.round(dashboard.engagementMetrics.interactionsPerDay), unit: 'per day' },
    { name: 'Completion Rate', value: Math.round(dashboard.engagementMetrics.completionRate * 100), unit: '%' }
  ] : [];

  if (dashboardLoading || insightsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Voice Learning Analytics</h2>
          <p className="text-muted-foreground">Optimize your voice-based learning experience</p>
        </div>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map(timeframe => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Effectiveness</p>
                <p className="text-2xl font-bold">{Math.round(dashboard?.overallEffectiveness || 0)}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={dashboard?.overallEffectiveness || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learning Velocity</p>
                <p className="text-2xl font-bold">{dashboard?.learningVelocity?.toFixed(1) || '0.0'}</p>
                <p className="text-xs text-muted-foreground">topics/week</p>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-bold">{Math.round((dashboard?.retentionRate || 0) * 100)}%</p>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
            <Progress value={(dashboard?.retentionRate || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Interactions</p>
                <p className="text-2xl font-bold">{Math.round(dashboard?.engagementMetrics.interactionsPerDay || 0)}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="effectiveness" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard?.categoryPerformance?.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-${COLORS[index % COLORS.length]}`}></div>
                        <div>
                          <p className="font-medium capitalize">{category.category.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">{category.volume} interactions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{Math.round(category.effectiveness)}%</span>
                        {getTrendIcon(category.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insights?.insights?.map((insight, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getInsightIcon(insight.type)}
                      {insight.title}
                    </CardTitle>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getConfidenceColor(insight.confidence)}`}></div>
                      {Math.round(insight.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{insight.description}</p>
                  
                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Recommendations:</h4>
                      <ul className="space-y-1">
                        {insight.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {(!insights?.insights || insights.insights.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Not enough data yet to generate insights. Keep using the voice assistant to see personalized analytics!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {recommendations && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personalized Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Personalized Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Preferred Interaction Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.personalizedSettings?.preferredInteractionTypes?.map((type: string, index: number) => (
                        <Badge key={index} variant="outline">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Optimal Session Length</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round((recommendations.personalizedSettings?.recommendedSessionLength || 300) / 60)} minutes
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Adaptive Response Level</h4>
                    <Progress 
                      value={(recommendations.personalizedSettings?.adaptiveResponseLevel || 0.5) * 100} 
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Strategy Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Learning Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.interactionStrategies?.map((strategy: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <Award className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-sm">{strategy}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Timing Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Optimal Timing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.timingRecommendations?.map((timing: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                        <Clock className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm">{timing}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* General Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    General Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard?.recommendations?.map((rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {engagementData.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{metric.name}</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-blue-600">{metric.value}</span>
                        <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: Math.round((dashboard?.engagementMetrics.completionRate || 0) * 100) },
                        { name: 'Incomplete', value: Math.round((1 - (dashboard?.engagementMetrics.completionRate || 0)) * 100) }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
