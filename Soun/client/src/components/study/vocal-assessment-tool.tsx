
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, RefreshCw, Target } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface VocalAssessmentProps {
  targetText: string;
  subject: string;
  onAssessmentComplete?: (results: AssessmentResults) => void;
}

interface AssessmentResults {
  clarityScore: number;
  pronunciationScore: number;
  paceScore: number;
  volumeScore: number;
  overallScore: number;
  suggestions: string[];
  wordsPerMinute: number;
  pauseAnalysis: {
    appropriatePauses: number;
    missedPauses: number;
    excessivePauses: number;
  };
}

export function VocalAssessmentTool({ targetText, subject, onAssessmentComplete }: VocalAssessmentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResults | null>(null);
  const [targetAudio, setTargetAudio] = useState<HTMLAudioElement | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { speak, speaking } = useTextToSpeech();
  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const playTargetAudio = async () => {
    speak(targetText);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Setup recording
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        analyzeRecording();
      };

      mediaRecorderRef.current.start();
      startListening();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stopListening();
      setIsRecording(false);
    }
  };

  const analyzeRecording = async () => {
    const recordingEndTime = Date.now();
    const duration = recordingStartTime ? (recordingEndTime - recordingStartTime) / 1000 : 0;
    
    // Calculate words per minute
    const wordCount = transcript.split(' ').filter(word => word.length > 0).length;
    const wordsPerMinute = duration > 0 ? (wordCount / duration) * 60 : 0;

    // Text similarity analysis
    const similarity = calculateTextSimilarity(targetText.toLowerCase(), transcript.toLowerCase());
    
    // Audio analysis (simplified - in production you'd use more sophisticated analysis)
    const volumeScore = analyzeVolume();
    const paceScore = analyzePace(wordsPerMinute);
    const pauseAnalysis = analyzePauses(transcript, targetText);
    
    const clarityScore = similarity * 100;
    const pronunciationScore = Math.min(100, clarityScore + (volumeScore * 0.3));
    const overallScore = (clarityScore + pronunciationScore + paceScore + volumeScore) / 4;

    const results: AssessmentResults = {
      clarityScore,
      pronunciationScore,
      paceScore,
      volumeScore,
      overallScore,
      wordsPerMinute,
      pauseAnalysis,
      suggestions: generateSuggestions(clarityScore, paceScore, volumeScore, pauseAnalysis)
    };

    setAssessment(results);
    onAssessmentComplete?.(results);
  };

  const calculateTextSimilarity = (target: string, spoken: string): number => {
    const targetWords = target.split(' ');
    const spokenWords = spoken.split(' ');
    
    let matches = 0;
    for (const word of targetWords) {
      if (spokenWords.includes(word)) {
        matches++;
      }
    }
    
    return targetWords.length > 0 ? matches / targetWords.length : 0;
  };

  const analyzeVolume = (): number => {
    if (!analyserRef.current) return 75;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    return Math.min(100, (average / 128) * 100);
  };

  const analyzePace = (wpm: number): number => {
    const optimalWPM = subject === 'mathematics' ? 120 : 150; // Slower for technical subjects
    const difference = Math.abs(wpm - optimalWPM);
    return Math.max(0, 100 - (difference / optimalWPM) * 100);
  };

  const analyzePauses = (spoken: string, target: string) => {
    const spokenPauses = (spoken.match(/[.!?]/g) || []).length;
    const targetPauses = (target.match(/[.!?]/g) || []).length;
    
    return {
      appropriatePauses: Math.min(spokenPauses, targetPauses),
      missedPauses: Math.max(0, targetPauses - spokenPauses),
      excessivePauses: Math.max(0, spokenPauses - targetPauses)
    };
  };

  const generateSuggestions = (clarity: number, pace: number, volume: number, pauses: any): string[] => {
    const suggestions: string[] = [];
    
    if (clarity < 70) {
      suggestions.push("Focus on pronouncing each word clearly and distinctly");
      suggestions.push("Slow down to improve articulation");
    }
    
    if (pace < 60) {
      suggestions.push("Try to maintain a more consistent speaking pace");
      if (pace < 40) suggestions.push("Speak more slowly for technical content");
      if (pace > 80) suggestions.push("Speak more quickly to maintain engagement");
    }
    
    if (volume < 50) {
      suggestions.push("Speak louder to improve clarity and confidence");
    }
    
    if (pauses.missedPauses > 2) {
      suggestions.push("Add more pauses at punctuation marks for better comprehension");
    }
    
    if (pauses.excessivePauses > 2) {
      suggestions.push("Reduce unnecessary pauses to maintain flow");
    }

    return suggestions;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Vocal Assessment Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Text Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Target Text:</h4>
            <Button size="sm" variant="outline" onClick={playTargetAudio} disabled={speaking}>
              <Volume2 className="h-4 w-4 mr-1" />
              Play Example
            </Button>
          </div>
          <p className="text-sm">{targetText}</p>
        </div>

        {/* Recording Controls */}
        <div className="flex gap-2">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            disabled={speaking}
          >
            {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {isRecording ? 'Stop Recording' : 'Start Assessment'}
          </Button>
          
          {assessment && (
            <Button variant="outline" onClick={() => { setAssessment(null); resetTranscript(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>

        {/* Recording Status */}
        {isListening && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-red-700 font-medium">🎤 Recording in progress...</div>
            <div className="text-red-600 text-sm">Read the target text clearly</div>
          </div>
        )}

        {/* Live Transcript */}
        {transcript && (
          <div className="bg-gray-50 border rounded-lg p-3">
            <h4 className="font-medium mb-1">Your Speech:</h4>
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        {/* Assessment Results */}
        {assessment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Clarity</span>
                  <span className="text-sm">{Math.round(assessment.clarityScore)}%</span>
                </div>
                <Progress value={assessment.clarityScore} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Pronunciation</span>
                  <span className="text-sm">{Math.round(assessment.pronunciationScore)}%</span>
                </div>
                <Progress value={assessment.pronunciationScore} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Pace</span>
                  <span className="text-sm">{Math.round(assessment.paceScore)}%</span>
                </div>
                <Progress value={assessment.paceScore} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Volume</span>
                  <span className="text-sm">{Math.round(assessment.volumeScore)}%</span>
                </div>
                <Progress value={assessment.volumeScore} />
              </div>
            </div>

            {/* Overall Score */}
            <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Score</span>
                <Badge variant={assessment.overallScore >= 80 ? "default" : assessment.overallScore >= 60 ? "secondary" : "destructive"}>
                  {Math.round(assessment.overallScore)}%
                </Badge>
              </div>
              <Progress value={assessment.overallScore} className="mt-2" />
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Words per minute:</span> {Math.round(assessment.wordsPerMinute)}
              </div>
              <div>
                <span className="font-medium">Appropriate pauses:</span> {assessment.pauseAnalysis.appropriatePauses}
              </div>
            </div>

            {/* Suggestions */}
            {assessment.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Improvement Suggestions:</h4>
                <ul className="space-y-1">
                  {assessment.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
