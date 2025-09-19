import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { authenticatedRequest } from "@/lib/auth";
import { Bot, Send, Sparkles, X, MessageSquare } from "lucide-react";

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Only show to admin users
  if (!user || user.role !== "admin") {
    return null;
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a question about the ITAM portal.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authenticatedRequest("POST", "/api/ai/query", {
        prompt: prompt.trim()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Navigate to AI response page with the response data
      setLocation(`/ai-response?sessionId=${data.sessionId}`);
      setIsOpen(false);
      setPrompt("");

    } catch (error: any) {
      console.error('AI query error:', error);
      toast({
        title: "AI query failed",
        description: error?.message || "There was an error processing your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            data-testid="button-ai-assistant"
          >
            <Bot className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              ITAM AI Assistant
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Ask me anything about your IT Asset Management portal. I can help with assets, licenses, reports, recommendations, and more.
            </div>
            
            <div className="space-y-3">
              <Textarea
                placeholder="Ask about assets, licenses, users, reports, or any ITAM-related question..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[100px] resize-none"
                disabled={isLoading}
                data-testid="textarea-ai-prompt"
              />
              
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      setPrompt("");
                    }}
                    disabled={isLoading}
                    data-testid="button-ai-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !prompt.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    data-testid="button-ai-submit"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Thinking...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Ask AI
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Example questions:</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• "How many laptops are currently deployed?"</div>
                <div>• "Which software licenses are expiring soon?"</div>
                <div>• "Generate a report of all assets in Building A"</div>
                <div>• "What are the current IT recommendations?"</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}