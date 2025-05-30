
import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCcw } from 'lucide-react';
// import ReactMarkdown from 'react-markdown';
// import rehypeRaw from 'rehype-raw';
import StreamingDisplay from './StreamingDisplay';

interface Product {
  product_name: string;
  description: string;
  link_to_product: string;
  price: string;
  image_url: string; // Changed to lowercase to match mapping
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'interactive' | 'interactive_prod';
  buttons?: string[];
  options?: string[];
  products?: Product[];
  total_products?: number;
}

interface StreamingData {
  type: string;
  data: any;
  timestamp: Date;
}

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

const BASE_URL = "http://localhost:8003/chat";

const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

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
        "fixed bottom-4 right-4 p-4 rounded-lg shadow-lg max-w-sm transition-all z-50",
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
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return Math.floor(Math.random() * 1000000000).toString();
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [streamingData, setStreamingData] = useState<StreamingData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [userQuery, setUserQuery] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement === inputRef.current;

      if (!isInputFocused && !isInputDisabled) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        inputRef.current?.focus();
        if (e.key.length === 1) {
          setInputMessage(prev => prev + e.key);
        }
        if (e.key === 'Backspace') {
          setInputMessage(prev => prev.slice(0, -1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInputDisabled]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
    setToasts(prev => [...prev, { ...toast, id: Date.now().toString() }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Helper function to format text with line breaks
  const formatTextWithLineBreaks = (text: string) => {
    return text.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const handleStreamingResponse = async (response: Response, userMessage: Message) => {
    setIsStreaming(true);
    setUserQuery(userMessage.content);
    console.log(userQuery)

    setStreamingData(prev => [...prev, {
      type: 'query',
      data: userMessage.content,
      timestamp: new Date()
    }]);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalMessage = '';
    let recommendedProducts: Product[] = [];
    // let totalProducts = 0;
    // let subcategoryTags: string[] = [];

    if (!reader) {
      throw new Error('No response body reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const streamItem = JSON.parse(line);
              console.log('Streaming item:', streamItem);
              
              if (streamItem.type !== 'follow_up' && streamItem.type !== 'final_response') {
                setStreamingData(prev => [...prev, {
                  type: streamItem.type,
                  data: streamItem.data,
                  timestamp: new Date()
                }]);
              }
              
              if (streamItem.type === 'follow_up') {
                finalMessage = streamItem.data;
                console.log('Stored follow_up message:', finalMessage);
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e, 'Line:', line);
            }
          }
        }
      }
      
      if (finalMessage && !recommendedProducts.length) {
        const agentMessage: Message = {
          id: Date.now().toString(),
          content: finalMessage,
          sender: 'agent',
          timestamp: new Date(),
          type: 'text',
        };
        console.log('Adding fallback text message:', agentMessage);
        setMessages(prev => [...prev, agentMessage]);
      }
      
    } catch (error) {
      console.error('Error reading stream:', error);
      addToast({
        title: "Error",
        description: "Failed to process streaming response. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: inputMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        const agentMessage: Message = {
          id: Date.now().toString(),
          content: data.response || "I'm not sure how to respond to that.",
          sender: 'agent',
          timestamp: new Date(),
          type: data.type || 'text',
          buttons: data.buttons || [],
          options: data.options || [],
          products: data.products?.map((p: any) => ({
            product_name: p.product_name,
            description: p.description,
            link_to_product: p.link_to_product,
            image_url: p.Image_URL || p.image_url,
            price: p.price,
          })) || [],
          total_products: data.metadata?.total_products || 0,
        };

        setMessages(prev => [...prev, agentMessage]);
        setIsInputDisabled(agentMessage.type === 'interactive');
        setIsLoading(false);
      } else {
        await handleStreamingResponse(response, userMessage);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      setIsLoading(false);
      addToast({
        title: "Error",
        description: "Failed to get a response from the agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleButtonClick = async (buttonText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: buttonText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsInputDisabled(false);

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: buttonText,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();

        const agentMessage: Message = {
          id: Date.now().toString(),
          content: data.response || "I'm not sure how to respond to that.",
          sender: 'agent',
          timestamp: new Date(),
          type: data.type || 'text',
          buttons: data.buttons || [],
          options: data.options || [],
          products: data.products?.map((p: any) => ({
            product_name: p.product_name,
            description: p.description,
            link_to_product: p.link_to_product,
            image_url: p.Image_URL || p.image_url,
            price: p.price,
          })) || [],
          total_products: data.metadata?.total_products || 0,
        };

        setMessages(prev => [...prev, agentMessage]);
        setIsInputDisabled(agentMessage.type === 'interactive');
        setIsLoading(false);
      } else {
        await handleStreamingResponse(response, userMessage);
      }

    } catch (error) {
      console.error('Error sending button response:', error);
      setIsStreaming(false);
      setIsLoading(false);
      addToast({
        title: "Error",
        description: "Failed to get a response from the agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshSession = () => {
    const newSessionId = Math.floor(Math.random() * 1000000000).toString();
    setSessionId(newSessionId);
    setMessages([]);
    setStreamingData([]);
    setUserQuery('');
    setIsInputDisabled(false);
    setIsStreaming(false);
    addToast({
      title: "Session Refreshed",
      description: `New session started with ID: ${newSessionId}`,
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col w-1/2 bg-white border-r border-gray-300">
        <div className="flex items-center justify-between p-4 border-b bg-purple-50 h-15">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-400"></div>
            <h2 className="font-semibold text-lg">Zwende Search Agent</h2>
          </div>
          <button
            onClick={refreshSession}
            className="flex items-center text-sm text-purple-600 hover:text-purple-800 px-3 py-1 rounded-md hover:bg-purple-100 transition-colors"
          >
            <RefreshCcw size={16} className="mr-1" />
            Refresh Session
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-lg">Send a message to start chatting with Zwende Search Agent</p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={cn(
                  "mb-4 max-w-[85%] w-fit rounded-lg p-3",
                  message.sender === 'user'
                    ? "ml-auto bg-purple-600 text-white rounded-tr-none"
                    : "bg-gray-50 border border-gray-200 rounded-tl-none"
                )}
              >
                {message.sender === 'agent' ? (
                  <>
                    <div className="whitespace-pre-wrap">
                      {formatTextWithLineBreaks(message.content)}
                    </div>
                    {message.type === 'interactive' && message.buttons && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.buttons.map((button, index) => (
                          <button
                            key={index}
                            onClick={() => handleButtonClick(button)}
                            className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                          >
                            {button}
                          </button>
                        ))}
                      </div>
                    )}
                    {message.options && message.options.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => handleButtonClick(option)}
                            className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {message.type === 'interactive_prod' && message.products && (
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        {message.products.map((product, index) => (
                          <div
                            key={index}
                            className="flex flex-col sm:flex-row items-start bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                          >
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.product_name}
                                className="w-full sm:w-24 h-24 object-cover rounded-md mb-2 sm:mb-0 sm:mr-3"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="text-base font-semibold text-gray-800">
                                {product.product_name}
                              </h3>
                              <div className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                                {formatTextWithLineBreaks(product.description)}
                              </div>
                              <a
                                href={product.link_to_product}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                              >
                                View Product
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {formatTextWithLineBreaks(message.content)}
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex space-x-2 p-3 max-w-[85%] w-fit bg-gray-50 border border-gray-200 rounded-lg rounded-tl-none">
              <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about products..."
              className="flex-1 py-3 px-4 outline-none bg-white border border-gray-300 rounded-full md-2 focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
              disabled={isLoading || isInputDisabled}
            />
            <button
              type="submit"
              className="ml-3 p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!inputMessage.trim() || isLoading || isInputDisabled}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      <div className="w-1/2 bg-gray-50">
        <StreamingDisplay
          streamingData={streamingData}
          isStreaming={isStreaming}
          isLoading={isLoading}
        />
      </div>

      <div className="fixed bottom-0 right-0 p-4 z-50">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default ChatInterface;