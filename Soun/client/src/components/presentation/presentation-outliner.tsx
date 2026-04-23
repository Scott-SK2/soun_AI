import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";

interface SlideItem {
  id: string;
  title: string;
  notes: string;
  expanded: boolean;
}

export function PresentationOutliner() {
  const [slides, setSlides] = useState<SlideItem[]>([
    { id: "1", title: "Introduction", notes: "", expanded: true },
    { id: "2", title: "Main Point 1", notes: "", expanded: false },
    { id: "3", title: "Conclusion", notes: "", expanded: false },
  ]);
  const [presentationTitle, setPresentationTitle] = useState("");

  const addSlide = () => {
    const id = Date.now().toString();
    setSlides([...slides, { id, title: `Slide ${slides.length + 1}`, notes: "", expanded: false }]);
  };

  const removeSlide = (id: string) => {
    setSlides(slides.filter((s) => s.id !== id));
  };

  const updateSlide = (id: string, field: keyof SlideItem, value: string | boolean) => {
    setSlides(slides.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const toggleExpand = (id: string) => {
    setSlides(slides.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Presentation title..."
          value={presentationTitle}
          onChange={(e) => setPresentationTitle(e.target.value)}
          className="text-lg font-medium"
        />
        <Badge variant="secondary">{slides.length} slides</Badge>
      </div>

      <div className="space-y-2">
        {slides.map((slide, index) => (
          <div key={slide.id} className="border rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-2 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleExpand(slide.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-6 shrink-0">{index + 1}.</span>
              <Input
                value={slide.title}
                onChange={(e) => { e.stopPropagation(); updateSlide(slide.id, "title", e.target.value); }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 border-0 bg-transparent p-0 text-sm font-medium focus-visible:ring-0"
                placeholder="Slide title..."
              />
              {slide.expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {slide.expanded && (
              <div className="p-3 border-t">
                <Textarea
                  placeholder="Speaker notes, key points, or content for this slide..."
                  value={slide.notes}
                  onChange={(e) => updateSlide(slide.id, "notes", e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Button onClick={addSlide} variant="outline" className="w-full gap-2">
        <Plus className="h-4 w-4" />
        Add Slide
      </Button>
    </div>
  );
}
