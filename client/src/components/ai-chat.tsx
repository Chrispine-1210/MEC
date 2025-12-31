import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Maximize2
} from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hello! I'm your AI assistant for Mtendere Education. How can I help you today?",
      sender: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        content: data.response,
        sender: 'assistant',
        timestamp: new Date(),
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
    setInputMessage(action);
    handleSendMessage();
  };

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <Button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-mtendere-blue hover:bg-blue-700 shadow-lg z-50 animate-bounce"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className={`fixed bottom-6 right-6 w-80 md:w-96 bg-white shadow-2xl z-50 animate-scale-in ${
          isMinimized ? 'h-16' : 'h-96'
        } transition-all duration-300`}>
          {/* Chat Header */}
          <CardHeader className="bg-mtendere-blue text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Mtendere Assistant</CardTitle>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs opacity-80">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white hover:bg-opacity-20 w-8 h-8"
                  onClick={() => setIsMinimized(!isMinimized)}
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
                  className="text-white hover:bg-white hover:bg-opacity-20 w-8 h-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isMinimized && (
            <>
              {/* Chat Messages */}
              <CardContent className="p-0 h-64 overflow-y-auto bg-gray-50">
                <div className="p-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="animate-fade-in">
                      <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.sender === 'user'
                            ? 'bg-mtendere-blue text-white'
                            : 'bg-white text-gray-800 shadow-sm border'
                        }`}>
                          <div className="flex items-start space-x-2">
                            {message.sender === 'assistant' && (
                              <Bot className="w-4 h-4 mt-0.5 text-mtendere-blue flex-shrink-0" />
                            )}
                            <div>
                              <p className="leading-relaxed">{message.content}</p>
                              <p className={`text-xs mt-1 opacity-60 ${
                                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
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
                      <div className="bg-white text-gray-800 shadow-sm border px-3 py-2 rounded-lg text-sm max-w-xs">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-4 h-4 text-mtendere-blue" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length === 1 && (
                  <div className="p-4 bg-white border-t">
                    <p className="text-xs text-gray-600 mb-3">Quick actions:</p>
                    <div className="space-y-2">
                      {quickActions.slice(0, 3).map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start text-xs h-8 text-gray-600 hover:text-mtendere-blue hover:border-mtendere-blue"
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
              <div className="p-4 border-t bg-white rounded-b-lg">
                <div className="flex space-x-2">
                  <Input
                    ref={inputRef}
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={chatMutation.isPending}
                    className="flex-1 text-sm border-gray-200 focus:border-mtendere-blue focus:ring-mtendere-blue"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || chatMutation.isPending}
                    size="icon"
                    className="bg-mtendere-blue hover:bg-blue-700 flex-shrink-0"
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Powered by AI • Available 24/7
                </p>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}
