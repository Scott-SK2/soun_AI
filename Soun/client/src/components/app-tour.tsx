import { FeatureTour } from "@/components/ui/feature-tour";
import { useFeatureTour } from "@/context/feature-tour-context";

export function AppTour() {
  const { showTour, markTourAsSeen } = useFeatureTour();
  
  const tourSteps = [
    {
      title: "Welcome to Student Study Assistant",
      description: "Your AI-powered companion for academic success. This tour will show you the main features of the application.",
      highlight: "Our platform uses advanced technology to help you learn more effectively, track your progress, and improve your study habits."
    },
    {
      title: "Dashboard",
      description: "Your personal dashboard gives you a quick overview of your study progress, upcoming assignments, and achievements.",
      highlight: "Track your daily study goals, view upcoming deadlines, and see your recent achievements all in one place."
    },
    {
      title: "Voice Assistant",
      description: "Our most powerful feature - an AI voice assistant that helps you learn through natural conversation.",
      highlight: "Ask questions, take verbal quizzes, and receive spoken explanations about your study materials. Just speak naturally, and the assistant will understand and respond."
    },
    {
      title: "Progress Tracking",
      description: "Monitor your academic growth with detailed analytics and visualizations.",
      highlight: "See which subjects need more attention, track your mastery levels in different topics, and identify your strengths and weaknesses."
    },
    {
      title: "Smart Planner",
      description: "Organize your study schedule with our intelligent planning tools.",
      highlight: "Upload your syllabus or course materials, and the system will help you break down assignments and create an optimal study schedule. Sync with your calendar for reminders."
    },
    {
      title: "Document Processing",
      description: "Extract knowledge from your course materials automatically.",
      highlight: "Upload presentations, PDFs, and documents to automatically extract important information and turn them into study materials."
    },
    {
      title: "Personalized Recommendations",
      description: "Receive customized study strategies based on your performance.",
      highlight: "Our system analyzes your learning patterns to suggest the most effective study techniques for your unique needs."
    }
  ];
  
  return (
    <FeatureTour
      steps={tourSteps}
      onComplete={markTourAsSeen}
      isOpen={showTour}
    />
  );
}