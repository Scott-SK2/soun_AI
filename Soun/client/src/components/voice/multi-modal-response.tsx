
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Download, Maximize2, Info, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export interface MultiModalResponseProps {
  textResponse: string;
  visualAids: VisualAid[];
  audioNotes?: string[];
  suggestedFollowUp?: string[];
  onFollowUpClick?: (question: string) => void;
  onSpeak?: (text: string) => void;
}

export function MultiModalResponse({
  textResponse,
  visualAids,
  audioNotes = [],
  suggestedFollowUp = [],
  onFollowUpClick,
  onSpeak
}: MultiModalResponseProps) {
  const [showVisuals, setShowVisuals] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [expandedVisual, setExpandedVisual] = useState<string | null>(null);

  const handleDownloadSvg = (visual: VisualAid) => {
    const blob = new Blob([visual.svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${visual.title.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleInteractiveElement = (element: InteractiveElement, visual: VisualAid) => {
    if (element.type === 'tooltip') {
      setActiveTooltip(activeTooltip === element.id ? null : element.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Text Response with Audio Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{textResponse}</p>
              
              {audioNotes.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 text-xs font-medium mb-2">
                    <Volume2 className="h-3 w-3" />
                    Audio Enhancement
                  </div>
                  {audioNotes.map((note, index) => (
                    <p key={index} className="text-xs text-blue-600 mb-1">{note}</p>
                  ))}
                </div>
              )}
            </div>
            
            {onSpeak && (
              <Button
                onClick={() => onSpeak(textResponse)}
                variant="ghost"
                size="sm"
                className="shrink-0"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visual Aids Section */}
      {visualAids.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                Visual Learning Aids
                <Badge variant="secondary" className="text-xs">
                  {visualAids.length}
                </Badge>
              </CardTitle>
              <Button
                onClick={() => setShowVisuals(!showVisuals)}
                variant="ghost"
                size="sm"
              >
                {showVisuals ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          
          {showVisuals && (
            <CardContent>
              {visualAids.length === 1 ? (
                <VisualAidCard
                  visual={visualAids[0]}
                  onDownload={() => handleDownloadSvg(visualAids[0])}
                  onExpand={() => setExpandedVisual(visualAids[0].title)}
                  onInteractiveElement={(element) => handleInteractiveElement(element, visualAids[0])}
                  activeTooltip={activeTooltip}
                />
              ) : (
                <Tabs defaultValue={visualAids[0].title} className="w-full">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${visualAids.length}, 1fr)` }}>
                    {visualAids.map((visual) => (
                      <TabsTrigger key={visual.title} value={visual.title} className="text-xs">
                        {visual.type}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {visualAids.map((visual) => (
                    <TabsContent key={visual.title} value={visual.title}>
                      <VisualAidCard
                        visual={visual}
                        onDownload={() => handleDownloadSvg(visual)}
                        onExpand={() => setExpandedVisual(visual.title)}
                        onInteractiveElement={(element) => handleInteractiveElement(element, visual)}
                        activeTooltip={activeTooltip}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Follow-up Suggestions */}
      {suggestedFollowUp.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-green-600" />
              Suggested Follow-up Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestedFollowUp.map((question, index) => (
                <Button
                  key={index}
                  onClick={() => onFollowUpClick?.(question)}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                >
                  {question}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expanded Visual Modal */}
      {expandedVisual && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{expandedVisual}</h3>
              <Button variant="ghost" size="sm" onClick={() => setExpandedVisual(null)}>
                ✕
              </Button>
            </div>
            <div className="p-6">
              {visualAids.find(v => v.title === expandedVisual) && (
                <div 
                  className="w-full h-96 flex items-center justify-center"
                  dangerouslySetInnerHTML={{
                    __html: visualAids.find(v => v.title === expandedVisual)!.svgContent
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface VisualAidCardProps {
  visual: VisualAid;
  onDownload: () => void;
  onExpand: () => void;
  onInteractiveElement: (element: InteractiveElement) => void;
  activeTooltip: string | null;
}

function VisualAidCard({ visual, onDownload, onExpand, onInteractiveElement, activeTooltip }: VisualAidCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">{visual.title}</h4>
          <p className="text-xs text-gray-600">{visual.description}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onDownload} variant="outline" size="sm">
            <Download className="h-3 w-3" />
          </Button>
          <Button onClick={onExpand} variant="outline" size="sm">
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="relative">
        <div 
          className="w-full bg-gray-50 rounded-lg p-4 min-h-64 flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: visual.svgContent }}
        />
        
        {/* Interactive Elements Overlay */}
        {visual.interactiveElements && visual.interactiveElements.map((element) => (
          <div key={element.id} className="absolute">
            {element.type === 'tooltip' && activeTooltip === element.id && (
              <div 
                className="absolute z-10 bg-black text-white text-xs rounded px-2 py-1 max-w-48"
                style={{ 
                  left: element.position.x, 
                  top: element.position.y - 30
                }}
              >
                {element.content}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {visual.altText && (
        <p className="text-xs text-gray-500 italic">Alt: {visual.altText}</p>
      )}
    </div>
  );
}
