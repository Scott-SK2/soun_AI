import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PresentationOutliner } from "@/components/presentation/presentation-outliner";
import { PracticeRecorder } from "@/components/presentation/practice-recorder";
import { QuestionPreparation } from "@/components/presentation/question-preparation";
import { TextRevisionTool } from "@/components/presentation/text-revision-tool";
import { BookOpen, Mic, Presentation, FileText, HelpCircle } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";

export default function PresentationPage() {
  const [activeTab, setActiveTab] = useState("outline");

  return (
    <PageLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Presentation Preparation</h1>
            <p className="text-muted-foreground mt-1">
              Create, practice, and perfect your academic presentations
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="outline" className="flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              <span className="hidden md:inline">Presentation</span> Outline
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span className="hidden md:inline">Speech</span> Practice
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden md:inline">Prepare</span> Questions
            </TabsTrigger>
            <TabsTrigger value="revision" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">Text</span> Revision
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Presentation Outline</CardTitle>
                <CardDescription>
                  Create and structure your presentation outline. Organize your ideas into a clear and effective flow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PresentationOutliner />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practice" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Practice & Feedback</CardTitle>
                <CardDescription>
                  Record your presentation, receive feedback on your delivery, and track your progress.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PracticeRecorder />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Question Preparation</CardTitle>
                <CardDescription>
                  Generate potential questions from your audience and prepare strong answers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionPreparation />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revision" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Text Revision Assistant</CardTitle>
                <CardDescription>
                  Improve your presentation text with suggestions for clarity, grammar, and academic language.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TextRevisionTool />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}