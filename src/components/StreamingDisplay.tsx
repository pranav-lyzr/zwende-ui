import React, { useEffect, useRef } from 'react';

interface StreamingData {
  type: string;
  data: any;
  timestamp: Date;
}

interface StreamingDisplayProps {
  streamingData: StreamingData[];
  isStreaming: boolean;
  isLoading: boolean;
}

const LoadingDot = ({ delay = 0 }: { delay?: number }) => (
  <div 
    className="h-2 w-2 bg-purple-500 rounded-full animate-bounce"
    style={{ animationDelay: `${delay}s` }}
  />
);

const StreamingDisplay: React.FC<StreamingDisplayProps> = ({ 
  streamingData, 
  isStreaming,
  isLoading 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingData]);

  const formatData = (data: any) => {
    try {
      if (typeof data === 'string') return data;
      if (data === null) return 'null';
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }
      return String(data);
    } catch {
      return String(data);
    }
  };

  const parseProductInfo = (data: string) => {
    // Extract products from the product_info data string
    const lines = data.split('\n');
    const products = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for numbered product lines
      const match = line.match(/^\d+\.\s*(.*?)\s*\(\$(\d+(?:\.\d+)?)\)/);
      if (match) {
        const [, name, price] = match;
        products.push({
          name: name.trim(),
          price: price,
        });
      }
    }
    
    return products;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'intent': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'category': return 'bg-green-50 text-green-600 border-green-100';
      case 'subcategory': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'product_info': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'recommended_products': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'error': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'intent': return 'What the customer wants';
      case 'category': return 'Product category identified';
      case 'subcategory': return 'Specific preferences detected';
      case 'product_info': return 'Product search results';
      case 'recommended_products': return 'Curated recommendations';
      case 'error': return 'Issue occurred';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getUserFriendlyData = (type: string, data: any) => {
    switch (type) {
      case 'intent':
        return `Customer is looking for: ${data}`;
      case 'category':
        return `Product category: ${data}`;
      case 'subcategory':
        if (data && typeof data === 'object' && data.tags) {
          const tags = data.tags.map((tag: string) => {
            // Clean up tag format (remove prefixes like "colour:" etc.)
            return tag.includes(':') ? tag.split(':')[1] : tag;
          }).join(', ');
          return `Customer preferences: ${tags}`;
        }
        return formatData(data);
      case 'product_info':
        if (typeof data === 'string' && data.includes('Found') && data.includes('products')) {
          // Extract just the number and make it more readable
          const match = data.match(/Found (\d+)/);
          if (match) {
            return `${match[1]} matching products found in our catalog`;
          }
        }
        return formatData(data);
      default:
        return formatData(data);
    }
  };

  // Count only processing steps, excluding 'query' items
  const stepCount = streamingData.filter(item => item.type !== 'query').length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="pt-2 pl-4 border-b bg-white h-15 ">
        <h2 className="text-lg font-medium text-gray-900">Customer Journey Insights</h2>
        <p className="text-sm text-gray-500">Understanding customer needs in real-time</p>
      </div>

      {/* Streaming Data Content */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {!isLoading && streamingData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-10 4H4m0 0l4-4m-4 4l4 4" />
            </svg>
            <p className="text-base font-medium">Waiting for customer interaction...</p>
            <p className="text-sm mt-1">Customer insights will appear here once they start shopping</p>
          </div>
        ) : (
          <div className="space-y-3">
            {streamingData.map((item, index) => (
              item.type === 'query' ? (
                <div key={index} className="bg-blue-100 p-3 rounded-lg font-medium text-blue-800 mb-3 border-l-4 border-blue-500">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 20l1.98-5.126A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                    </svg>
                    Customer says: "{item.data}"
                  </div>
                </div>
              ) : (
                <div 
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-md"
                >
                  <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(item.type)}`}>
                        Step {index}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {getTypeDisplayName(item.type)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="p-3">
                    {item.type === 'error' ? (
                      <div className="bg-red-50 p-3 rounded border border-red-100">
                        <div className="text-red-600 text-sm font-medium">Something went wrong</div>
                        <div className="text-red-500 text-sm mt-1">{formatData(item.data)}</div>
                      </div>
                    ) : item.type === 'product_info' && typeof item.data === 'string' && item.data.includes('Found') ? (
                      <div className="space-y-3">
                        <div className="bg-purple-50 p-2 rounded border border-purple-100">
                          <p className="text-sm font-medium text-purple-800">{getUserFriendlyData(item.type, item.data)}</p>
                        </div>
                        
                        {(() => {
                          const products = parseProductInfo(item.data);
                          return products.length > 0 ? (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">All matching products:</h4>
                              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                                {products.map((product, productIndex) => (
                                  <div key={productIndex} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-2 border-gray-500 hover:shadow-sm transition-shadow">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm text-gray-800 flex-1 mr-2">
                                        {product.name}
                                      </span>
                                      <span className="text-purple-600 font-semibold text-sm whitespace-nowrap">
                                        Rs {product.price}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ) : item.type === 'recommended_products' && Array.isArray(item.data) && item.data.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-green-50 p-2 rounded border border-green-100">
                          <p className="text-sm font-medium text-green-800">✅ Found {item.data.length} perfect matches for the customer</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.data.map((product: any, productIndex: number) => (
                            <div key={productIndex} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border-gray-500 hover:shadow-md transition-shadow">
                              <div className="flex items-start space-x-3">
                                {product.Image_URL && (
                                  <div className="flex-shrink-0">
                                    <img 
                                      src={product.Image_URL} 
                                      alt={product.Title || 'Product'} 
                                      className="w-16 h-16 object-cover rounded-md border border-gray-200"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm text-gray-800 line-clamp-2 mb-1">
                                    {product.Title || 'Product Name'}
                                  </h4>
                                  <div className="text-purple-600 font-semibold text-sm mb-2">
                                    ₹{product.Variant_Price || 'N/A'}
                                  </div>
                                  {product.URL && (
                                    <a 
                                      href={product.URL} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                      View
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-100">
                        {getUserFriendlyData(item.type, item.data)}
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}

            {isStreaming && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 transition-all duration-300 ease-in-out">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <LoadingDot />
                    <LoadingDot delay={0.2} />
                    <LoadingDot delay={0.4} />
                  </div>
                  <span className="text-sm text-gray-600">Analyzing customer needs...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Footer */}
      {streamingData.length > 0 && (
        <div className="p-3 border-t bg-white">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Analysis steps: {stepCount}</span>
            <span className="flex items-center space-x-1">
              {isStreaming && (
                <>
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Processing...</span>
                </>
              )}
              {!isStreaming && <span>Complete</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingDisplay;
