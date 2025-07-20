import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Foundation from "@/pages/Foundation";
import DailyPlanning from "@/pages/DailyPlanning";
import Calendar from "@/pages/Calendar";
import ProjectManagement from "@/pages/ProjectManagement";
import TaskManagement from "@/pages/TaskManagement";
import HabitManagement from "@/pages/HabitManagement";
import WeeklyReview from "@/pages/WeeklyReview";
import MonthlyReview from "@/pages/MonthlyReview";
import FocusMode from "@/pages/FocusMode";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/foundation" component={Foundation} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/project-management" component={ProjectManagement} />
        <Route path="/task-management" component={TaskManagement} />
        <Route path="/habit-management" component={HabitManagement} />
        <Route path="/daily-planning" component={DailyPlanning} />
        <Route path="/focus" component={FocusMode} />
        <Route path="/weekly" component={WeeklyReview} />
        <Route path="/monthly" component={MonthlyReview} />
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
