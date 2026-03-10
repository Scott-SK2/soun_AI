
import OpenAI from "openai";
import { documentAnalysisService } from "./document-analysis-service";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'explanation';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  conceptTested: string;
  documentReference?: string;
}

export interface QuizResult {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation: string;
  conceptMastery: number; // 0-1 score
}

export interface ConceptAssessment {
  concept: string;
  masteryLevel: number; // 0-1
  strengths: string[];
  weaknesses: string[];
  recommendedActions: string[];
}

export class QuizGenerationService {
  /**
   * Generate quiz questions immediately after an explanation
   */
  async generatePostExplanationQuiz(
    explanationTopic: string,
    explanationContent: string,
    documentContext?: string,
    difficulty: 'adaptive' | 'easy' | 'medium' | 'hard' = 'adaptive'
  ): Promise<QuizQuestion[]> {
    try {
      const prompt = this.buildPostExplanationPrompt(
        explanationTopic, 
        explanationContent, 
        documentContext, 
        difficulty
      );

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educator creating quiz questions to test understanding immediately after an explanation. Generate questions that validate comprehension, not just memorization. Always return valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      return this.validateQuestions(result.questions || []);
    } catch (error) {
      console.error('Quiz generation error:', error);
      throw new Error('Failed to generate post-explanation quiz');
    }
  }

