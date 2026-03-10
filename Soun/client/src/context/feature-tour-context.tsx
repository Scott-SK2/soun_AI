import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type FeatureTourContextType = {
  showTour: boolean;
  setShowTour: (show: boolean) => void;
  hasSeenTour: boolean;
  markTourAsSeen: () => void;
  resetTour: () => void;
};

const FeatureTourContext = createContext<FeatureTourContextType | undefined>(undefined);

const TOUR_STORAGE_KEY = "study_assistant_seen_tour";

export function FeatureTourProvider({ children }: { children: ReactNode }) {
  const [showTour, setShowTour] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default to true until we check localStorage
  
  // Check if the user has seen the tour before
  useEffect(() => {
    const hasSeenTourBefore = localStorage.getItem(TOUR_STORAGE_KEY) === "true";
    setHasSeenTour(hasSeenTourBefore);
    
    // If this is the first visit, show the tour
    if (!hasSeenTourBefore) {
      setShowTour(true);
    }
  }, []);
  
  const markTourAsSeen = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setHasSeenTour(true);
    setShowTour(false);
  };
  
  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setHasSeenTour(false);
    setShowTour(true);
  };
  
  return (
    <FeatureTourContext.Provider value={{ 
      showTour, 
      setShowTour, 
      hasSeenTour, 
      markTourAsSeen,
      resetTour 
    }}>
      {children}
    </FeatureTourContext.Provider>
  );
}

export function useFeatureTour() {
  const context = useContext(FeatureTourContext);
  if (context === undefined) {
    throw new Error("useFeatureTour must be used within a FeatureTourProvider");
  }
  return context;
}