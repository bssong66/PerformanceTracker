

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Foundation from "@/pages/Foundation";
import Calendar from "@/pages/Calendar";
import Planning from "@/pages/Planning";
import DailyPlanning from "@/pages/DailyPlanning";
import Review from "@/pages/Review";
import FocusMode from "@/pages/FocusMode";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/foundation" component={Foundation} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/planning" component={Planning} />
        <Route path="/daily-planning" component={DailyPlanning} />
        <Route path="/review" component={Review} />
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
