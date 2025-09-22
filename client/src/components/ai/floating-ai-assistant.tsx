import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { authenticatedRequest } from "@/lib/auth";
import { Bot, Send, Sparkles, X, MessageSquare, ChevronUp, ChevronDown } from "lucide-react";

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [positionOffset, setPositionOffset] = useState(0); // Vertical offset from center
  const [showControls, setShowControls] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Load position from localStorage on mount
  useEffect(() => {
    const savedOffset = localStorage.getItem('ai-assistant-position');
    if (savedOffset) {
      setPositionOffset(parseInt(savedOffset, 10));
    }
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('ai-assistant-position', positionOffset.toString());
  }, [positionOffset]);

  // Only show to admin-level users (admin and super-admin)
  if (!user || (user.role !== "admin" && user.role !== "super-admin")) {
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

    if (prompt.length > 2000) {
      toast({
        title: "Prompt too long",
        description: "Please keep your question under 2000 characters.",
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

  const moveUp = () => {
    setPositionOffset(prev => Math.max(prev - 60, -200)); // Constrain upward movement
  };

  const moveDown = () => {
    setPositionOffset(prev => Math.min(prev + 60, 200)); // Constrain downward movement
  };

  const containerStyle = {
    transform: `translateY(${positionOffset}px)`
  };

  return (
    <div 
      className="fixed top-1/2 right-6 z-50 flex flex-col items-center gap-2"
      style={containerStyle}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Move Up Button */}
      <Button
        size="sm"
        variant="outline"
        className={`rounded-full w-8 h-8 shadow-md transition-all duration-200 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        onClick={moveUp}
        disabled={positionOffset <= -200}
        data-testid="button-ai-move-up"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      {/* Main AI Assistant Button */}
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
            <DialogDescription>
              Ask questions about your IT assets, software licenses, or get optimization recommendations for your ITAM portal.
            </DialogDescription>
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
                  {prompt.length > 0 && (
                    <span className={prompt.length > 2000 ? "text-destructive" : ""}>
                      {prompt.length}/2000 chars • 
                    </span>
                  )}
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
                    disabled={isLoading || !prompt.trim() || prompt.length > 2000}
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

      {/* Move Down Button */}
      <Button
        size="sm"
        variant="outline"
        className={`rounded-full w-8 h-8 shadow-md transition-all duration-200 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
        onClick={moveDown}
        disabled={positionOffset >= 200}
        data-testid="button-ai-move-down"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}