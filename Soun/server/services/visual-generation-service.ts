
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface VisualAid {
  type: 'diagram' | 'chart' | 'flowchart' | 'mindmap' | 'illustration';
  title: string;
  description: string;
  svgContent: string;
  altText: string;
  interactiveElements?: InteractiveElement[];
}

export interface InteractiveElement {
  id: string;
  type: 'tooltip' | 'highlight' | 'animation';
  trigger: 'hover' | 'click' | 'auto';
  content: string;
  position: { x: number; y: number };
}

export interface MultiModalResponse {
  textResponse: string;
  visualAids: VisualAid[];
  audioNotes?: string[];
  suggestedFollowUp?: string[];
}

class VisualGenerationService {
  /**
   * Generate visual aids for a given concept or explanation
   */
  async generateVisualAid(
    concept: string,
    explanation: string,
    visualType?: string,
    complexity: 'simple' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<VisualAid | null> {
    try {
      if (!openai) {
        console.log("OpenAI API key not available for visual generation");
        return null;
      }

      // Determine the best visual type if not specified
      const determinedType = visualType || this.determineVisualType(concept, explanation);

      const prompt = `
Create an SVG diagram for the following concept:
Concept: ${concept}
Explanation: ${explanation}
Visual Type: ${determinedType}
Complexity Level: ${complexity}

Generate a clean, educational SVG diagram that:
1. Illustrates the key concepts clearly
2. Uses appropriate colors and typography
3. Includes labels and annotations
4. Is optimized for web display (viewBox, responsive)
5. Follows accessibility guidelines

Return a JSON object with:
{
  "type": "${determinedType}",
  "title": "Clear title for the diagram",
  "description": "Brief description of what the diagram shows",
  "svgContent": "Complete SVG markup as a string",
  "altText": "Detailed alt text for accessibility",
  "interactiveElements": [
    {
      "id": "unique-id",
      "type": "tooltip",
      "trigger": "hover",
      "content": "Additional information",
      "position": {"x": 100, "y": 100}
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educational designer who creates clear, informative SVG diagrams for learning. Always return valid JSON with properly escaped SVG content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as VisualAid;

    } catch (error) {
      console.error("Error generating visual aid:", error);
      return this.generateFallbackVisual(concept, determinedType || 'diagram');
    }
  }

  /**
   * Generate a complete multi-modal response
   */
  async generateMultiModalResponse(
    userQuery: string,
    textResponse: string,
    courseContext?: string
  ): Promise<MultiModalResponse> {
    try {
      // Extract key concepts that would benefit from visualization
      const visualConcepts = await this.extractVisualizableConcepts(userQuery, textResponse);
      
      const visualAids: VisualAid[] = [];

      // Generate visual aids for each concept
      for (const concept of visualConcepts.slice(0, 2)) { // Limit to 2 visuals per response
        const visual = await this.generateVisualAid(concept.name, concept.explanation, concept.suggestedType);
        if (visual) {
          visualAids.push(visual);
        }
      }

      // Generate audio enhancement notes
      const audioNotes = this.generateAudioNotes(textResponse, visualAids);

      // Suggest follow-up questions
      const suggestedFollowUp = this.generateFollowUpQuestions(userQuery, textResponse);

      return {
        textResponse,
        visualAids,
        audioNotes,
        suggestedFollowUp
      };

    } catch (error) {
      console.error("Error generating multi-modal response:", error);
      return {
        textResponse,
        visualAids: [],
        audioNotes: [],
        suggestedFollowUp: []
      };
    }
  }

  /**
   * Extract concepts that would benefit from visualization
   */
  private async extractVisualizableConcepts(query: string, response: string): Promise<Array<{
    name: string;
    explanation: string;
    suggestedType: string;
  }>> {
    try {
      const prompt = `
Analyze the following query and response to identify concepts that would benefit from visual aids:

Query: ${query}
Response: ${response}

Identify up to 3 key concepts that would be enhanced by visual representation. For each concept, determine the best visual type:
- diagram: For showing relationships, structures, or processes
- flowchart: For sequential processes or decision trees  
- chart: For data, comparisons, or statistics
- mindmap: For showing connections between related ideas
- illustration: For concrete objects or scenes

Return a JSON array of objects with:
{
  "name": "concept name",
  "explanation": "brief explanation of the concept", 
  "suggestedType": "best visual type for this concept"
}`;

      const response_ai = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500
      });

      const result = JSON.parse(response_ai.choices[0].message.content || '{"concepts": []}');
      return result.concepts || [];

    } catch (error) {
      console.error("Error extracting visualizable concepts:", error);
      return [];
    }
  }

  /**
   * Determine the best visual type for a concept
   */
  private determineVisualType(concept: string, explanation: string): string {
    const lowerConcept = concept.toLowerCase();
    const lowerExplanation = explanation.toLowerCase();

    if (lowerConcept.includes('process') || lowerExplanation.includes('step') || lowerExplanation.includes('sequence')) {
      return 'flowchart';
    }
    
    if (lowerConcept.includes('relationship') || lowerExplanation.includes('connect') || lowerExplanation.includes('related')) {
      return 'mindmap';
    }
    
    if (lowerConcept.includes('data') || lowerExplanation.includes('compare') || lowerExplanation.includes('statistic')) {
      return 'chart';
    }
    
    if (lowerConcept.includes('structure') || lowerExplanation.includes('component') || lowerExplanation.includes('part')) {
      return 'diagram';
    }

    return 'diagram'; // Default
  }

  /**
   * Generate fallback visual when AI generation fails
   */
  private generateFallbackVisual(concept: string, type: string): VisualAid {
    const fallbackSvg = `
      <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        <circle cx="200" cy="150" r="60" fill="#3b82f6" opacity="0.2"/>
        <text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#1e293b">
          ${concept}
        </text>
        <text x="200" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">
          Visual diagram
        </text>
      </svg>
    `;

    return {
      type: type as any,
      title: `${concept} - Visual Aid`,
      description: `A visual representation of ${concept}`,
      svgContent: fallbackSvg,
      altText: `Diagram showing ${concept} concept`,
      interactiveElements: []
    };
  }

  /**
   * Generate audio enhancement notes for better TTS delivery
   */
  private generateAudioNotes(textResponse: string, visualAids: VisualAid[]): string[] {
    const notes: string[] = [];

    if (visualAids.length > 0) {
      notes.push("I've created visual diagrams to help illustrate these concepts.");
      
      visualAids.forEach((visual, index) => {
        notes.push(`The ${visual.type} shows ${visual.description}`);
      });
    }

    return notes;
  }

  /**
   * Generate follow-up questions based on the response
   */
  private generateFollowUpQuestions(query: string, response: string): string[] {
    const followUps: string[] = [];

    // Add generic educational follow-ups
    followUps.push("Would you like me to explain any specific part in more detail?");
    followUps.push("Can you give me an example of this concept?");
    followUps.push("How does this relate to other topics we've discussed?");

    return followUps.slice(0, 2); // Limit to 2 suggestions
  }
}

export const visualGenerationService = new VisualGenerationService();
