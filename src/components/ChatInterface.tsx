import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface Product {
  product_name: string;
  description: string;
  link_to_product: string;
  price: string;
  image_url: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'interactive' | 'interactive_prod';
  buttons?: string[];
  products?: Product[];
  total_products?: number;
}

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

// const BASE_URL = "http://localhost:8003/chat";
const BASE_URL = "https://zwande-backend.ca.lyzr.app/chat";

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
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return Math.floor(Math.random() * 1000000000).toString();
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
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

      const data = await response.json();

      const agentMessage: Message = {
        id: Date.now().toString(),
        content: data.response || "I'm not sure how to respond to that.",
        sender: 'agent',
        timestamp: new Date(),
        type: data.type || 'text',
        buttons: data.buttons || [],
        products: data.products?.map((p: any) => ({
          product_name: p['product name'],
          description: p.description,
          link_to_product: p['Link to product'],
          image_url: p['Image URL'],
          price: p['price'],
        })) || [],
        total_products: data.metadata?.total_products || 0,
      };

      setMessages(prev => [...prev, agentMessage]);
      setIsInputDisabled(agentMessage.type === 'interactive' || agentMessage.type === 'interactive_prod');
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

      const data = await response.json();

      const agentMessage: Message = {
        id: Date.now().toString(),
        content: data.response || "I'm not sure how to respond to that.",
        sender: 'agent',
        timestamp: new Date(),
        type: data.type || 'text',
        buttons: data.buttons || [],
        products: data.products?.map((p: any) => ({
          product_name: p['product name'],
          description: p.description,
          link_to_product: p['Link to product'],
          image_url: p['Image URL'],
          price: p['price'],
        })) || [],
        total_products: data.metadata?.total_products || 0,
      };

      setMessages(prev => [...prev, agentMessage]);
      setIsInputDisabled(agentMessage.type === 'interactive' || agentMessage.type === 'interactive_prod');
    } catch (error) {
      console.error('Error sending button response:', error);
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
    setIsInputDisabled(false);
    addToast({
      title: "Session Refreshed",
      description: `New session started with ID: ${newSessionId}`,
    });
  };

  return (
    <div className="relative flex flex-col h-[600px] w-full max-w-3xl mx-auto rounded-lg shadow-lg bg-white">
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
                <>
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a
                          {...props}
                          className="text-purple-600 underline hover:text-blue-800 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      ),
                      p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                      li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {message.type === 'interactive' && message.buttons && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.buttons.map((button, index) => (
                        <button
                          key={index}
                          onClick={() => handleButtonClick(button)}
                          className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                        >
                          {button}
                        </button>
                      ))}
                    </div>
                  )}
                  {message.type === 'interactive_prod' && message.products && (
                    <div className="mt-2 grid grid-cols-1 gap-4">
                      {message.products.map((product, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row items-start bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.product_name}
                              className="w-full sm:w-32 h-32 object-cover rounded-md mb-2 sm:mb-0 sm:mr-4"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {product.product_name}
                            </h3>
                            <ReactMarkdown
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                a: ({ node, ...props }) => (
                                  <a
                                    {...props}
                                    className="text-purple-600 underline hover:text-blue-800"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  />
                                ),
                                p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                              }}
                            >
                              {product.description}
                            </ReactMarkdown>
                            <p className="text-gray-600">Price: Rs.{product.price}</p>
                            <a
                              href={product.link_to_product}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
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

      <form onSubmit={handleSubmit} className="p-4 border-t flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask about products..."
          className="flex-1 py-2 px-4 outline-none bg-gray-100 rounded-full focus:ring-2 focus:ring-purple-300 transition-all"
          disabled={isLoading || isInputDisabled}
        />
        <button
          type="submit"
          className="ml-2 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!inputMessage.trim() || isLoading || isInputDisabled}
        >
          <Send size={18} />
        </button>
      </form>

      <div className="fixed bottom-0 right-0 p-4">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default ChatInterface;