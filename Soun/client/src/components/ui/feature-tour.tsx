import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface TourStep {
  title: string;
  description: string;
  image?: string;
  highlight?: string;
}

interface FeatureTourProps {
  steps: TourStep[];
  onComplete: () => void;
  isOpen: boolean;
}

export function FeatureTour({ steps, onComplete, isOpen }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Close tour if isOpen becomes false
  useEffect(() => {
    if (!isOpen) {
      onComplete();
    }
  }, [isOpen, onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="relative">
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          <CardTitle>
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {steps[currentStep].image && (
            <div className="mb-4 rounded-lg overflow-hidden border border-border">
              <img 
                src={steps[currentStep].image} 
                alt={steps[currentStep].title} 
                className="w-full object-cover"
              />
            </div>
          )}
          {steps[currentStep].highlight && (
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-secondary-foreground">{steps[currentStep].highlight}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleSkip}>
            Skip Tour
          </Button>
          <Button onClick={handleNext}>
            {currentStep < steps.length - 1 ? "Next" : "Finish"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}