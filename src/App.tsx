import ChatInterface from './components/ChatInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Zwende Search Agent</h1>
        </div>
        
        <ChatInterface />
        
        <div className="mt-8 text-center text-sm text-gray-500">
        </div>
      </div>
    </div>
  );
};

export default Index;