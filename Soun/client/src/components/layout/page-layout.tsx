import { ReactNode } from "react";
import { Header } from "@/components/ui/header";
import { MobileNav } from "@/components/ui/mobile-nav";
import { useLocation } from "wouter";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const [location] = useLocation();
  const isAuthPage = location === "/login" || location === "/register";
  
  return (
    <>
      {!isAuthPage && <Header />}
      <div className={`${!isAuthPage ? 'pt-16 pb-16' : ''} min-h-screen bg-gray-50`}>
        <div className="container mx-auto px-4 mt-4">
          {children}
        </div>
      </div>
      {!isAuthPage && <MobileNav />}
    </>
  );
}