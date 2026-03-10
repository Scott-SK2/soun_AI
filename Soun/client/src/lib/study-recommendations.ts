/**
 * Study Recommendations System
 * 
 * This module provides personalized study recommendations based on:
 * 1. Subject/topic weaknesses identified from quiz results
 * 2. Learning style preferences
 * 3. Evidence-based study techniques
 */

// Types for our recommendation system
export interface StudyTip {
  id: string;
  topic: string;
  technique: string;
  description: string;
  benefits: string[];
  timeRequired: string; // e.g., "5-10 minutes", "30+ minutes"
  effectiveness: 1 | 2 | 3 | 4 | 5; // 1-5 scale
  applicableSubjects: string[]; // e.g., ["mathematics", "physics", "programming"]
  category: StudyTipCategory;
  source?: string; // Optional reference to research/source
}

export type StudyTipCategory = 
  | "memory" 
  | "understanding" 
  | "problem_solving" 
  | "time_management" 
  | "focus" 
  | "motivation"
  | "note_taking"
  | "test_preparation";

// Database of study tips and techniques
export const studyTipsDatabase: StudyTip[] = [
  // Memory techniques
  {
    id: "mem-1",
    topic: "memorization",
    technique: "Spaced Repetition",
    description: "Review material at increasing intervals (1 day, 3 days, 1 week, etc.) rather than cramming all at once.",
    benefits: [
      "Significantly improves long-term retention",
      "Reduces study time by focusing on harder material",
      "Prevents forgetting important concepts"
    ],
    timeRequired: "10-15 minutes daily",
    effectiveness: 5,
    applicableSubjects: ["all"],
    category: "memory",
    source: "Dunlosky et al. (2013)"
  },
  {
    id: "mem-2",
    topic: "memorization",
    technique: "Memory Palace",
    description: "Associate information with specific locations in a familiar place (like your home).",
    benefits: [
      "Helps organize complex information",
      "Excellent for memorizing lists or sequences",
      "Creates strong neural pathways through visualization"
    ],
    timeRequired: "15-20 minutes",
    effectiveness: 4,
    applicableSubjects: ["history", "biology", "language learning"],
    category: "memory"
  },
  {
    id: "mem-3",
    topic: "memorization",
    technique: "Mnemonics and Acronyms",
    description: "Create memorable phrases or words where each letter represents something you need to remember.",
    benefits: [
      "Makes abstract information concrete",
      "Easier to recall during exams",
      "Good for remembering sequences"
    ],
    timeRequired: "5-10 minutes",
    effectiveness: 4,
    applicableSubjects: ["biology", "chemistry", "medicine", "geography"],
    category: "memory"
  },
  
  // Understanding techniques
  {
    id: "under-1",
    topic: "understanding",
    technique: "Feynman Technique",
    description: "Explain the concept in simple terms as if teaching it to someone who has no background in the subject.",
    benefits: [
      "Identifies gaps in your knowledge",
      "Simplifies complex information",
      "Reinforces understanding through explanation"
    ],
    timeRequired: "15-30 minutes",
    effectiveness: 5,
    applicableSubjects: ["all"],
    category: "understanding",
    source: "Richard Feynman"
  },
  {
    id: "under-2",
    topic: "understanding",
    technique: "Concept Mapping",
    description: "Create visual diagrams showing relationships between different concepts and ideas.",
    benefits: [
      "Visualizes connections between concepts",
      "Helps organize information hierarchically",
      "Identifies knowledge gaps"
    ],
    timeRequired: "20-30 minutes",
    effectiveness: 4,
    applicableSubjects: ["sciences", "humanities", "social sciences"],
    category: "understanding"
  },
  {
    id: "under-3",
    topic: "understanding",
    technique: "Analogies and Metaphors",
    description: "Compare new concepts to familiar ones to build understanding bridges.",
    benefits: [
      "Makes abstract concepts concrete",
      "Leverages existing knowledge",
      "Creates memorable associations"
    ],
    timeRequired: "10-15 minutes",
    effectiveness: 4,
    applicableSubjects: ["physics", "chemistry", "economics", "philosophy"],
    category: "understanding"
  },
  
  // Problem-solving techniques
  {
    id: "prob-1",
    topic: "problem solving",
    technique: "Worked Examples Study",
    description: "Analyze worked-out examples step by step before attempting similar problems.",
    benefits: [
      "Builds problem-solving schemas",
      "Reduces cognitive load when learning",
      "Teaches expert strategies"
    ],
    timeRequired: "15-20 minutes",
    effectiveness: 5,
    applicableSubjects: ["mathematics", "physics", "engineering", "computer science"],
    category: "problem_solving",
    source: "Sweller et al. (2011)"
  },
  {
    id: "prob-2",
    topic: "problem solving",
    technique: "Deliberate Practice",
    description: "Focus on specific aspects of performance that need improvement with immediate feedback.",
    benefits: [
      "Targets specific weaknesses",
      "Builds pattern recognition",
      "Develops automacity in basic skills"
    ],
    timeRequired: "30+ minutes",
    effectiveness: 5,
    applicableSubjects: ["mathematics", "physics", "music", "language learning"],
    category: "problem_solving",
    source: "Ericsson (2008)"
  },
  {
    id: "prob-3",
    topic: "problem solving",
    technique: "Interleaving Problems",
    description: "Mix different problem types rather than practicing the same type repeatedly.",
    benefits: [
      "Improves ability to choose correct strategies",
      "Enhances discrimination between problem types",
      "Better prepares for exams and real-world applications"
    ],
    timeRequired: "30+ minutes",
    effectiveness: 4,
    applicableSubjects: ["mathematics", "physics", "chemistry"],
    category: "problem_solving",
    source: "Rohrer & Taylor (2007)"
  },
  
  // Focus techniques
  {
    id: "focus-1",
    topic: "concentration",
    technique: "Pomodoro Technique",
    description: "Work for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer break.",
    benefits: [
      "Maintains focused attention",
      "Prevents burnout",
      "Creates sense of urgency to avoid procrastination"
    ],
    timeRequired: "30 minutes per cycle",
    effectiveness: 4,
    applicableSubjects: ["all"],
    category: "focus"
  },
  {
    id: "focus-2",
    topic: "concentration",
    technique: "Distraction-Free Environment",
    description: "Create a dedicated study space with minimal distractions (turn off notifications, use site blockers).",
    benefits: [
      "Reduces context-switching costs",
      "Creates psychological association with focused work",
      "Improves information processing"
    ],
    timeRequired: "5 minutes setup",
    effectiveness: 4,
    applicableSubjects: ["all"],
    category: "focus"
  },
  
  // Note-taking techniques
  {
    id: "note-1",
    topic: "note taking",
    technique: "Cornell Method",
    description: "Divide your page into sections: notes, cues, and summary. Take notes during class, add cues/questions later, and summarize at the bottom.",
    benefits: [
      "Organizes information clearly",
      "Creates built-in study questions",
      "Facilitates active review"
    ],
    timeRequired: "During class + 10 min review",
    effectiveness: 4,
    applicableSubjects: ["all"],
    category: "note_taking"
  },
  {
    id: "note-2",
    topic: "note taking",
    technique: "Mind Mapping",
    description: "Create visual, non-linear notes that radiate from a central concept with branches for related ideas.",
    benefits: [
      "Shows relationships between concepts",
      "Engages creative thinking",
      "Good for visual learners"
    ],
    timeRequired: "During class or lecture",
    effectiveness: 3,
    applicableSubjects: ["humanities", "social sciences", "brainstorming"],
    category: "note_taking"
  },
  
  // Test preparation
  {
    id: "test-1",
    topic: "test preparation",
    technique: "Practice Testing",
    description: "Use flashcards, practice quizzes, or past exams to test yourself repeatedly.",
    benefits: [
      "Enhances retrieval strength",
      "Identifies knowledge gaps",
      "Reduces test anxiety through familiarity"
    ],
    timeRequired: "30+ minutes",
    effectiveness: 5,
    applicableSubjects: ["all"],
    category: "test_preparation",
    source: "Dunlosky et al. (2013)"
  },
  {
    id: "test-2",
    topic: "test preparation",
    technique: "Teaching Others",
    description: "Explain concepts to classmates or even an imaginary student.",
    benefits: [
      "Forces clear articulation of ideas",
      "Reveals misunderstandings",
      "Strengthens neural connections"
    ],
    timeRequired: "15-30 minutes",
    effectiveness: 4,
    applicableSubjects: ["all"],
    category: "test_preparation"
  },
  
  // Math-specific techniques
  {
    id: "math-1",
    topic: "mathematics",
    technique: "Chunking in Mathematics",
    description: "Group mathematical operations or steps into meaningful units when solving complex problems.",
    benefits: [
      "Reduces cognitive load",
      "Improves working memory efficiency",
      "Helps identify patterns in problem-solving"
    ],
    timeRequired: "Practice during problem-solving",
    effectiveness: 4,
    applicableSubjects: ["mathematics", "physics", "engineering"],
    category: "problem_solving"
  },
  {
    id: "math-2",
    topic: "mathematics",
    technique: "Multiple Representations",
    description: "Convert between different formats: equations, graphs, tables, and verbal descriptions.",
    benefits: [
      "Deepens conceptual understanding",
      "Strengthens different neural pathways",
      "Prepares for different problem presentations"
    ],
    timeRequired: "15-20 minutes per concept",
    effectiveness: 4,
    applicableSubjects: ["mathematics", "physics", "economics"],
    category: "understanding"
  },
  
  // Language learning techniques
  {
    id: "lang-1",
    topic: "language learning",
    technique: "Immersion Practice",
    description: "Surround yourself with the target language through media, apps, or conversation partners.",
    benefits: [
      "Builds vocabulary in context",
      "Improves listening comprehension",
      "Develops authentic usage patterns"
    ],
    timeRequired: "30+ minutes daily",
    effectiveness: 5,
    applicableSubjects: ["language learning"],
    category: "understanding"
  },
  {
    id: "lang-2",
    topic: "language learning",
    technique: "Sentence Mining",
    description: "Collect and study full sentences rather than isolated vocabulary words.",
    benefits: [
      "Shows words in proper context",
      "Teaches grammar implicitly",
      "More effective than word lists"
    ],
    timeRequired: "15-20 minutes daily",
    effectiveness: 4,
    applicableSubjects: ["language learning"],
    category: "memory"
  },
  
  // Science-specific techniques
  {
    id: "sci-1",
    topic: "sciences",
    technique: "Predict-Observe-Explain",
    description: "Before learning a scientific concept, predict what will happen, then observe the actual outcome, and explain any differences.",
    benefits: [
      "Engages prior knowledge",
      "Creates cognitive conflict that enhances learning",
      "Improves scientific reasoning"
    ],
    timeRequired: "15-30 minutes per concept",
    effectiveness: 4,
    applicableSubjects: ["physics", "chemistry", "biology"],
    category: "understanding"
  }
];

