import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  PresentationIcon,
  ListIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentViewerProps {
  document: {
    id: number;
    title: string;
    fileType: string;
    content: string | null;
    metadata: string | null;
  } | null;
  isLoading: boolean;
}

interface Slide {
  title: string;
  content: string;
  notes?: string;
  bullets?: string[];
  image?: string;
}

export function DocumentViewer({ document, isLoading }: DocumentViewerProps) {
  const [currentTab, setCurrentTab] = useState("content");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const { toast } = useToast();

  // Parse metadata for PowerPoint presentations
  useEffect(() => {
    if (document?.metadata && document.fileType === "pptx") {
      try {
        const data = JSON.parse(document.metadata);
        if (data.type === "pptx" && Array.isArray(data.slides)) {
          setSlides(data.slides);
          // Reset current slide when loading a new presentation
          setCurrentSlide(0);
        }
      } catch (error) {
        console.error("Error parsing document metadata:", error);
        toast({
          title: "Error parsing presentation",
          description: "Unable to load slide data",
          variant: "destructive",
        });
      }
    } else {
      // Reset slides if not a PowerPoint
      setSlides([]);
    }
  }, [document, toast]);

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleDownload = () => {
    if (!document) return;

    // Open in new tab to bypass iframe download restrictions in Replit
    window.open(`/api/documents/${document.id}/download`, '_blank');

    toast({
      title: "Download started",
      description: `Opening ${document.title} in new tab`
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full h-full min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4 mx-auto"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card className="w-full h-full min-h-[500px] flex items-center justify-center">
        <div className="text-center p-6">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No document selected</h3>
          <p className="text-muted-foreground">
            Select a document from your library to view it here
          </p>
        </div>
      </Card>
    );
  }

  const renderPowerPointView = () => {
    if (!slides.length || currentSlide >= slides.length) {
      return (
        <div className="text-center py-10">
          <PresentationIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No slide data available</p>
        </div>
      );
    }

    const slide = slides[currentSlide];

    return (
      <div className="relative">
        {/* Slide navigation */}
        <div className="absolute top-0 right-0 p-4 flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {currentSlide + 1} / {slides.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentSlide === 0}
            onClick={goToPrevSlide}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentSlide === slides.length - 1}
            onClick={goToNextSlide}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Slide content */}
        <div className="pt-16 pb-10 px-10 bg-white rounded-md border min-h-[400px]">
          <h2 className="text-2xl font-bold mb-6 text-center">{slide.title}</h2>
          <p className="text-lg mb-6">{slide.content}</p>

          {slide.bullets && slide.bullets.length > 0 && (
            <ul className="space-y-3 my-6">
              {slide.bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="rounded-full bg-primary w-2 h-2 mt-2"></div>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {slide.image && (
            <div className="my-4 text-center">
              <div className="py-10 px-4 bg-gray-100 rounded-md text-muted-foreground italic">
                [Image: {slide.image}]
              </div>
            </div>
          )}
        </div>

        {/* Slide notes if available */}
        {slide.notes && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h3 className="text-sm font-medium mb-2">Speaker Notes:</h3>
            <p className="text-sm text-muted-foreground">{slide.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderRawContent = () => {
    if (!document.content) {
      return (
        <div className="text-center py-10">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No content available</p>
        </div>
      );
    }

    return (
      <div className="p-4 bg-muted rounded-md">
        <pre className="whitespace-pre-wrap text-sm">{document.content}</pre>
      </div>
    );
  };

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{document.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <span className="capitalize">{document.fileType}</span> Document
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs
          defaultValue={currentTab}
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <TabsList className="mb-4">
            {document.fileType === "pptx" && (
              <TabsTrigger value="slides">
                <PresentationIcon className="h-4 w-4 mr-2" /> Slides
              </TabsTrigger>
            )}
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-2" /> Text Content
            </TabsTrigger>
          </TabsList>

          {document.fileType === "pptx" && (
            <TabsContent value="slides" className="mt-0">
              {renderPowerPointView()}
            </TabsContent>
          )}

          <TabsContent value="content" className="mt-0">
            {renderRawContent()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
