import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

// const BASE_URL = "http://localhost:8003/chat";
const BASE_URL = "https://zwande-backend.ca.lyzr.app/chat";

// Utility function to combine class names
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Toast component
const Toast: React.FC<{
  toast: Toast;
  onClose: (id: string) => void;
}> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 p-4 rounded-lg shadow-lg max-w-sm transition-all",
        toast.variant === 'destructive'
          ? "bg-red-500 text-white"
          : "bg-gray-800 text-white"
      )}
    >
      <div className="font-medium">{toast.title}</div>
      {toast.description && <div className="mt-1 text-sm">{toast.description}</div>}
    </div>
  );
};

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return Math.floor(Math.random() * 1000000000).toString();
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement === inputRef.current;
  
      if (!isInputFocused) {
        // Allow normal shortcut keys like Ctrl, Cmd, Alt, etc.
        if (e.ctrlKey || e.metaKey || e.altKey) return;
  
        // Prevent default to avoid unintended browser actions
        e.preventDefault();
  
        // Focus the input
        inputRef.current?.focus();
  
        // Type the character if it's a printable key
        if (e.key.length === 1) {
          setInputMessage(prev => prev + e.key);
        }
  
        // Handle Backspace
        if (e.key === 'Backspace') {
          setInputMessage(prev => prev.slice(0, -1));
        }
  
        // Do not auto-submit on Enter; just focus and wait for user to press again
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  

  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
    setToasts(prev => [...prev, { ...toast, id: Date.now().toString() }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Send message to API
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: inputMessage
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add agent response to chat
      const agentMessage: Message = {
        id: Date.now().toString(),
        content: data.response || "I'm not sure how to respond to that.",
        sender: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      addToast({
        title: "Error",
        description: "Failed to get a response from the agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshSession = () => {
    const newSessionId = Math.floor(Math.random() * 1000000000).toString();
    setSessionId(newSessionId);
    setMessages([]);
    addToast({
      title: "Session Refreshed",
      description: `New session started with ID: ${newSessionId}`,
    });
  };

  return (
    <div className="relative flex flex-col h-[600px] w-full max-w- mx-auto rounded-lg shadow-lg bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-green-400"></div>
          <h2 className="font-medium">Zwende Search Agent</h2>
        </div>
        <button 
          onClick={refreshSession}
          className="flex items-center text-sm text-purple-600 hover:text-purple-800"
        >
          <RefreshCcw size={16} className="mr-1" />
          Refresh Session
        </button>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>Send a message to start chatting with Zwende Search Agent</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={cn(
                "mb-4 max-w-[80%] w-fit rounded-lg p-3", 
                message.sender === 'user' 
                  ? "ml-auto bg-purple-600 text-white rounded-tr-none" 
                  : "bg-white border border-gray-200 rounded-tl-none"
              )}
            >
              {message.sender === 'agent' ? (
                <ReactMarkdown
                components={{
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="text-purple-600 underline hover:text-blue-800 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  )
                }}
              >
                {message.content}
              </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex space-x-2 p-3 max-w-[80%] w-fit bg-white border border-gray-200 rounded-lg rounded-tl-none">
            <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-2 w-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t flex items-center">
      <input
        ref={inputRef}
        type="text"
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        placeholder="Ask about products..."
        className="flex-1 py-2 px-4 outline-none bg-gray-100 rounded-full focus:ring-2 focus:ring-purple-300 transition-all"
        disabled={isLoading}
      />
        <button
          type="submit"
          className="ml-2 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!inputMessage.trim() || isLoading}
        >
          <Send size={18} />
        </button>
      </form>

      {/* Toast container */}
      <div className="fixed bottom-0 right-0 p-4">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default ChatInterface;