// Subject-specific weak topics and associated recommendations
export interface SubjectWeaknessTips {
  subject: string;
  commonWeaknesses: {
    topic: string;
    description: string;
    recommendedTips: string[]; // IDs from studyTipsDatabase
  }[];
}

export const subjectWeaknessTips: SubjectWeaknessTips[] = [
  {
    subject: "mathematics",
    commonWeaknesses: [
      {
        topic: "algebra fundamentals",
        description: "Difficulty with basic algebraic manipulations, equation solving, and understanding variables.",
        recommendedTips: ["prob-1", "math-1", "under-1", "test-1"]
      },
      {
        topic: "mathematical proofs",
        description: "Challenges with constructing logical arguments and understanding proof techniques.",
        recommendedTips: ["under-1", "under-2", "prob-2"]
      },
      {
        topic: "word problems",
        description: "Difficulty translating real-world scenarios into mathematical equations.",
        recommendedTips: ["math-2", "under-3", "prob-3"]
      }
    ]
  },
  {
    subject: "physics",
    commonWeaknesses: [
      {
        topic: "force and motion",
        description: "Misconceptions about Newton's laws and difficulty applying them to problems.",
        recommendedTips: ["sci-1", "prob-1", "math-2", "under-3"]
      },
      {
        topic: "energy concepts",
        description: "Challenges with energy conservation principles and transformations.",
        recommendedTips: ["under-2", "math-2", "sci-1", "prob-2"]
      }
    ]
  },
  {
    subject: "computer science",
    commonWeaknesses: [
      {
        topic: "algorithmic thinking",
        description: "Difficulty breaking down problems into logical steps and designing algorithms.",
        recommendedTips: ["prob-1", "prob-2", "prob-3", "under-1"]
      },
      {
        topic: "debugging",
        description: "Challenges with systematically finding and fixing errors in code.",
        recommendedTips: ["prob-2", "focus-1", "focus-2"]
      }
    ]
  },
  {
    subject: "biology",
    commonWeaknesses: [
      {
        topic: "cellular processes",
        description: "Difficulty understanding complex cellular mechanisms and pathways.",
        recommendedTips: ["mem-2", "mem-3", "under-2", "under-3"]
      },
      {
        topic: "genetics",
        description: "Challenges with genetic inheritance patterns and molecular genetics.",
        recommendedTips: ["prob-1", "under-2", "mem-3", "sci-1"]
      }
    ]
  },
  {
    subject: "chemistry",
    commonWeaknesses: [
      {
        topic: "chemical equations",
        description: "Difficulty balancing equations and understanding stoichiometry.",
        recommendedTips: ["prob-1", "prob-3", "math-1", "test-1"]
      },
      {
        topic: "organic chemistry",
        description: "Challenges with reaction mechanisms and molecular structures.",
        recommendedTips: ["mem-2", "under-2", "prob-2", "note-2"]
      }
    ]
  },
  {
    subject: "history",
    commonWeaknesses: [
      {
        topic: "chronological reasoning",
        description: "Difficulty understanding cause-effect relationships across time periods.",
        recommendedTips: ["under-2", "note-2", "mem-2", "note-1"]
      },
      {
        topic: "historical analysis",
        description: "Challenges with evaluating sources and interpreting historical evidence.",
        recommendedTips: ["under-1", "test-2", "under-3", "note-1"]
      }
    ]
  },
  {
    subject: "language learning",
    commonWeaknesses: [
      {
        topic: "vocabulary retention",
        description: "Difficulty remembering new words long-term.",
        recommendedTips: ["mem-1", "mem-3", "lang-2", "lang-1"]
      },
      {
        topic: "grammar application",
        description: "Challenges applying grammar rules in speech and writing.",
        recommendedTips: ["lang-1", "lang-2", "prob-2", "under-1"]
      }
    ]
  }
];

