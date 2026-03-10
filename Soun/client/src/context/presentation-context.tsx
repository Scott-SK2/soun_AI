import React, { createContext, useState, useContext, ReactNode } from "react";

// Type definitions
export interface OutlineSection {
  id: string;
  title: string;
  content: string;
  time: number;
  suggestions: string[];
}

export interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  preparedAnswer: string;
  source: 'generated' | 'manual';
  isFavorite: boolean;
}

export interface Suggestion {
  id: string;
  original: string;
  suggested: string;
  type: "grammar" | "clarity" | "academic" | "conciseness";
  explanation: string;
  startIndex: number;
  endIndex: number;
  applied: boolean;
}

export interface PracticeRecording {
  id: string;
  date: string;
  duration: number;
  audioUrl: string | null;
  transcript: string;
  feedback: any | null;
  wordsPerMinute?: number;
  paceStatus?: 'slow' | 'good' | 'fast' | null;
}

interface PresentationContextType {
  // Presentation metadata
  title: string;
  setTitle: (title: string) => void;
  
  // Outline data
  outlineSections: OutlineSection[];
  setOutlineSections: (sections: OutlineSection[]) => void;
  
  // Complete presentation text
  fullText: string;
  setFullText: (text: string) => void;
  
  // Text revision data
  textSuggestions: Suggestion[];
  setTextSuggestions: (suggestions: Suggestion[]) => void;
  
  // Questions
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  
  // Practice recordings
  recordings: PracticeRecording[];
  setRecordings: (recordings: PracticeRecording[]) => void;
  
  // Helper functions
  regenerateFullText: () => void;
  clearAll: () => void;
}

// Initial values
const initialOutlineSections: OutlineSection[] = [
  { id: "1", title: "Introduction", content: "", time: 2, suggestions: [] },
  { id: "2", title: "Main Points", content: "", time: 8, suggestions: [] },
  { id: "3", title: "Supporting Evidence", content: "", time: 5, suggestions: [] },
  { id: "4", title: "Conclusion", content: "", time: 2, suggestions: [] }
];

// Create the context
export const PresentationContext = createContext<PresentationContextType | undefined>(undefined);

// Provider component
export function PresentationProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string>("My Presentation");
  const [outlineSections, setOutlineSections] = useState<OutlineSection[]>(initialOutlineSections);
  const [fullText, setFullText] = useState<string>("");
  const [textSuggestions, setTextSuggestions] = useState<Suggestion[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [recordings, setRecordings] = useState<PracticeRecording[]>([]);

  // Function to regenerate full text from outline sections
  const regenerateFullText = () => {
    let generatedText = `# ${title}\n\n`;
    
    outlineSections.forEach(section => {
      generatedText += `## ${section.title}\n\n${section.content}\n\n`;
    });
    
    setFullText(generatedText.trim());
  };

  // Function to clear all data
  const clearAll = () => {
    setTitle("My Presentation");
    setOutlineSections(initialOutlineSections);
    setFullText("");
    setTextSuggestions([]);
    setQuestions([]);
    setRecordings([]);
  };

  return (
    <PresentationContext.Provider
      value={{
        title,
        setTitle,
        outlineSections,
        setOutlineSections,
        fullText,
        setFullText,
        textSuggestions,
        setTextSuggestions,
        questions,
        setQuestions,
        recordings,
        setRecordings,
        regenerateFullText,
        clearAll
      }}
    >
      {children}
    </PresentationContext.Provider>
  );
}

// Custom hook for using the presentation context
export function usePresentation() {
  const context = useContext(PresentationContext);
  if (context === undefined) {
    throw new Error("usePresentation must be used within a PresentationProvider");
  }
  return context;
}