import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { FloatingAIAssistant } from "@/components/ai/floating-ai-assistant";
import { QuickActionsButton } from "@/components/layout/quick-actions-button";
import { DraggableControls } from "@/components/layout/draggable-controls";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { DraggableAssetsSearch } from "@/components/dashboard/draggable-assets-search";
import { useState } from "react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Assets from "@/pages/assets";
import Recommendations from "@/pages/recommendations";
import AIResponse from "@/pages/ai-response";
import Software from "@/pages/software";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Vendors from "@/pages/vendors";
import Tickets from "@/pages/tickets";
import ActivityLogs from "@/pages/activity-logs";
import Reports from "@/pages/reports";

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
        <ProtectedRoute requiredRole="technician">
          <Tickets />
        </ProtectedRoute>
      </Route>
      <Route path="/assets">
        <ProtectedRoute requiredRole="technician">
          <Assets />
        </ProtectedRoute>
      </Route>
      <Route path="/assets/new">
        <ProtectedRoute requiredRole="technician">
          <Assets key="new" />
        </ProtectedRoute>
      </Route>
      <Route path="/recommendations">
        <ProtectedRoute requiredRole="it-manager">
          <Recommendations />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-response">
        <ProtectedRoute requiredRole="admin">
          <AIResponse />
        </ProtectedRoute>
      </Route>
      <Route path="/software">
        <ProtectedRoute requiredRole="technician">
          <Software />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute requiredRole="technician">
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute requiredRole="admin">
          <Users />
        </ProtectedRoute>
      </Route>
      <Route path="/users/new">
        <ProtectedRoute requiredRole="admin">
          <Users key="new" />
        </ProtectedRoute>
      </Route>
      <Route path="/vendors">
        <ProtectedRoute requiredRole="technician">
          <Vendors />
        </ProtectedRoute>
      </Route>
      <Route path="/vendors/new">
        <ProtectedRoute requiredRole="technician">
          <Vendors key="new" />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute requiredRole="technician">
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/activity-logs">
        <ProtectedRoute requiredRole="admin">
          <ActivityLogs />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [globalSearchDraggable, setGlobalSearchDraggable] = useState(false);
  const [assetsSearchDraggable, setAssetsSearchDraggable] = useState(false);
  const [draggableAssetsSearchProps, setDraggableAssetsSearchProps] = useState({
    searchTerm: '',
    onSearchTermChange: (term: string) => setDraggableAssetsSearchProps(prev => ({ ...prev, searchTerm: term })),
    onSearch: () => {},
    onClearSearch: () => setDraggableAssetsSearchProps(prev => ({ ...prev, searchTerm: '' }))
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <FloatingAIAssistant />
          <QuickActionsButton />
          
          {/* Draggable UI Controls */}
          <DraggableControls
            globalSearchDraggable={globalSearchDraggable}
            onGlobalSearchDraggableChange={setGlobalSearchDraggable}
            assetsSearchDraggable={assetsSearchDraggable}
            onAssetsSearchDraggableChange={setAssetsSearchDraggable}
          />
          
          {/* Draggable Global Search */}
          {globalSearchDraggable && (
            <GlobalSearch
              isDraggable={true}
              placeholder="Search assets, users, vendors..."
            />
          )}
          
          {/* Draggable Assets Search */}
          <DraggableAssetsSearch
            isDraggable={assetsSearchDraggable}
            {...draggableAssetsSearchProps}
          />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
