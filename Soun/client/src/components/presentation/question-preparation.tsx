import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface QAPair {
  id: string;
  question: string;
  answer: string;
  expanded: boolean;
  difficulty: "easy" | "medium" | "hard";
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

export function QuestionPreparation() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [pairs, setPairs] = useState<QAPair[]>([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quiz/generate", {
        topic,
        context: topic,
        questionCount: 5,
        difficulty: "mixed",
      });
      return res.json();
    },
    onSuccess: (data) => {
      const questions: QAPair[] = (data.questions ?? []).map((q: any, i: number) => ({
        id: String(i),
        question: q.question,
        answer: q.options?.[q.correct_index] ?? q.answer ?? "",
        expanded: false,
        difficulty: q.difficulty ?? "medium",
      }));
      if (questions.length) {
        setPairs((prev) => [...questions, ...prev]);
      } else {
        toast({ title: "No questions generated", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Failed to generate questions", variant: "destructive" });
    },
  });

  const addManual = () => {
    setPairs((prev) => [
      { id: Date.now().toString(), question: "", answer: "", expanded: true, difficulty: "medium" },
      ...prev,
    ]);
  };

  const updatePair = (id: string, field: "question" | "answer", value: string) => {
    setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const togglePair = (id: string) => {
    setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p)));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          placeholder="Enter your presentation topic to generate potential audience questions..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
          className="resize-none"
        />
        <div className="flex flex-col gap-2 shrink-0">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!topic.trim() || generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HelpCircle className="h-4 w-4" />
            )}
            Generate
          </Button>
          <Button onClick={addManual} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {pairs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Generate questions from your topic or add your own manually.
        </p>
      )}

      <div className="space-y-2">
        {pairs.map((pair) => (
          <div key={pair.id} className="border rounded-lg overflow-hidden">
            <div
              className="flex items-start gap-2 p-3 cursor-pointer hover:bg-muted/30"
              onClick={() => togglePair(pair.id)}
            >
              {pair.expanded ? (
                <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <p className="text-sm font-medium flex-1">
                {pair.question || <span className="text-muted-foreground italic">New question...</span>}
              </p>
              <Badge className={`text-xs shrink-0 ${DIFFICULTY_COLORS[pair.difficulty]}`}>
                {pair.difficulty}
              </Badge>
            </div>
            {pair.expanded && (
              <div className="px-3 pb-3 space-y-2 border-t pt-3">
                <Textarea
                  placeholder="Question..."
                  value={pair.question}
                  onChange={(e) => updatePair(pair.id, "question", e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
                <Textarea
                  placeholder="Your prepared answer..."
                  value={pair.answer}
                  onChange={(e) => updatePair(pair.id, "answer", e.target.value)}
                  rows={3}
                  className="resize-none text-sm bg-green-50/50"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
