import React, { createContext, useContext, useState, useEffect } from 'react';
import { MotivationModal } from '@/components/motivation/motivation-modal';
import { useAuth } from './auth-context';

interface MotivationContextType {
  showMotivation: () => void;
  recordStudyStruggle: () => void;
  recordLongSession: () => void;
  recordCompletedTask: () => void;
}

const MotivationContext = createContext<MotivationContextType | undefined>(undefined);

// Time thresholds in milliseconds
const LONG_SESSION_THRESHOLD = 45 * 60 * 1000; // 45 minutes
const STRUGGLE_THRESHOLD = 15 * 60 * 1000; // 15 minutes without progress

export const MotivationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [lastProgressTime, setLastProgressTime] = useState<number | null>(null);
  const [struggleCount, setStruggleCount] = useState(0);
  const [completedTaskCount, setCompletedTaskCount] = useState(0);

  // Start tracking session time when user logs in
  useEffect(() => {
    if (user) {
      const currentTime = Date.now();
      setSessionStartTime(currentTime);
      setLastProgressTime(currentTime);
    } else {
      setSessionStartTime(null);
      setLastProgressTime(null);
    }
  }, [user]);

  // Check for long sessions and study struggles
  useEffect(() => {
    if (!user || !sessionStartTime || !lastProgressTime) return;

    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      
      // Check for long session
      if (currentTime - sessionStartTime > LONG_SESSION_THRESHOLD) {
        // 50% chance to show motivation after a long session
        if (Math.random() > 0.5) {
          setShowModal(true);
          setSessionStartTime(currentTime); // Reset session timer
        }
      }
      
      // Check for struggle (time without marking progress)
      if (currentTime - lastProgressTime > STRUGGLE_THRESHOLD) {
        // Increase probability of showing motivation as struggle persists
        // 30% base chance + 5% for each recorded struggle
        const struggleProbability = 0.3 + (struggleCount * 0.05);
        if (Math.random() < struggleProbability) {
          setShowModal(true);
          setStruggleCount(prev => prev + 1);
          setLastProgressTime(currentTime); // Reset struggle timer
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [user, sessionStartTime, lastProgressTime, struggleCount]);

  // Show motivation after completing several tasks
  useEffect(() => {
    if (completedTaskCount >= 3) {
      setShowModal(true);
      setCompletedTaskCount(0);
    }
  }, [completedTaskCount]);

  const showMotivation = () => {
    setShowModal(true);
  };

  const recordStudyStruggle = () => {
    setStruggleCount(prev => prev + 1);
    setLastProgressTime(Date.now());
    
    // Show motivation if struggle count is high
    if (struggleCount >= 2) {
      setShowModal(true);
      setStruggleCount(0);
    }
  };

  const recordLongSession = () => {
    const currentTime = Date.now();
    if (sessionStartTime && currentTime - sessionStartTime > LONG_SESSION_THRESHOLD) {
      setShowModal(true);
      setSessionStartTime(currentTime);
    }
  };

  const recordCompletedTask = () => {
    setLastProgressTime(Date.now());
    setCompletedTaskCount(prev => prev + 1);
  };

  return (
    <MotivationContext.Provider
      value={{
        showMotivation,
        recordStudyStruggle,
        recordLongSession,
        recordCompletedTask
      }}
    >
      {children}
      <MotivationModal defaultOpen={showModal} />
    </MotivationContext.Provider>
  );
};

export const useMotivation = (): MotivationContextType => {
  const context = useContext(MotivationContext);
  if (context === undefined) {
    throw new Error('useMotivation must be used within a MotivationProvider');
  }
  return context;
};