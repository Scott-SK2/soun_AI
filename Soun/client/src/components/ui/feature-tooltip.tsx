import { useState, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeatureTooltipProps {
  title: string;
  description: string;
  position?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
  storageKey: string;
  delay?: number;
}

export function FeatureTooltip({
  title,
  description,
  position = "bottom",
  children,
  storageKey,
  delay = 500,
}: FeatureTooltipProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Default to true until we check localStorage
  
  useEffect(() => {
    // Check if this tooltip has been dismissed before
    const isDismissed = localStorage.getItem(`tooltip_${storageKey}`) === "dismissed";
    setDismissed(isDismissed);
    
    // Only show after a delay if not dismissed
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setShow(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [storageKey, delay]);
  
  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem(`tooltip_${storageKey}`, "dismissed");
  };
  
  // Position classes
  const positionClasses = {
    top: "bottom-full mb-2",
    right: "left-full ml-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
  };
  
  return (
    <div className="relative inline-flex group">
      {children}
      
      {!dismissed && (
        <div 
          className={`absolute z-50 ${positionClasses[position]} ${show ? "opacity-100" : "opacity-0"} transition-opacity duration-300 min-w-[250px] max-w-xs`}
        >
          <Card>
            <CardContent className="p-3 text-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium mb-1">{title}</p>
                  <p className="text-muted-foreground text-xs">{description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-1 -mt-1"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {!dismissed && !show && (
        <HelpCircle 
          className="absolute -top-2 -right-2 h-5 w-5 text-primary animate-pulse cursor-pointer"
          onClick={() => setShow(true)}
        />
      )}
    </div>
  );
}