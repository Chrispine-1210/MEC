import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot,
  User,
  Minimize2,
  Maximize2,
  RotateCcw,
  Brain,
  ShieldCheck,
  Database,
  ExternalLink,
  Copy,
  Square,
  Trash2,
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
  retryText?: string;
}

type StoredConversationResponse = {
  id: string;
  title: string | null;
  isActive: boolean;
  memory?: ChatMemoryState;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
};

const CONVERSATION_ID_KEY = "mtendere-ai-conversation-id";
const CONVERSATION_TOKEN_KEY = "mtendere-ai-conversation-token";
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
  const [conversationToken, setConversationToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CONVERSATION_TOKEN_KEY);
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingAssistantIdRef = useRef<string | null>(null);
  const pendingUserTextRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const suppressAbortErrorRef = useRef(false);
  const { data: chatConfig } = useQuery<{ ready: boolean; message: string | null }>({
    queryKey: ["/api/chat/config"],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      suppressAbortErrorRef.current = false;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const assistantId = `assistant-${Date.now()}`;
      pendingAssistantIdRef.current = assistantId;
      setMessages((previous) => [...previous, {
        id: assistantId,
        content: "",
        sender: "assistant",
        timestamp: new Date(),
      }]);
      const response = await apiRequest("POST", "/api/chat/stream", {
        message,
        conversationId: conversationId || undefined,
        conversationToken: conversationToken || undefined,
        currentPage: typeof window !== "undefined" ? window.location.pathname : undefined,
        memoryEnabled,
        memoryPreferences: memorySnapshot.userPreferences,
      }, { signal: abortController.signal });
      if (!response.body) throw new Error("Streaming response was not available.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completePayload: any = null;
      const processBlock = (block: string) => {
        const lines = block.split(/\r?\n/);
        const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
        const dataText = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (!dataText) return;
        const data = JSON.parse(dataText);
        if (event === "delta" && typeof data.delta === "string") {
          setMessages((previous) => previous.map((item) =>
            item.id === assistantId ? { ...item, content: item.content + data.delta } : item,
          ));
        } else if (event === "complete") {
          completePayload = data;
        } else if (event === "error") {
          const error = new Error(data.message || "AI chat is temporarily unavailable.");
          Object.assign(error, data);
          throw error;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let boundary = buffer.search(/\r?\n\r?\n/);
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] || "\n\n";
          buffer = buffer.slice(boundary + separator.length);
          processBlock(block);
          boundary = buffer.search(/\r?\n\r?\n/);
        }
        if (done) break;
      }
      if (buffer.trim()) processBlock(buffer.trim());
      if (!completePayload) throw new Error("The AI response stream ended before completion.");
      return { ...completePayload, assistantId };
    },
    onSuccess: (data) => {
      if (data.conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem(CONVERSATION_ID_KEY, data.conversationId);
      }
      if (data.conversationToken) {
        setConversationToken(data.conversationToken);
        localStorage.setItem(CONVERSATION_TOKEN_KEY, data.conversationToken);
      }
      if (data.metadata?.memory) {
        setMemorySnapshot(data.metadata.memory);
        setMemoryEnabled(data.metadata.memory.enabled);
        localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, String(data.metadata.memory.enabled));
      }
      setMessages((previous) => previous.map((item) => item.id === data.assistantId
        ? {
            ...item,
            content: item.content || data.response || "The AI provider returned no text.",
            metadata: data.metadata,
          }
        : item));
      pendingAssistantIdRef.current = null;
      pendingUserTextRef.current = null;
      abortControllerRef.current = null;
    },
    onError: (error) => {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";
      const errorName = error && typeof error === "object" && "name" in error
        ? String((error as { name?: unknown }).name || "")
        : "";
      const stopped = code === "generation_stopped" || errorName === "AbortError";
      if (stopped && suppressAbortErrorRef.current) {
        suppressAbortErrorRef.current = false;
        pendingAssistantIdRef.current = null;
        pendingUserTextRef.current = null;
        abortControllerRef.current = null;
        return;
      }
      if (code.startsWith("conversation_")) {
        setConversationId(null);
        setConversationToken(null);
        localStorage.removeItem(CONVERSATION_ID_KEY);
        localStorage.removeItem(CONVERSATION_TOKEN_KEY);
      }
      const errorContext = error && typeof error === "object"
        ? error as { conversationId?: string; conversationToken?: string; name?: string }
        : {};
      if (errorContext.conversationId) {
        setConversationId(errorContext.conversationId);
        localStorage.setItem(CONVERSATION_ID_KEY, errorContext.conversationId);
      }
      if (errorContext.conversationToken) {
        setConversationToken(errorContext.conversationToken);
        localStorage.setItem(CONVERSATION_TOKEN_KEY, errorContext.conversationToken);
      }
      const pendingId = pendingAssistantIdRef.current;
      const message = stopped
        ? "Generation stopped. You can retry this message."
        : error instanceof Error ? error.message : "AI chat is temporarily unavailable.";
      const retryText = pendingUserTextRef.current ?? undefined;
      if (pendingId) {
        setMessages((previous) => previous.map((item) => item.id === pendingId
          ? { ...item, content: message, retryText }
          : item));
      } else {
        setMessages((previous) => [...previous, {
          id: Date.now().toString(),
          content: message,
          sender: "assistant",
          timestamp: new Date(),
          retryText,
        }]);
      }
      pendingAssistantIdRef.current = null;
      pendingUserTextRef.current = null;
      abortControllerRef.current = null;
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
    if (!conversationId || chatMutation.isPending) return;
    const abortController = new AbortController();
    const headers = conversationToken ? { "x-ai-conversation-token": conversationToken } : undefined;

    apiRequest(
      "GET",
      `/api/chat/conversations/${encodeURIComponent(conversationId)}`,
      undefined,
      { headers, signal: abortController.signal },
    )
      .then((response) => response.json() as Promise<StoredConversationResponse>)
      .then((conversation) => {
        const restored: ChatMessage[] = [welcomeMessage()];
        conversation.messages.forEach((message, index) => {
          const timestamp = new Date(message.createdAt);
          const metadata = message.metadata ?? {};
          restored.push({
            id: `${message.role}-${message.createdAt}-${index}`,
            content: message.content,
            sender: message.role === "user" ? "user" : "assistant",
            timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
            metadata: message.role === "assistant" ? metadata as ChatMetadata : undefined,
          });
          if (message.role === "user" && (metadata.status === "failed" || metadata.status === "pending")) {
            restored.push({
              id: `retry-${String(metadata.turnId ?? index)}`,
              content: metadata.status === "pending"
                ? "The previous response did not finish. You can retry this message."
                : "The previous response failed. You can retry this message.",
              sender: "assistant",
              timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
              retryText: message.content,
            });
          }
        });
        setMessages(restored.slice(-31));
        if (conversation.memory) {
          setMemorySnapshot(conversation.memory);
          setMemoryEnabled(conversation.memory.enabled);
          localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, String(conversation.memory.enabled));
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const status = error && typeof error === "object" && "status" in error
          ? Number((error as { status?: unknown }).status)
          : 0;
        if (status === 403 || status === 404) {
          setConversationId(null);
          setConversationToken(null);
          localStorage.removeItem(CONVERSATION_ID_KEY);
          localStorage.removeItem(CONVERSATION_TOKEN_KEY);
        }
      });

    return () => abortController.abort();
  }, [chatMutation.isPending, conversationId, conversationToken]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const submitMessage = (message: string) => {
    const normalized = message.trim();
    if (!normalized || chatMutation.isPending || chatConfig?.ready !== true) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: normalized,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    pendingUserTextRef.current = normalized;
    chatMutation.mutate(normalized);
  };

  const handleSendMessage = () => {
    submitMessage(inputMessage);
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
    submitMessage(action);
  };

  const handleMemoryToggle = (enabled: boolean) => {
    setMemoryEnabled(enabled);
    setMemorySnapshot((current) => ({ ...current, enabled }));
    localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, String(enabled));

    if (!conversationId) return;

    apiRequest("PUT", "/api/chat/memory", {
      conversationId,
      conversationToken: conversationToken || undefined,
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

    apiRequest("DELETE", "/api/chat/memory", {
      conversationId,
      conversationToken: conversationToken || undefined,
    })
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

  const clearLocalConversation = () => {
    setMessages([welcomeMessage()]);
    setInputMessage("");
    setConversationId(null);
    setConversationToken(null);
    setMemorySnapshot(emptyMemoryState(memoryEnabled));
    localStorage.removeItem(CONVERSATION_ID_KEY);
    localStorage.removeItem(CONVERSATION_TOKEN_KEY);
    localStorage.removeItem(CHAT_TRANSCRIPT_KEY);
    inputRef.current?.focus();
  };

  const conversationHeaders = () => conversationToken
    ? { "x-ai-conversation-token": conversationToken }
    : undefined;

  const resetConversation = () => {
    suppressAbortErrorRef.current = Boolean(abortControllerRef.current);
    abortControllerRef.current?.abort();
    const activeConversationId = conversationId;
    const headers = conversationHeaders();
    clearLocalConversation();
    if (activeConversationId) {
      apiRequest(
        "POST",
        `/api/chat/conversations/${encodeURIComponent(activeConversationId)}/close`,
        undefined,
        { headers },
      ).catch(() => undefined);
    }
  };

  const deleteConversation = async () => {
    suppressAbortErrorRef.current = Boolean(abortControllerRef.current);
    abortControllerRef.current?.abort();
    if (!conversationId) {
      clearLocalConversation();
      return;
    }
    const shouldDelete = typeof window === "undefined"
      || window.confirm("Delete this AI conversation and its stored history?");
    if (!shouldDelete) return;
    try {
      await apiRequest(
        "DELETE",
        `/api/chat/conversations/${encodeURIComponent(conversationId)}`,
        undefined,
        { headers: conversationHeaders() },
      );
      clearLocalConversation();
    } catch (error) {
      setMessages((previous) => [...previous, {
        id: `delete-error-${Date.now()}`,
        content: error instanceof Error ? error.message : "Conversation could not be deleted.",
        sender: "assistant",
        timestamp: new Date(),
      }]);
    }
  };

  const stopGeneration = () => abortControllerRef.current?.abort();

  const copyMessage = async (content: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(content).catch(() => undefined);
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
                    <div className={`h-2 w-2 rounded-full ${chatConfig?.ready ? "bg-mtendere-green" : "bg-amber-300"}`}></div>
                    <span className="text-xs opacity-80">{chatConfig?.ready ? "Ready" : "Unavailable"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-card hover:bg-opacity-20 w-8 h-8"
                  onClick={deleteConversation}
                  disabled={chatMutation.isPending && !conversationId}
                  aria-label="Delete AI conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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
                              {message.sender === "assistant" && message.content && (
                                <div className="mt-1 flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyMessage(message.content)}
                                    aria-label="Copy AI response"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  {message.retryText && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[11px]"
                                      onClick={() => submitMessage(message.retryText || "")}
                                      disabled={chatMutation.isPending || chatConfig?.ready !== true}
                                    >
                                      <RotateCcw className="mr-1 h-3 w-3" />
                                      Retry
                                    </Button>
                                  )}
                                </div>
                              )}
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
                          disabled={chatConfig?.ready !== true || chatMutation.isPending}
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
                    disabled={chatMutation.isPending || chatConfig?.ready !== true}
                    maxLength={900}
                    className="flex-1 text-sm bg-background border-border/70 focus:border-mtendere-blue focus:ring-mtendere-blue"
                  />
                  <Button
                    onClick={chatMutation.isPending ? stopGeneration : handleSendMessage}
                    disabled={chatMutation.isPending ? false : !inputMessage.trim() || chatConfig?.ready !== true}
                    size="icon"
                    className="bg-mtendere-blue hover:bg-mtendere-blue/90 flex-shrink-0"
                    aria-label={chatMutation.isPending ? "Stop AI generation" : "Send message"}
                  >
                    {chatMutation.isPending ? (
                      <Square className="h-4 w-4 fill-current" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <TooltipProvider>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex min-w-0 items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-mtendere-green" />
                      <span className="truncate">{chatConfig?.ready ? "AI ready" : chatConfig?.message || "Checking AI availability"}</span>
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



