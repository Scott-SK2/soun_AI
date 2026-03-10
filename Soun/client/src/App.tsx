import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense } from "react";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

// Lazy load heavy components with loading fallbacks
const Dashboard = lazy(() => import("@/pages/dashboard"));
const PlannerPage = lazy(() => import("@/pages/planner-page-updated"));
const ProgressPage = lazy(() => import("@/pages/progress-page"));
const CoursesPage = lazy(() => import("@/pages/courses-page"));
const CourseStudyPage = lazy(() => import("@/pages/course-study-page"));
const VoicePage = lazy(() => import("@/pages/voice-page"));
const DocumentsPage = lazy(() => import("@/pages/documents-page"));
const SettingsPage = lazy(() => import("@/pages/settings-page"));
const PresentationPage = lazy(() => import("@/pages/presentation-page"));

// Optimized loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);
import { FeatureTourProvider } from "./context/feature-tour-context";
import { AppTour } from "@/components/app-tour";
import { FeatureAnnotations } from "@/components/feature-annotations";
import { AuthProvider } from "./context/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { SoundPermissionProvider } from "@/context/sound-permission-context";
import { VoiceSettingsProvider } from "@/context/voice-settings-context";
import { SpeechRecognitionProvider } from "@/context/speech-recognition-context";
import { SoundPermissionDialog } from "@/components/voice/sound-permission-dialog";
import { ProtectedRoute } from "@/lib/protected-route";
import { MotivationProvider } from "./context/motivation-context";
import { PresentationProvider } from "./context/presentation-context";
import { GlobalVoiceAssistant } from "@/components/voice/global-voice-assistant";
import { WakeWordIndicator } from "@/components/voice/wake-word-indicator";
import { SelfTestPage } from "./pages/self-test-page";
import AdaptiveFeedbackDemo from "./pages/adaptive-feedback-demo";

// Main App component
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <SoundPermissionProvider>
        <VoiceSettingsProvider>
          <SpeechRecognitionProvider>
          <MotivationProvider>
            <PresentationProvider>
              <FeatureTourProvider>
                <Suspense fallback={<PageLoader />}>
                  <Switch>
                    <Route path="/login" component={Login} />
                    <Route path="/register" component={Register} />
                    {/* Course-centric routing - courses are the main entry point */}
                    <ProtectedRoute path="/" component={Dashboard} />
                  <ProtectedRoute path="/courses" component={CoursesPage} />
                  <ProtectedRoute path="/courses/:courseId/study" component={CourseStudyPage} />
                  <ProtectedRoute path="/courses/:courseId/voice" component={VoicePage} />
                  <ProtectedRoute path="/courses/:courseId/presentation" component={PresentationPage} />
                  <ProtectedRoute path="/courses/:courseId/documents" component={DocumentsPage} />
                  <ProtectedRoute path="/courses/:courseId/planner" component={PlannerPage} />
                  <ProtectedRoute path="/courses/:courseId/progress" component={ProgressPage} />

                  {/* Global pages accessible from any course */}
                  <ProtectedRoute path="/dashboard" component={Dashboard} />
                  <ProtectedRoute path="/documents" component={DocumentsPage} />
                  <ProtectedRoute path="/voice" component={VoicePage} />
                  <ProtectedRoute path="/planner" component={PlannerPage} />
                  <ProtectedRoute path="/progress" component={ProgressPage} />
                  <ProtectedRoute path="/presentation" component={PresentationPage} />
                  <ProtectedRoute path="/settings" component={SettingsPage} />
                  <ProtectedRoute path="/self-test" component={SelfTestPage} />
                  <ProtectedRoute path="/demo/adaptive-feedback" component={AdaptiveFeedbackDemo} />
                  <Route component={NotFound} />
                </Switch>
                </Suspense>
                <SoundPermissionDialog />
                <AppTour />
                <FeatureAnnotations />
                <GlobalVoiceAssistant />
                <WakeWordIndicator />
                <Toaster />
              </FeatureTourProvider>
            </PresentationProvider>
          </MotivationProvider>
          </SpeechRecognitionProvider>
        </VoiceSettingsProvider>
      </SoundPermissionProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;