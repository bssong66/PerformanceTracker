import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Foundation from "@/pages/Foundation";
import DailyPlanning from "@/pages/DailyPlanning";
import Planning from "@/pages/Planning";
import WeeklyReview from "@/pages/WeeklyReview";
import HabitTracking from "@/pages/HabitTracking";
import FocusMode from "@/pages/FocusMode";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/foundation" component={Foundation} />
        <Route path="/daily" component={DailyPlanning} />
        <Route path="/planning" component={Planning} />
        <Route path="/weekly" component={WeeklyReview} />
        <Route path="/habit-tracking" component={HabitTracking} />
        <Route path="/focus" component={FocusMode} />
        <Route component={NotFound} />
      </Switch>
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