/**
 * Gets personalized study recommendations based on identified weaknesses
 */
export function getRecommendationsForWeaknesses(
  subject: string,
  weakTopics: string[]
): StudyTip[] {
  const recommendations: StudyTip[] = [];
  
  // Find the subject in our database
  const subjectData = subjectWeaknessTips.find(s => 
    s.subject.toLowerCase() === subject.toLowerCase());
  
  if (subjectData) {
    // For each weakness topic, get the recommended tips
    weakTopics.forEach(weakTopic => {
      const matchingWeakness = subjectData.commonWeaknesses.find(w => 
        w.topic.toLowerCase().includes(weakTopic.toLowerCase()) || 
        weakTopic.toLowerCase().includes(w.topic.toLowerCase()));
      
      if (matchingWeakness) {
        // Get the study tips by ID
        matchingWeakness.recommendedTips.forEach(tipId => {
          const tip = studyTipsDatabase.find(t => t.id === tipId);
          if (tip && !recommendations.includes(tip)) {
            recommendations.push(tip);
          }
        });
      }
    });
  }
  
  // If no specific recommendations found, return general recommendations for the subject
  if (recommendations.length === 0) {
    // Find tips applicable to this subject
    studyTipsDatabase.forEach(tip => {
      if (
        tip.applicableSubjects.includes(subject.toLowerCase()) || 
        tip.applicableSubjects.includes("all")
      ) {
        // Avoid duplicates
        if (!recommendations.includes(tip)) {
          recommendations.push(tip);
        }
      }
    });
    
    // Limit to 5 general recommendations
    return recommendations.slice(0, 5);
  }
  
  return recommendations;
}

