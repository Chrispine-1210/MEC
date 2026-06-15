import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Bot,
  User,
  Minimize2,
  Maximize2,
  RotateCcw,
  Brain,
  ShieldCheck,
  Database,
  ExternalLink
} from "lucide-react";

type ChatRiskLevel = "low" | "medium" | "high";

interface ChatSuggestedAction {
  id: string;
  label: string;
  description: string;
  risk: ChatRiskLevel;
  requiresApproval: boolean;
  href?: string;
}

interface ChatMemoryState {
  enabled: boolean;
  userPreferences: string[];
  shortTermSummary: string | null;
  lastUpdatedAt: string | null;
}

interface ChatMetadata {
  intent?: string;
  confidence?: number;
  riskLevel?: ChatRiskLevel;
  selectedAgent?: string;
  actionPlan?: {
    status?: string;
    requiredPermission?: string;
    rationale?: string;
  };
  agentTrace?: {
    selectedAgent?: string;
    securityReview?: string;
    participatingAgents?: string[];
  };
  safetyFlags?: string[];
  retrievalSources?: Array<{ title?: string; snippet?: string; type?: string }>;
  suggestedActions?: ChatSuggestedAction[];
  memory?: ChatMemoryState;
  escalationRequired?: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  metadata?: ChatMetadata;
}

const CONVERSATION_ID_KEY = "mtendere-ai-conversation-id";
const CHAT_TRANSCRIPT_KEY = "mtendere-ai-chat-messages";
const CHAT_MEMORY_ENABLED_KEY = "mtendere-ai-memory-enabled";

const welcomeMessage = (): ChatMessage => ({
  id: "welcome",
  content: "Hello! I'm your AI assistant for Mtendere Education. How can I help you today?",
  sender: "assistant",
  timestamp: new Date(),
});

const loadStoredMessages = (): ChatMessage[] => {
  if (typeof window === "undefined") return [welcomeMessage()];

  try {
    const stored = localStorage.getItem(CHAT_TRANSCRIPT_KEY);
    if (!stored) return [welcomeMessage()];

    const parsed = JSON.parse(stored) as Array<Omit<ChatMessage, "timestamp"> & { timestamp: string }>;
    const messages = parsed
      .filter((item) => item?.id && item?.content && (item.sender === "user" || item.sender === "assistant"))
      .slice(-30)
      .map((item) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));

    return messages.length > 0 ? messages : [welcomeMessage()];
  } catch {
    return [welcomeMessage()];
  }
};

const loadMemoryEnabled = () => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(CHAT_MEMORY_ENABLED_KEY) !== "false";
};

