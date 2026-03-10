
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Volume2, Mic, BookOpen, Target, Lightbulb } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface VocalPracticeHelperProps {
  subject: string;
  topic: string;
  courseId?: string;
}

const vocalStrategies = {
  mathematics: {
    icon: Target,
    strategies: [
      {
        name: "Step-by-Step Explanation",
        description: "Verbally walk through each step of a problem",
        prompts: [
          "Explain what operation you're doing and why",
          "Describe the pattern you see in the problem",
          "Justify your choice of formula or method"
        ]
      },
      {
        name: "Concept Teaching",
        description: "Explain mathematical concepts as if teaching someone",
        prompts: [
          "How would you explain this to a friend?",
          "What real-world example demonstrates this concept?",
          "Why does this formula work the way it does?"
        ]
      }
    ]
  },
  physics: {
    icon: BookOpen,
    strategies: [
      {
        name: "Phenomenon Description",
        description: "Describe what's happening physically in the problem",
        prompts: [
          "What forces are acting in this situation?",
          "How is energy being transformed here?",
          "What would you observe if you could see this happening?"
        ]
      }
    ]
  },
  chemistry: {
    icon: Lightbulb,
    strategies: [
      {
        name: "Reaction Narration",
        description: "Describe chemical processes step by step",
        prompts: [
          "What's happening to the molecules in this reaction?",
          "How are electrons moving or being shared?",
          "What would you see if you could watch this reaction?"
        ]
      }
    ]
  }
};

export function VocalPracticeHelper({ subject, topic, courseId }: VocalPracticeHelperProps) {
  const [activeStrategy, setActiveStrategy] = useState<number>(0);
  const [currentPrompt, setCurrentPrompt] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [userExplanation, setUserExplanation] = useState<string>('');

  const { speak, speaking } = useTextToSpeech();
  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const subjectStrategies = vocalStrategies[subject.toLowerCase() as keyof typeof vocalStrategies] || {
    icon: BookOpen,
    strategies: [
      {
        name: "Verbal Teaching",
        description: "Explain concepts as if teaching someone else",
        prompts: [
          "How would you explain this concept simply?",
          "What examples would help someone understand this?",
          "What questions might someone have about this topic?"
        ]
      }
    ]
  };

  const currentStrategy = subjectStrategies.strategies[activeStrategy];
  const IconComponent = subjectStrategies.icon;

  const handleStartPractice = () => {
    const practicePrompt = `Let's practice explaining ${topic}. ${currentStrategy.description}. ${currentStrategy.prompts[currentPrompt]}`;
    speak(practicePrompt);
  };

  const handleStartRecording = () => {
    resetTranscript();
    startListening();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    stopListening();
    setIsRecording(false);
    if (transcript) {
      setUserExplanation(transcript);
      speak("Great explanation! Try the next prompt to practice different aspects of this topic.");
    }
  };

  const handleNextPrompt = () => {
    if (currentPrompt < currentStrategy.prompts.length - 1) {
      setCurrentPrompt(currentPrompt + 1);
    } else {
      setCurrentPrompt(0);
      if (activeStrategy < subjectStrategies.strategies.length - 1) {
        setActiveStrategy(activeStrategy + 1);
      } else {
        setActiveStrategy(0);
      }
    }
    setUserExplanation('');
    resetTranscript();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          Vocal Practice: {topic}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Practice explaining concepts out loud to deepen your understanding
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strategy Selection */}
        <div>
          <div className="text-sm font-medium mb-2">Practice Strategy:</div>
          <div className="flex flex-wrap gap-2">
            {subjectStrategies.strategies.map((strategy, index) => (
              <Badge
                key={index}
                variant={activeStrategy === index ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setActiveStrategy(index);
                  setCurrentPrompt(0);
                  setUserExplanation('');
                  resetTranscript();
                }}
              >
                {strategy.name}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Current Strategy */}
        <div>
          <h3 className="font-medium mb-2">{currentStrategy.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{currentStrategy.description}</p>
          
          {/* Current Prompt */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="text-sm font-medium text-blue-800 mb-1">Practice Prompt:</div>
            <div className="text-blue-700">{currentStrategy.prompts[currentPrompt]}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <Button onClick={handleStartPractice} disabled={speaking}>
              <Volume2 className="h-4 w-4 mr-2" />
              {speaking ? 'Speaking...' : 'Start Practice'}
            </Button>
            
            <Button
              variant="outline"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={speaking}
            >
              <Mic className="h-4 w-4 mr-2" />
              {isRecording ? 'Stop Recording' : 'Record Explanation'}
            </Button>
          </div>

          {/* Recording Status */}
          {isListening && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="text-red-700 text-sm font-medium">🎤 Recording your explanation...</div>
              <div className="text-red-600 text-sm">Speak clearly and explain the concept out loud</div>
            </div>
          )}

          {/* User's Explanation */}
          {userExplanation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="text-green-800 text-sm font-medium mb-1">Your Explanation:</div>
              <div className="text-green-700">{userExplanation}</div>
            </div>
          )}

          {/* Next Prompt Button */}
          {userExplanation && (
            <Button onClick={handleNextPrompt} className="w-full">
              Next Practice Prompt
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="text-xs text-muted-foreground text-center">
          Strategy {activeStrategy + 1} of {subjectStrategies.strategies.length} • 
          Prompt {currentPrompt + 1} of {currentStrategy.prompts.length}
        </div>
      </CardContent>
    </Card>
  );
}
