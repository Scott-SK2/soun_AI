
import { Link, useLocation } from "wouter";
import { Brain, BookOpen, FileText, BarChart3, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Brain },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'Voice', href: '/voice', icon: Mic },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Progress', href: '/progress', icon: BarChart3 },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-4 h-16">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isVoice = item.href === '/voice';
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex flex-col items-center justify-center h-full space-y-1 transition-colors",
                "hover:bg-gray-50 active:bg-gray-100",
                isActive(item.href) 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-600",
                isVoice && !isActive(item.href) && "bg-blue-50 text-blue-600"
              )}>
                <Icon className={cn(
                  "h-5 w-5",
                  isVoice && "animate-pulse"
                )} />
                <span className="text-xs font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
