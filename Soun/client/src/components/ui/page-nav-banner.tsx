import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Home, Book, BarChart, Calendar, Mic, Settings, Presentation } from "lucide-react";

export function PageNavBanner() {
  const [location] = useLocation();
  
  // Define all main navigation pages
  const pages = [
    { path: "/dashboard", name: "Dashboard", icon: <Home className="h-4 w-4" /> },
    { path: "/courses", name: "Courses", icon: <Book className="h-4 w-4" /> },
    { path: "/voice", name: "Voice", icon: <Mic className="h-4 w-4" /> },
    { path: "/planner", name: "Planner", icon: <Calendar className="h-4 w-4" /> },
    { path: "/progress", name: "Progress", icon: <BarChart className="h-4 w-4" /> },
    { path: "/presentation", name: "Presentation", icon: <Presentation className="h-4 w-4" /> },
    { path: "/settings", name: "Settings", icon: <Settings className="h-4 w-4" /> }
  ];
  
  // Find current page index
  const currentIndex = pages.findIndex(page => page.path === location);
  
  // Determine previous and next pages
  const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;
  
  return (
    <div className="bg-white border-b border-gray-200 py-2 px-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {prevPage && (
            <Link href={prevPage.path}>
              <div className="flex items-center text-gray-600 hover:text-primary transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{prevPage.name}</span>
              </div>
            </Link>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {pages.map((page) => (
            <Link key={page.path} href={page.path}>
              <div 
                className={`flex items-center p-1 rounded-md ${location === page.path 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-500 hover:text-primary hover:bg-gray-100'} cursor-pointer`}
                title={page.name}>
                {page.icon}
              </div>
            </Link>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          {nextPage && (
            <Link href={nextPage.path}>
              <div className="flex items-center text-gray-600 hover:text-primary transition-colors cursor-pointer">
                <span className="text-sm font-medium">{nextPage.name}</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}