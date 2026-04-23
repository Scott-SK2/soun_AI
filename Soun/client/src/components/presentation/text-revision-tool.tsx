import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2, Copy, RotateCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type RevisionMode = "clarity" | "academic" | "concise" | "grammar";

const MODES: { key: RevisionMode; label: string; prompt: string }[] = [
  { key: "clarity", label: "Clarity", prompt: "Improve clarity and readability" },
  { key: "academic", label: "Academic", prompt: "Make the language more academic and formal" },
  { key: "concise", label: "Concise", prompt: "Make it more concise and remove redundancy" },
  { key: "grammar", label: "Grammar", prompt: "Fix grammar, punctuation, and sentence structure" },
];

export function TextRevisionTool() {
  const { toast } = useToast();
  const [inputText, setInputText] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [mode, setMode] = useState<RevisionMode>("clarity");

  const reviseMutation = useMutation({
    mutationFn: async () => {
      const selectedMode = MODES.find((m) => m.key === mode)!;
      const res = await apiRequest("POST", "/api/voice/command", {
        message: `${selectedMode.prompt} for this presentation text:\n\n${inputText}`,
        history: [],
        language: "en",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setRevisedText(data.response ?? "");
    },
    onError: () => {
      toast({ title: "Revision failed", description: "Try again shortly.", variant: "destructive" });
    },
  });

  const copyRevised = () => {
    navigator.clipboard.writeText(revisedText);
    toast({ title: "Copied to clipboard" });
  };

  const applyRevision = () => {
    setInputText(revisedText);
    setRevisedText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Badge
            key={m.key}
            variant={mode === m.key ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Original text</label>
          <Textarea
            placeholder="Paste your presentation text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            className="resize-none font-mono text-sm"
          />
          <Button
            onClick={() => reviseMutation.mutate()}
            disabled={!inputText.trim() || reviseMutation.isPending}
            className="w-full gap-2"
          >
            {reviseMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Revise — {MODES.find((m) => m.key === mode)?.label}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Revised text</label>
          <Textarea
            placeholder="Revised version will appear here..."
            value={revisedText}
            onChange={(e) => setRevisedText(e.target.value)}
            rows={10}
            className="resize-none font-mono text-sm bg-green-50/40"
            readOnly={!revisedText}
          />
          <div className="flex gap-2">
            <Button
              onClick={applyRevision}
              disabled={!revisedText}
              variant="outline"
              className="flex-1 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Use as new input
            </Button>
            <Button
              onClick={copyRevised}
              disabled={!revisedText}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
