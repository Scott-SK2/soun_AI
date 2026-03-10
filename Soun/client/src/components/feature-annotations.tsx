import { useState, useEffect } from "react";
import { FeatureTooltip } from "@/components/ui/feature-tooltip";
import { Button } from "@/components/ui/button";
import { InfoIcon, RefreshCw } from "lucide-react";
import { useFeatureTour } from "@/context/feature-tour-context";

// Interface for the help menu that appears in the bottom right
interface HelpMenuProps {
  onRestartTour: () => void;
}

function HelpMenu({ onRestartTour }: HelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen && (
        <div className="bg-card shadow-lg rounded-lg p-4 mb-3 border border-border">
          <h3 className="font-medium mb-3">Need help?</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={onRestartTour}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Restart Feature Tour
            </Button>
          </div>
        </div>
      )}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <InfoIcon />
      </Button>
    </div>
  );
}

export function FeatureAnnotations() {
  const { resetTour } = useFeatureTour();
  const [showAll, setShowAll] = useState(false);
  
  // Force all tooltips to show when showAll is true
  useEffect(() => {
    if (showAll) {
      // Clear localStorage for all tooltips
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('tooltip_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [showAll]);
  
  const handleRestartTour = () => {
    resetTour();
  };
  
  return (
    <>
      {/* Permanent tooltips for key features */}
      <HelpMenu onRestartTour={handleRestartTour} />
    </>
  );
}