import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Play, Clock, BarChart3, Zap } from "lucide-react";
import { VoiceCommand } from "@/lib/types";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function VoiceAnalysisDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<{
    speaking_rate: number;
    clarity_score: number;
    filler_words: { word: string; count: number }[];
    sentiment_score: number;
    confidence_score: number;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Fetch voice command history from the API
  const { data: voiceCommands, isLoading: commandsLoading } = useQuery<VoiceCommand[]>({
    queryKey: ['/api/voice/history']
  });
  
  // Monthly voice usage data
  const voiceUsageData = [
    { month: 'Jan', commands: 87 },
    { month: 'Feb', commands: 112 },
    { month: 'Mar', commands: 136 },
    { month: 'Apr', commands: 157 },
    { month: 'May', commands: 129 },
    { month: 'Jun', commands: 180 },
  ];
  
  // Voice command types distribution
  const commandTypesData = [
    { type: 'Questions', count: 35, percentage: 35 },
    { type: 'Study Sessions', count: 25, percentage: 25 },
    { type: 'Quiz Requests', count: 20, percentage: 20 },
    { type: 'Reminders', count: 10, percentage: 10 },
    { type: 'Explanations', count: 10, percentage: 10 },
  ];
  
  // Mock speech analysis data
  const speechAnalysisData = {
    speaking_rate: 158, // words per minute
    clarity_score: 85,
    filler_words: [
      { word: "um", count: 5 },
      { word: "like", count: 8 },
      { word: "you know", count: 3 }
    ],
    sentiment_score: 78, // positive
    confidence_score: 82
  };
  
  const handleRecordToggle = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // In a real app, this would send the recording to the server for analysis
      setTimeout(() => {
        setAnalysis(speechAnalysisData);
      }, 1000);
    } else {
      // Start recording
      setIsRecording(true);
      setTranscript("");
      setAnalysis(null);
      
      // Simulate transcription in real-time
      let fullText = "Today I want to discuss the fundamental principles of algorithm analysis. Um, when we evaluate algorithms, we mainly focus on time complexity and space complexity. Like, time complexity measures how the runtime of an algorithm grows with input size, while space complexity measures memory usage. You know, understanding these concepts helps us write more efficient code.";
      let index = 0;
      
      const interval = setInterval(() => {
        if (index < fullText.length) {
          const nextChar = fullText.charAt(index);
          setTranscript(prev => prev + nextChar);
          index++;
        } else {
          clearInterval(interval);
          setIsRecording(false);
          setAnalysis(speechAnalysisData);
        }
      }, 50);
    }
  };
  
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} mins ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Add audio playback capability
  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Voice Interaction Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Interaction Analysis</CardTitle>
          <CardDescription>Analyze your voice interactions and improve your speaking skills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="mb-2">
                <BarChart3 className="w-8 h-8 mx-auto text-primary" />
              </div>
              <p className="text-3xl font-bold">720</p>
              <p className="text-sm text-muted-foreground">Total Voice Commands</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="mb-2">
                <Clock className="w-8 h-8 mx-auto text-blue-500" />
              </div>
              <p className="text-3xl font-bold">158</p>
              <p className="text-sm text-muted-foreground">Avg. Speaking Rate (wpm)</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="mb-2">
                <Zap className="w-8 h-8 mx-auto text-amber-500" />
              </div>
              <p className="text-3xl font-bold">85%</p>
              <p className="text-sm text-muted-foreground">Speech Clarity Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Voice Recorder and Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Voice Recording & Analysis</CardTitle>
            <CardDescription>
              Record your voice to analyze speaking patterns and improve clarity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center">
                <Button 
                  onClick={handleRecordToggle}
                  variant={isRecording ? "destructive" : "default"}
                  size="lg"
                  className="h-16 w-16 rounded-full mb-4"
                >
                  {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <p className="text-center font-medium">
                  {isRecording ? "Recording... Click to stop" : "Click to start recording"}
                </p>
              </div>
              
              {transcript && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Transcript:</p>
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    {transcript}
                  </div>
                </div>
              )}
              
              {analysis && (
                <div className="space-y-4 mt-4">
                  <p className="font-medium">Analysis Results:</p>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Speaking Rate</span>
                        <span className="text-sm font-medium">{analysis.speaking_rate} wpm</span>
                      </div>
                      <Progress value={Math.min(analysis.speaking_rate / 2, 100)} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Clarity</span>
                        <span className="text-sm font-medium">{analysis.clarity_score}%</span>
                      </div>
                      <Progress value={analysis.clarity_score} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Confidence</span>
                        <span className="text-sm font-medium">{analysis.confidence_score}%</span>
                      </div>
                      <Progress value={analysis.confidence_score} className="h-2" />
                    </div>
                    
                    <div>
                      <p className="text-sm mb-2">Filler Words:</p>
                      <div className="flex gap-2 flex-wrap">
                        {analysis.filler_words.map((word, i) => (
                          <Badge key={i} variant="outline" className="bg-gray-100">
                            {word.word}: {word.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-sm mb-2">Recommendations:</p>
                    <ul className="text-sm list-disc pl-5 space-y-1">
                      <li>Try to reduce filler words like "um" and "like"</li>
                      <li>Your speaking rate is good (150-160 wpm is ideal)</li>
                      <li>Practice using more varied intonation to improve engagement</li>
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="flex justify-center mt-4">
                <Button variant="outline" size="sm" onClick={playAudio} disabled={!analysis}>
                  <Play className="h-4 w-4 mr-2" />
                  Play Recording
                </Button>
                <audio ref={audioRef} className="hidden">
                  <source src="/sample-audio.mp3" type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Voice Command History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Voice Commands</CardTitle>
            <CardDescription>
              History of your recent voice interactions with the assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {commandsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {!voiceCommands || voiceCommands.length === 0 ? (
                  <div className="text-center py-10">
                    <Mic className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No voice commands yet</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Try using the voice assistant to see your command history
                    </p>
                  </div>
                ) : (
                  voiceCommands.map((command, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{command.command}</p>
                        <Badge variant="outline" className="text-xs">
                          {formatTimestamp(command.timestamp)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{command.response}</p>
                      <div className="pt-1">
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {command.action}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Voice Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Voice Command Usage</CardTitle>
            <CardDescription>
              Monthly usage of voice commands over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={voiceUsageData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="commands" 
                  name="Voice Commands" 
                  stroke="#4f46e5" 
                  strokeWidth={2} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Command Types</CardTitle>
            <CardDescription>
              Distribution of voice command types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={commandTypesData}
                  dataKey="percentage"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {commandTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}