  /**
   * Generate comprehensive document-based quiz
   */
  async generateDocumentQuiz(
    documentId: number,
    documentContent: string,
    concepts: string[],
    targetCount: number = 5,
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed',
    subject?: string
  ): Promise<QuizQuestion[]> {
    try {
      // Check if this is a practice-heavy subject that benefits from interleaving
      const practiceHeavySubjects = ['mathematics', 'physics', 'chemistry', 'engineering', 'statistics', 'computer science', 'economics'];
      const isPracticeHeavy = practiceHeavySubjects.some(s => 
        subject?.toLowerCase().includes(s) || 
        documentContent.toLowerCase().includes(s) ||
        concepts.some(c => c.toLowerCase().includes(s))
      );

      const basePrompt = `Create ${targetCount} quiz questions based on this document content:

Document Content: ${documentContent}

Key Concepts to Test: ${concepts.join(', ')}
Difficulty Level: ${difficulty}`;

      const interleavingPrompt = isPracticeHeavy ? `

IMPORTANT - INTERLEAVED PRACTICE DESIGN:
This appears to be a practice-heavy subject. Design questions using interleaved practice principles:

1. MIX DIFFERENT APPROACHES: Include questions that require different solution methods/approaches within the same quiz
2. APPROACH DISCRIMINATION: Create questions where students must first identify which method/approach to use
3. CONTRAST SIMILAR PROBLEMS: Include similar-looking problems that require different approaches
4. METHOD COMPARISON: Ask students to compare when to use different approaches

Question Distribution:
- 40% Method identification questions ("Which approach should you use for...")
- 30% Mixed problem types requiring different solution strategies  
- 20% Comparison questions ("When would you use Method A vs Method B...")
- 10% Transfer questions (applying one approach to a new context)

` : '';

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educator creating comprehensive quiz questions based on educational documents. For practice-heavy subjects, emphasize interleaved practice and approach discrimination. Create questions that test understanding, application, and critical thinking. Return valid JSON."
          },
          {
            role: "user",
            content: `${basePrompt}${interleavingPrompt}

Generate a mix of question types:
- Multiple choice (test understanding and approach selection)
- True/false (test facts and misconceptions)
- Short answer (test application)
- Explanation questions (test deeper understanding)

Each question should:
1. Reference specific document content when relevant
2. Test understanding, not just memorization
3. Include clear explanations for why answers are correct
4. Identify which concept is being tested
${isPracticeHeavy ? '5. For practice-heavy subjects: clearly indicate which approach/method is being tested' : ''}

Return as JSON with array of questions.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      const questions = this.validateQuestions(result.questions || []);
      
      // If practice-heavy subject, ensure questions are properly interleaved
      return isPracticeHeavy ? this.ensureInterleavedOrder(questions) : questions;
    } catch (error) {
      console.error('Document quiz generation error:', error);
      throw new Error('Failed to generate document quiz');
    }
  }

  /**
   * Evaluate student answers and provide detailed feedback
   */
  async evaluateQuizAnswers(
    questions: QuizQuestion[],
    userAnswers: { questionId: string; answer: string }[]
  ): Promise<{
    results: QuizResult[];
    overallScore: number;
    conceptAssessments: ConceptAssessment[];
    recommendations: string[];
  }> {
    try {
      const evaluationPrompt = this.buildEvaluationPrompt(questions, userAnswers);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educator evaluating student quiz responses. Provide adaptive feedback based on performance patterns. For correct answers, give brief confirmation. For incorrect answers, identify missing elements and provide guided hints before revealing answers. Focus on learning progression."
          },
          {
            role: "user",
            content: evaluationPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const evaluation = JSON.parse(response.choices[0].message.content || '{}');
      return this.processEvaluation(evaluation, questions.length);
    } catch (error) {
      console.error('Quiz evaluation error:', error);
      throw new Error('Failed to evaluate quiz answers');
    }
  }

  /**
   * Generate adaptive follow-up questions based on quiz performance
   */
  async generateAdaptiveFollowUp(
    conceptAssessments: ConceptAssessment[],
    documentContext?: string
  ): Promise<{
    reinforcementQuestions: QuizQuestion[];
    remedialExplanations: string[];
    advancedChallenges: QuizQuestion[];
  }> {
    // Identify weak concepts that need reinforcement
    const weakConcepts = conceptAssessments.filter(c => c.masteryLevel < 0.7);
    const strongConcepts = conceptAssessments.filter(c => c.masteryLevel > 0.8);

    const reinforcementQuestions = weakConcepts.length > 0 
      ? await this.generateTargetedQuestions(weakConcepts, 'remedial', documentContext)
      : [];

    const advancedChallenges = strongConcepts.length > 0
      ? await this.generateTargetedQuestions(strongConcepts, 'advanced', documentContext)
      : [];

    const remedialExplanations = await this.generateRemedialExplanations(weakConcepts);

    return {
      reinforcementQuestions,
      remedialExplanations,
      advancedChallenges
    };
  }

  private buildPostExplanationPrompt(
    topic: string,
    explanation: string,
    documentContext?: string,
    difficulty: string
  ): string {
    // Check if this involves multiple approaches or methods
    const methodKeywords = ['method', 'approach', 'technique', 'strategy', 'formula', 'way to', 'different'];
    const hasMultipleApproaches = methodKeywords.some(keyword => 
      explanation.toLowerCase().includes(keyword)
    );

    const basePrompt = `Generate 3 quiz questions to test understanding immediately after this explanation:

Topic Explained: ${topic}
Explanation Given: ${explanation}
${documentContext ? `Document Context: ${documentContext}` : ''}`;

    const approachPrompt = hasMultipleApproaches ? `

APPROACH DISCRIMINATION FOCUS:
The explanation mentions different methods/approaches. Include questions that test:
- When to use different approaches
- How to distinguish between similar methods
- Why one approach might be better than another in specific contexts

` : '';

    return `${basePrompt}${approachPrompt}

Create questions that:
1. Test if the student understood the core concept
2. Check if they can apply the knowledge
3. Verify they understood the explanation (not just memorized it)
${hasMultipleApproaches ? '4. Test ability to discriminate between different approaches mentioned' : ''}

Question Types:
- 1 multiple choice (test understanding${hasMultipleApproaches ? ' and approach selection' : ''})
- 1 short answer (test application)
- 1 explanation question (test deeper comprehension${hasMultipleApproaches ? ' and approach justification' : ''})

Difficulty: ${difficulty === 'adaptive' ? 'Start with medium difficulty' : difficulty}

Return as JSON with questions array.`;
  }

  private buildEvaluationPrompt(
    questions: QuizQuestion[],
    userAnswers: { questionId: string; answer: string }[]
  ): string {
    const questionAnswerPairs = questions.map(q => {
      const userAnswer = userAnswers.find(a => a.questionId === q.id)?.answer || "No answer provided";
      return {
        question: q.question,
        type: q.type,
        correctAnswer: q.correctAnswer,
        userAnswer: userAnswer,
        conceptTested: q.conceptTested
      };
    });

    return `Evaluate these student quiz responses:

${JSON.stringify(questionAnswerPairs, null, 2)}

For each response:
1. Determine if the answer is correct (partial credit for partially correct explanations)
2. Provide detailed feedback explaining why the answer is right/wrong
3. Assess concept mastery level (0-1) based on the response quality
4. Identify specific strengths and weaknesses in understanding

Then provide:
- Overall assessment of concept mastery by topic
- Specific recommendations for improvement
- Identification of concepts that need more work

Return as JSON with detailed evaluation results.`;
  }

  private async generateTargetedQuestions(
    concepts: ConceptAssessment[],
    type: 'remedial' | 'advanced',
    documentContext?: string
  ): Promise<QuizQuestion[]> {
    const conceptNames = concepts.map(c => c.concept);
    const difficulty = type === 'remedial' ? 'easy' : 'hard';

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Generate ${type} questions to ${type === 'remedial' ? 'reinforce weak concepts' : 'challenge strong understanding'}. Return valid JSON.`
          },
          {
            role: "user",
            content: `Create 2-3 ${difficulty} questions focusing on these concepts: ${conceptNames.join(', ')}
            
${documentContext ? `Document Context: ${documentContext}` : ''}

${type === 'remedial' 
  ? 'Focus on fundamental understanding and basic application.'
  : 'Create challenging questions that test advanced application and critical thinking.'
}

Return as JSON with questions array.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      return this.validateQuestions(result.questions || []);
    } catch (error) {
      console.error('Targeted question generation error:', error);
      return [];
    }
  }

  private async generateRemedialExplanations(concepts: ConceptAssessment[]): Promise<string[]> {
    if (concepts.length === 0) return [];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Generate clear, simple explanations to help students understand concepts they struggled with."
          },
          {
            role: "user",
            content: `Generate brief, clear explanations for these concepts the student needs help with:

${concepts.map(c => `${c.concept}: Weaknesses - ${c.weaknesses.join(', ')}`).join('\n')}

For each concept, provide:
1. A simple, clear re-explanation
2. A concrete example or analogy
3. Why this concept is important

Keep explanations concise but thorough.`
          }
        ],
        temperature: 0.4,
      });

      const explanations = response.choices[0].message.content || '';
      return explanations.split('\n\n').filter(exp => exp.trim().length > 0);
    } catch (error) {
      console.error('Remedial explanation generation error:', error);
      return [];
    }
  }

  private validateQuestions(questions: any[]): QuizQuestion[] {
    return questions.map((q, index) => ({
      id: q.id || `q_${Date.now()}_${index}`,
      question: q.question || 'Question text not available',
      type: ['multiple-choice', 'true-false', 'short-answer', 'explanation'].includes(q.type) 
        ? q.type : 'short-answer',
      options: q.options || undefined,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      conceptTested: q.conceptTested || 'general',
      documentReference: q.documentReference || undefined
    }));
  }

  /**
   * Ensure questions are properly interleaved for practice-heavy subjects
   */
  private ensureInterleavedOrder(questions: QuizQuestion[]): QuizQuestion[] {
    // Group questions by approach/method if available
    const approachGroups: { [key: string]: QuizQuestion[] } = {};
    const ungrouped: QuizQuestion[] = [];

    questions.forEach(q => {
      // Look for method indicators in the question or explanation
      const methodKeywords = ['method', 'approach', 'technique', 'strategy', 'formula', 'theorem'];
      const hasMethodIndicator = methodKeywords.some(keyword => 
        q.question.toLowerCase().includes(keyword) || 
        q.explanation.toLowerCase().includes(keyword)
      );

      if (hasMethodIndicator) {
        // Try to extract the specific approach
        const methodMatch = q.explanation.match(/(method|approach|technique|formula|theorem)[\s:]?\s*([A-Za-z\s]+)/i);
        const approach = methodMatch ? methodMatch[2].trim().substring(0, 20) : 'general';
        
        if (!approachGroups[approach]) {
          approachGroups[approach] = [];
        }
        approachGroups[approach].push(q);
      } else {
        ungrouped.push(q);
      }
    });

    // Interleave questions from different approaches
    const interleavedQuestions: QuizQuestion[] = [];
    const approaches = Object.keys(approachGroups);
    
    if (approaches.length > 1) {
      // Round-robin through different approaches
      let maxLength = Math.max(...approaches.map(a => approachGroups[a].length));
      
      for (let i = 0; i < maxLength; i++) {
        for (const approach of approaches) {
          if (approachGroups[approach][i]) {
            interleavedQuestions.push(approachGroups[approach][i]);
          }
        }
      }
    } else {
      // If we can't identify multiple approaches, just use original order
      interleavedQuestions.push(...questions);
    }

    // Add ungrouped questions at strategic intervals
    const result: QuizQuestion[] = [];
    let ungroupedIndex = 0;
    
    interleavedQuestions.forEach((q, index) => {
      result.push(q);
      // Insert ungrouped questions every 2-3 questions
      if ((index + 1) % 3 === 0 && ungroupedIndex < ungrouped.length) {
        result.push(ungrouped[ungroupedIndex++]);
      }
    });

    // Add any remaining ungrouped questions
    while (ungroupedIndex < ungrouped.length) {
      result.push(ungrouped[ungroupedIndex++]);
    }

    return result;
  }

  /**
   * Generate self-test questions with customizable parameters
   */
  async generateSelfTest(
    config: any,
    userDocuments: any[],
    weakAreas: string[]
  ): Promise<QuizQuestion[]> {
    try {
      const { selectedTopics, difficulty, questionCount, testMode, includeVocalExplanations } = config;
      
      // Determine focus based on test mode
      let focusAreas = selectedTopics;
      if (testMode === 'weak-areas') {
        focusAreas = weakAreas;
      }

      const documentContext = userDocuments.map(doc => 
        `Title: ${doc.title}\nContent: ${doc.content.substring(0, 1000)}...`
      ).join('\n\n');

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert educator creating self-test questions. Design questions that help students assess their own mastery and identify knowledge gaps. Focus on self-directed learning and metacognition. Always return valid JSON.`
          },
          {
            role: "user",
            content: `Create ${questionCount} self-test questions with these specifications:

Focus Areas: ${focusAreas.join(', ')}
Difficulty: ${difficulty}
Test Mode: ${testMode}
Include Vocal Explanations: ${includeVocalExplanations}

${documentContext ? `User's Study Materials:\n${documentContext}` : ''}

${weakAreas.length > 0 ? `Known Weak Areas: ${weakAreas.join(', ')}` : ''}

SELF-TEST REQUIREMENTS:
1. Create questions that allow self-assessment of understanding
2. Include confidence-building questions alongside challenging ones
3. Design questions that require explanation of reasoning (vocal or written)
4. Mix question types: conceptual understanding, application, approach selection
5. Include metacognitive elements (asking students to reflect on their thinking)

${includeVocalExplanations ? `
VOCAL EXPLANATION INTEGRATION:
- Mark 40% of questions as requiring vocal explanations
- Focus vocal explanations on "why" and "how" rather than just "what"
- Include questions that test ability to teach concepts to others
- Design questions that benefit from spoken explanation of reasoning
` : ''}

Question Distribution:
- 30% Concept understanding (definitions, principles)
- 25% Application (solving problems, using knowledge)
- 25% Approach selection (choosing correct methods/strategies)
- 20% Metacognitive (reflection on learning and understanding)

Return as JSON with questions array. Each question should include:
- Clear question text optimized for self-assessment
- Appropriate answer options or format
- Detailed explanation that helps learning
- Indication if vocal explanation is recommended
- Concept being tested for self-reflection purposes`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      return this.validateQuestions(result.questions || []);
    } catch (error) {
      console.error('Self-test generation error:', error);
      throw new Error('Failed to generate self-test');
    }
  }

  /**
   * Evaluate self-test with emphasis on learning and improvement
   */
  async evaluateSelfTest(
    questions: QuizQuestion[],
    userAnswers: any[],
    testConfig: any,
    totalTime: number
  ): Promise<any> {
    try {
      const answerMap = userAnswers.reduce((acc, answer) => {
        acc[answer.questionId] = answer;
        return acc;
      }, {} as any);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educator evaluating a self-test. Focus on learning growth, identifying strengths and areas for improvement, and providing constructive feedback. Emphasize the learning process over just scoring. Return valid JSON."
          },
          {
            role: "user",
            content: `Evaluate this self-test performance:

Questions and Answers:
${questions.map(q => {
  const userAnswer = answerMap[q.id];
  return `
Question: ${q.question}
Type: ${q.type}
Correct Answer: ${q.correctAnswer}
User Answer: ${userAnswer?.answer || 'No answer'}
User Confidence: ${userAnswer?.confidence || 'Not specified'}/5
Vocal Explanation: ${userAnswer?.vocalExplanation || 'None provided'}
Time Spent: ${userAnswer?.timeSpent || 0}ms
Concept Tested: ${q.conceptTested}
`;
}).join('\n')}

Test Configuration:
- Mode: ${testConfig.testMode}
- Difficulty: ${testConfig.difficulty}
- Total Time: ${totalTime}ms
- Included Vocal Explanations: ${testConfig.includeVocalExplanations}

EVALUATION FOCUS:
1. Assess overall understanding and knowledge gaps
2. Analyze confidence calibration (how well confidence matches performance)
3. Evaluate vocal explanations for depth of understanding
4. Identify patterns in mistakes and successes
5. Provide specific, actionable improvement recommendations
6. Assess readiness for exams or advanced topics
7. Suggest next learning steps based on performance

Return detailed evaluation including:
- Overall score and performance breakdown
- Confidence analysis (over/under-confident areas)
- Strong areas and weak areas with specific feedback
- Readiness assessment for further study/exams
- Personalized next steps and study recommendations
- Analysis of vocal explanations quality (if provided)
- Time management assessment
- Specific topic mastery levels`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const evaluation = JSON.parse(response.choices[0].message.content || '{}');
      
      // Calculate additional metrics
      const correctAnswers = userAnswers.filter(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        return question && this.isAnswerCorrect(question, answer.answer);
      }).length;

      const averageConfidence = userAnswers
        .filter(a => a.confidence)
        .reduce((sum, a) => sum + parseInt(a.confidence), 0) / userAnswers.filter(a => a.confidence).length || 0;

      return {
        ...evaluation,
        correctAnswers,
        totalQuestions: questions.length,
        overallScore: correctAnswers / questions.length,
        averageConfidence: averageConfidence / 5, // Normalize to 0-1
        totalTimeMinutes: totalTime / 1000 / 60,
        testConfig
      };
    } catch (error) {
      console.error('Self-test evaluation error:', error);
      throw new Error('Failed to evaluate self-test');
    }
  }

  private isAnswerCorrect(question: QuizQuestion, userAnswer: string): boolean {
    if (!userAnswer || !question.correctAnswer) return false;
    
    // For multiple choice and true/false, exact match
    if (question.type === 'multiple-choice' || question.type === 'true-false') {
      return userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    }
    
    // For short answer and explanation, partial matching
    const userWords = userAnswer.toLowerCase().split(/\s+/);
    const correctWords = question.correctAnswer.toLowerCase().split(/\s+/);
    
    // Simple partial matching - at least 60% of key words should match
    const matches = correctWords.filter(word => 
      word.length > 3 && userWords.some(userWord => 
        userWord.includes(word) || word.includes(userWord)
      )
    );
    
    return matches.length / Math.max(correctWords.length, 1) >= 0.6;
  }

  /**
   * Generate interleaved practice quiz for approach discrimination
   */
  async generateInterleavedPracticeQuiz(
    subject: string,
    topics: string[],
    approaches: string[],
    targetCount: number = 8
  ): Promise<QuizQuestion[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educator specializing in interleaved practice design. Create questions that help students discriminate between different approaches and methods. Always return valid JSON."
          },
          {
            role: "user",
            content: `Create ${targetCount} interleaved practice questions for ${subject}.

Topics: ${topics.join(', ')}
Approaches/Methods to contrast: ${approaches.join(', ')}

INTERLEAVING REQUIREMENTS:
1. Create questions that look similar but require different approaches
2. Include "approach identification" questions where students must choose the correct method
3. Mix problem types so students can't predict which approach comes next
4. Include comparison questions about when to use each approach

Question Types to Include:
- Method Selection: "Which approach is best for this problem?" (multiple choice)
- Similar Problems: Problems that look alike but need different methods
- Justification: "Why would you use approach X instead of Y here?"
- Transfer: Applying familiar methods to slightly different contexts

Ensure questions test approach discrimination, not just computational ability.

Return as JSON with questions array.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      return this.validateQuestions(result.questions || []);
    } catch (error) {
      console.error('Interleaved practice quiz generation error:', error);
      throw new Error('Failed to generate interleaved practice quiz');
    }
  }

  private processEvaluation(evaluation: any, totalQuestions: number): any {
    return {
      results: evaluation.results || [],
      overallScore: evaluation.overallScore || 0,
      conceptAssessments: evaluation.conceptAssessments || [],
      recommendations: evaluation.recommendations || []
    };
  }
}

export const quizGenerationService = new QuizGenerationService();
