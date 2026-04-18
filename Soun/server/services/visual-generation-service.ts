/**
 * Visual generation service — delegates SVG diagram generation to soun_AI FastAPI.
 * Same public interface as before; no OpenAI SDK dependency.
 */

import { apiGenerateDiagram } from "./soun-ai-client";

// ── Interfaces (unchanged) ─────────────────────────────────────────────────

export interface VisualAid {
  type: "diagram" | "chart" | "flowchart" | "mindmap" | "illustration";
  title: string;
  description: string;
  svgContent: string;
  altText: string;
  interactiveElements?: InteractiveElement[];
}

export interface InteractiveElement {
  id: string;
  type: "tooltip" | "highlight" | "animation";
  trigger: "hover" | "click" | "auto";
  content: string;
  position: { x: number; y: number };
}

export interface MultiModalResponse {
  textResponse: string;
  visualAids: VisualAid[];
  audioNotes?: string[];
  suggestedFollowUp?: string[];
}

// ── Service class ──────────────────────────────────────────────────────────

class VisualGenerationService {
  async generateVisualAid(
    concept: string,
    explanation: string,
    visualType?: string,
    _complexity: "simple" | "intermediate" | "advanced" = "intermediate",
  ): Promise<VisualAid | null> {
    const type = visualType ?? this.determineVisualType(concept, explanation);

    try {
      const conceptObj = { title: concept, definition: explanation };
      const apiType = type === "mindmap" ? "concept_map" : type === "chart" ? "comparison" : type;
      const res = await apiGenerateDiagram(conceptObj, apiType, "en");

      return {
        type: type as VisualAid["type"],
        title: res.title ?? `${concept} — ${type}`,
        description: res.description ?? `Visual diagram for ${concept}`,
        svgContent: res.svg ?? "",
        altText: `Diagram showing ${concept}`,
        interactiveElements: [],
      };
    } catch (err) {
      console.error("[visual-generation] generateVisualAid error:", err);
      return this.generateFallbackVisual(concept, type);
    }
  }

  async generateMultiModalResponse(
    userQuery: string,
    textResponse: string,
    _courseContext?: string,
  ): Promise<MultiModalResponse> {
    const visualConcepts = this.extractVisualizableConceptsLocal(userQuery, textResponse);
    const visualAids: VisualAid[] = [];

    for (const c of visualConcepts.slice(0, 2)) {
      const v = await this.generateVisualAid(c.name, c.explanation, c.suggestedType);
      if (v) visualAids.push(v);
    }

    return {
      textResponse,
      visualAids,
      audioNotes: this.generateAudioNotes(visualAids),
      suggestedFollowUp: this.generateFollowUpQuestions(),
    };
  }

  // ── Local helpers ────────────────────────────────────────────────────────

  private extractVisualizableConceptsLocal(
    query: string,
    response: string,
  ): Array<{ name: string; explanation: string; suggestedType: string }> {
    // Simple keyword-based extraction — works offline
    const combined = `${query} ${response}`.toLowerCase();
    const concepts: Array<{ name: string; explanation: string; suggestedType: string }> = [];

    if (/process|step|sequence|flow/.test(combined)) {
      concepts.push({ name: query.slice(0, 40), explanation: response.slice(0, 200), suggestedType: "flowchart" });
    }
    if (/relationship|connect|related|network/.test(combined)) {
      concepts.push({ name: query.slice(0, 40), explanation: response.slice(0, 200), suggestedType: "mindmap" });
    }
    if (!concepts.length) {
      concepts.push({ name: query.slice(0, 40), explanation: response.slice(0, 200), suggestedType: "diagram" });
    }

    return concepts.slice(0, 2);
  }

  private determineVisualType(concept: string, explanation: string): string {
    const t = `${concept} ${explanation}`.toLowerCase();
    if (/process|step|sequence/.test(t)) return "flowchart";
    if (/relationship|connect|related/.test(t)) return "mindmap";
    if (/data|compare|statistic/.test(t)) return "chart";
    return "diagram";
  }

  private generateFallbackVisual(concept: string, type: string): VisualAid {
    const svg = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="200" cy="150" r="60" fill="#3b82f6" opacity="0.2"/>
      <text x="200" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#1e293b">${concept.slice(0, 30)}</text>
    </svg>`;
    return { type: type as VisualAid["type"], title: `${concept} — Visual Aid`, description: `Visual diagram for ${concept}`, svgContent: svg, altText: `Diagram showing ${concept}`, interactiveElements: [] };
  }

  private generateAudioNotes(visualAids: VisualAid[]): string[] {
    if (!visualAids.length) return [];
    return ["I've created visual diagrams to help illustrate these concepts.", ...visualAids.map((v) => `The ${v.type} shows ${v.description}`)];
  }

  private generateFollowUpQuestions(): string[] {
    return ["Would you like me to explain any specific part in more detail?", "Can you give me an example of this concept?"];
  }
}

export const visualGenerationService = new VisualGenerationService();
