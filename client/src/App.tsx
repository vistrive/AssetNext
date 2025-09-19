import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { FloatingAIAssistant } from "@/components/ai/floating-ai-assistant";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Assets from "@/pages/assets";
import Recommendations from "@/pages/recommendations";
import AIResponse from "@/pages/ai-response";
import Software from "@/pages/software";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Tickets from "@/pages/tickets";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/tickets">
        <ProtectedRoute requiredRole="employee">
          <Tickets />
        </ProtectedRoute>
      </Route>
      <Route path="/assets">
        <ProtectedRoute requiredRole="employee">
          <Assets />
        </ProtectedRoute>
      </Route>
      <Route path="/recommendations">
        <ProtectedRoute requiredRole="manager">
          <Recommendations />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-response">
        <ProtectedRoute requiredRole="admin">
          <AIResponse />
        </ProtectedRoute>
      </Route>
      <Route path="/software">
        <ProtectedRoute requiredRole="employee">
          <Software />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute requiredRole="employee">
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute requiredRole="admin">
          <Users />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <FloatingAIAssistant />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