const emptyMemoryState = (enabled = true): ChatMemoryState => ({
  enabled,
  userPreferences: [],
  shortTermSummary: null,
  lastUpdatedAt: null,
});

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadStoredMessages);
  const [inputMessage, setInputMessage] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(loadMemoryEnabled);
  const [memorySnapshot, setMemorySnapshot] = useState<ChatMemoryState>(() => emptyMemoryState(loadMemoryEnabled()));
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CONVERSATION_ID_KEY);
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        conversationId,
        currentPage: typeof window !== "undefined" ? window.location.pathname : undefined,
        memoryEnabled,
        memoryPreferences: memorySnapshot.userPreferences,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem(CONVERSATION_ID_KEY, data.conversationId);
      }
      if (data.metadata?.memory) {
        setMemorySnapshot(data.metadata.memory);
        setMemoryEnabled(data.metadata.memory.enabled);
        localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, String(data.metadata.memory.enabled));
      }
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        content: data.response || "I received your message, but I could not generate a full response. Please try again or contact the Mtendere team directly.",
        sender: 'assistant',
        timestamp: new Date(),
        metadata: data.metadata,
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: "I'm sorry, I'm experiencing technical difficulties. Please try again later or contact our support team.",
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      CHAT_TRANSCRIPT_KEY,
      JSON.stringify(
        messages.slice(-30).map((message) => ({
          ...message,
          timestamp: message.timestamp.toISOString(),
        })),
      ),
    );
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    chatMutation.mutate(inputMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const quickActions = [
    "Find scholarships for computer science",
    "What job opportunities are available?",
    "How do I apply for scholarships?",
    "Tell me about study abroad programs",
    "Help with university applications",
  ];

  const handleQuickAction = (action: string) => {
    if (chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: action,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    chatMutation.mutate(action);
  };

  const handleMemoryToggle = (enabled: boolean) => {
    setMemoryEnabled(enabled);
    setMemorySnapshot((current) => ({ ...current, enabled }));
    localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, String(enabled));

    if (!conversationId) return;

    apiRequest("PUT", "/api/chat/memory", {
      conversationId,
      enabled,
      userPreferences: memorySnapshot.userPreferences,
    }).catch(() => {
      setMemoryEnabled(!enabled);
      setMemorySnapshot((current) => ({ ...current, enabled: !enabled }));
      localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, String(!enabled));
    });
  };

  const clearConversationMemory = () => {
    if (!conversationId) {
      setMemoryEnabled(false);
      setMemorySnapshot(emptyMemoryState(false));
      localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, "false");
      return;
    }

    apiRequest("DELETE", `/api/chat/memory?conversationId=${encodeURIComponent(conversationId)}`)
      .then((response) => response.json())
      .then((data) => {
        const nextMemory = data.memory ?? emptyMemoryState(false);
        setMemorySnapshot(nextMemory);
        setMemoryEnabled(nextMemory.enabled);
        localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, String(nextMemory.enabled));
      })
      .catch(() => {
        setMemoryEnabled(false);
        setMemorySnapshot(emptyMemoryState(false));
        localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, "false");
      });
  };

  const handleSuggestedAction = (action: ChatSuggestedAction) => {
    if (action.href && typeof window !== "undefined") {
      window.location.href = action.href;
      return;
    }

    setInputMessage(action.description);
    inputRef.current?.focus();
  };

  const resetConversation = () => {
    setMessages([welcomeMessage()]);
    setInputMessage("");
    setConversationId(null);
    setMemorySnapshot(emptyMemoryState(memoryEnabled));
    localStorage.removeItem(CONVERSATION_ID_KEY);
    localStorage.removeItem(CHAT_TRANSCRIPT_KEY);
    inputRef.current?.focus();
  };

  const getRiskBadgeClass = (risk?: ChatRiskLevel) => {
    if (risk === "high") return "bg-destructive/15 text-destructive border-destructive/20";
    if (risk === "medium") return "bg-amber-500/15 text-amber-700 border-amber-500/20";
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
  };

  const getActionBadgeClass = (status?: string) => {
    if (status === "blocked") return "bg-destructive/15 text-destructive border-destructive/20";
    if (status === "requires_approval") return "bg-amber-500/15 text-amber-700 border-amber-500/20";
    if (status === "proposed") return "bg-info/15 text-info border-info/20";
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
  };

  const formatConfidence = (confidence?: number) =>
    typeof confidence === "number" ? `${Math.round(confidence * 100)}%` : "n/a";

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <Button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-mtendere-blue hover:bg-mtendere-blue/90 shadow-lg z-50 animate-bounce"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className={`fixed bottom-6 right-6 w-80 md:w-96 bg-card border border-border/60 shadow-2xl z-50 animate-scale-in ${
          isMinimized ? 'h-16' : 'h-96'
        } transition-all duration-300`}>
          {/* Chat Header */}
          <CardHeader className="bg-mtendere-blue text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-card bg-opacity-20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Mtendere Assistant</CardTitle>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-mtendere-green rounded-full"></div>
                    <span className="text-xs opacity-80">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-card hover:bg-opacity-20 w-8 h-8"
                  onClick={resetConversation}
                  aria-label="Start new AI conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-card hover:bg-opacity-20 w-8 h-8"
                  onClick={() => setIsMinimized(!isMinimized)}
                  aria-label={isMinimized ? "Expand AI chat" : "Minimize AI chat"}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-card hover:bg-opacity-20 w-8 h-8"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close AI chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isMinimized && (
            <>
              {/* Chat Messages */}
              <CardContent className="p-0 h-64 overflow-y-auto bg-muted/40">
                <div className="p-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="animate-fade-in">
                      <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.sender === 'user'
                            ? 'bg-mtendere-blue text-white'
                            : 'bg-card text-foreground shadow-sm border border-border/60'
                        }`}>
                          <div className="flex items-start space-x-2">
                            {message.sender === 'assistant' && (
                              <Bot className="w-4 h-4 mt-0.5 text-mtendere-blue flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                              {message.sender === "assistant" && message.metadata && (
                                <div className="mt-2 space-y-2">
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
                                      {formatConfidence(message.metadata.confidence)}
                                    </Badge>
                                    <Badge variant="outline" className={`h-5 px-1.5 text-[10px] font-medium ${getRiskBadgeClass(message.metadata.riskLevel)}`}>
                                      {message.metadata.riskLevel ?? "low"} risk
                                    </Badge>
                                    {message.metadata.selectedAgent && (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium bg-info/15 text-info border-info/20">
                                        {message.metadata.selectedAgent}
                                      </Badge>
                                    )}
                                    {message.metadata.actionPlan?.status && (
                                      <Badge variant="outline" className={`h-5 px-1.5 text-[10px] font-medium ${getActionBadgeClass(message.metadata.actionPlan.status)}`}>
                                        {message.metadata.actionPlan.status}
                                      </Badge>
                                    )}
                                    {(message.metadata.retrievalSources?.length ?? 0) > 0 && (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium bg-mtendere-blue/10 text-mtendere-blue border-mtendere-blue/20">
                                        {message.metadata.retrievalSources?.length} sources
                                      </Badge>
                                    )}
                                    {message.metadata.escalationRequired && (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium bg-amber-500/15 text-amber-700 border-amber-500/20">
                                        review
                                      </Badge>
                                    )}
                                  </div>
                                  {message.metadata.suggestedActions?.length ? (
                                    <div className="flex flex-wrap gap-1">
                                      {message.metadata.suggestedActions.slice(0, 2).map((action) => (
                                        <Button
                                          key={action.id}
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 max-w-full justify-start gap-1 px-2 text-[11px]"
                                          onClick={() => handleSuggestedAction(action)}
                                        >
                                          <span className="truncate">{action.label}</span>
                                          {action.href && <ExternalLink className="h-3 w-3 flex-shrink-0" />}
                                        </Button>
                                      ))}
                                    </div>
                                  ) : null}
                                  {message.metadata.actionPlan?.requiredPermission && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Requires permission: {message.metadata.actionPlan.requiredPermission}
                                    </p>
                                  )}
                                </div>
                              )}
                              <p className={`text-xs mt-1 opacity-60 ${
                                message.sender === 'user' ? 'text-white/80' : 'text-muted-foreground'
                              }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {chatMutation.isPending && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="bg-card text-foreground shadow-sm border border-border/60 px-3 py-2 rounded-lg text-sm max-w-xs">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-4 h-4 text-mtendere-blue" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length === 1 && (
                  <div className="p-4 bg-card border-t border-border/60">
                    <p className="text-xs text-muted-foreground mb-3">Quick actions:</p>
                    <div className="space-y-2">
                      {quickActions.slice(0, 3).map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start text-xs h-8 text-muted-foreground hover:text-mtendere-blue hover:border-mtendere-blue"
                          onClick={() => handleQuickAction(action)}
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Chat Input */}
              <div className="p-4 border-t border-border/60 bg-card rounded-b-lg">
                <div className="flex space-x-2">
                  <Input
                    ref={inputRef}
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={chatMutation.isPending}
                    maxLength={900}
                    className="flex-1 text-sm bg-background border-border/70 focus:border-mtendere-blue focus:ring-mtendere-blue"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || chatMutation.isPending}
                    size="icon"
                    className="bg-mtendere-blue hover:bg-mtendere-blue/90 flex-shrink-0"
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <TooltipProvider>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex min-w-0 items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-mtendere-green" />
                      <span className="truncate">Powered by AI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-1 hover:bg-muted"
                          >
                            <Brain className="h-3.5 w-3.5" />
                            <span>Memory</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64 text-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{memoryEnabled ? "Memory is on" : "Memory is off"}</p>
                            {memorySnapshot.userPreferences.length > 0 ? (
                              <p>{memorySnapshot.userPreferences.slice(0, 3).join("; ")}</p>
                            ) : (
                              <p>No preferences stored yet.</p>
                            )}
                            {memorySnapshot.shortTermSummary && <p>{memorySnapshot.shortTermSummary}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      <Switch
                        checked={memoryEnabled}
                        onCheckedChange={handleMemoryToggle}
                        aria-label="Toggle AI memory"
                        className="h-5 w-9 data-[state=checked]:bg-mtendere-blue"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={clearConversationMemory}
                        aria-label="Clear AI memory"
                      >
                        <Database className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </TooltipProvider>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}