/**
 * Gets tips based on a specific study need category
 */
export function getTipsByCategory(category: StudyTipCategory, limit: number = 3): StudyTip[] {
  return studyTipsDatabase
    .filter(tip => tip.category === category)
    .slice(0, limit);
}

/**
 * Gets tips for a specific learning style
 */
export function getTipsForLearningStyle(
  learningStyle: "visual" | "auditory" | "kinesthetic" | "reading/writing",
  limit: number = 3
): StudyTip[] {
  // Map learning styles to relevant study techniques
  const styleToTipMap: Record<string, string[]> = {
    "visual": ["under-2", "note-2", "math-2", "mem-2"],
    "auditory": ["test-2", "under-1", "lang-1"],
    "kinesthetic": ["sci-1", "prob-2", "focus-1"],
    "reading/writing": ["note-1", "lang-2", "test-1", "mem-3"]
  };
  
  const tipIds = styleToTipMap[learningStyle] || [];
  
  // Get the matching tips
  const tips = tipIds
    .map(id => studyTipsDatabase.find(tip => tip.id === id))
    .filter(tip => tip !== undefined) as StudyTip[];
  
  // Add more general tips if we don't have enough
  if (tips.length < limit) {
    studyTipsDatabase
      .filter(tip => !tips.includes(tip) && tip.effectiveness >= 4)
      .slice(0, limit - tips.length)
      .forEach(tip => tips.push(tip));
  }
  
  return tips.slice(0, limit);
}