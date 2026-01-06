
import * as React from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Minimize2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';

export const GeminiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      text: 'Hello! I am your AI Assistant. How can I help you manage EduSphere today?', 
      timestamp: new Date() 
    }
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await geminiService.chat(input, history);
      
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 group"
      >
        <MessageSquare className="w-6 h-6 group-hover:hidden" />
        <Bot className="w-6 h-6 hidden group-hover:block" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce"></span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-50 animate-scale-in">
      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">EduSphere AI</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-indigo-100">Online & Ready</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm ${
                m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-600 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                <span className={`text-[10px] block mt-1 ${m.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-gray-700 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-600 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
          />
          <button 
            disabled={isLoading || !input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};
