import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Send, Trophy, Brain, Target, RotateCcw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface MotivationDisplayProps {
  variant?: 'default' | 'mini';
  onClose?: () => void;
}

export function MotivationDisplay({ 
  variant = 'default',
  onClose
}: MotivationDisplayProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [motivationalMessage, setMotivationalMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState('');

  const generateMotivationalMessage = () => {
    setIsGenerating(true);
    
    // In a real implementation, this would call an API endpoint that uses AI
    // to generate a personalized message based on user's career goals and program choice
    setTimeout(() => {
      const messages = [
        `Remember why you chose ${user?.program}: ${user?.programChoiceReason}. Your passion will carry you through this challenge.`,
        `Think about your goal: ${user?.careerGoals}. Every difficult assignment brings you one step closer.`,
        `You're on your way to becoming ${extractCareer(user?.careerGoals || '')}. Today's effort is tomorrow's success.`,
        `Your motivation to study ${user?.program} was: "${truncate(user?.programChoiceReason || '', 120)}". Hold onto that feeling.`,
        `Your career goals are worth fighting for: "${truncate(user?.careerGoals || '', 120)}". Keep pushing forward!`,
      ];
      
      // Select a random message
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setMotivationalMessage(randomMessage);
      setIsGenerating(false);
    }, 1500); // Simulate API call delay
  };

  // Extract potential career from goals text
  const extractCareer = (goals: string): string => {
    if (!goals) return 'a professional';
    
    // Simple extraction based on common phrases
    if (goals.includes('software')) return 'a software professional';
    if (goals.includes('engineer')) return 'an engineer';
    if (goals.includes('doctor')) return 'a doctor';
    if (goals.includes('teacher')) return 'a teacher';
    if (goals.includes('researcher')) return 'a researcher';
    if (goals.includes('scientist')) return 'a scientist';
    if (goals.includes('business')) return 'a business professional';
    
    return 'a successful professional';
  };

  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const handleReflectionSubmit = () => {
    if (reflection.trim().length < 10) {
      toast({
        title: "Reflection too short",
        description: "Please write at least 10 characters",
        variant: "destructive"
      });
      return;
    }

    // In a real app, this would save the reflection to the user's account
    toast({
      title: "Reflection saved",
      description: "Your reflection has been saved to help motivate you in the future."
    });
    setShowReflection(false);
    setReflection('');
  };

  useEffect(() => {
    if (user && variant === 'default') {
      generateMotivationalMessage();
    }
  }, [user, variant]);

  if (!user) {
    return null;
  }

  if (variant === 'mini') {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">
                {motivationalMessage || 
                  `Remember why you chose ${user.program}. Your passion and dedication will help you succeed.`}
              </p>
              <Button 
                variant="link" 
                className="h-auto p-0 text-xs text-primary"
                onClick={generateMotivationalMessage}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg font-semibold">Your Motivation Boost</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <span className="sr-only">Close</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
        <CardDescription>
          When you need a reminder of why you're studying
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showReflection ? (
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Brain className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium">Reflect on your motivation</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Taking a moment to reflect can strengthen your commitment
                </p>
                <Textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What motivated you to start your academic journey? How will your studies help you achieve your goals?"
                  className="min-h-[120px] resize-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start space-x-3">
            <Target className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <div className="bg-muted/50 p-3 rounded-lg">
                {isGenerating ? (
                  <div className="flex items-center justify-center py-3">
                    <svg
                      className="animate-spin h-5 w-5 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="ml-2 text-sm">Generating your motivation...</span>
                  </div>
                ) : (
                  <p className="text-sm">{motivationalMessage}</p>
                )}
              </div>
              <div className="mt-3 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={generateMotivationalMessage}
                  disabled={isGenerating}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowReflection(true)}
                >
                  <Brain className="h-3 w-3 mr-1" />
                  Reflect on my motivation
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {showReflection && (
        <CardFooter className="flex justify-end space-x-2 pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowReflection(false);
              setReflection('');
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleReflectionSubmit}>
            <Send className="h-3.5 w-3.5 mr-1" />
            Save reflection
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}