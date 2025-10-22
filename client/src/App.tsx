

import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Foundation from "@/pages/Foundation";
import Calendar from "@/pages/Calendar";
import Planning from "@/pages/Planning";
import DailyPlanning from "@/pages/DailyPlanning";
import Review from "@/pages/Review";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import ProjectManagement from "@/pages/ProjectManagement";

import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Debug logging for routing
  console.log('Current location:', location);
  console.log('Is authenticated:', isAuthenticated);
  console.log('Is loading:', isLoading);
  console.log('Window location:', window.location.pathname);
  console.log('Window location href:', window.location.href);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  // Get the actual path from window.location as fallback
  const actualPath = window.location.pathname;
  const currentPath = location || actualPath;

  console.log('Using path:', currentPath);

  // Handle specific routes with explicit matching
  if (currentPath === '/login') {
    return <Login />;
  }

  if (!isAuthenticated) {
    if (currentPath === '/') {
      return <Landing />;
    }
    return <NotFound />;
  }

  // Authenticated routes
  const renderAuthenticatedRoute = () => {
    switch (currentPath) {
      case '/':
        return <Home />;
      case '/dashboard':
        return <Dashboard />;
      case '/foundation':
        return <Foundation />;
      case '/calendar':
        return <Calendar />;
      case '/planning':
        return <Planning />;
      case '/projects':
        return <ProjectManagement />;
      case '/daily-planning':
      case '/daily':
        return <DailyPlanning />;
      case '/review':
        return <Review />;
      default:
        console.log('Route not found, showing NotFound for path:', currentPath);
        return <NotFound />;
    }
  };

  return (
    <Layout>
      {renderAuthenticatedRoute()}
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
