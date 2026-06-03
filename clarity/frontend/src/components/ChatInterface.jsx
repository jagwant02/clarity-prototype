import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ClarityCard from './ClarityCard';
import ThinkingIndicator from './ThinkingIndicator';

export default function ChatInterface({ onContextUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message immediately
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";
      const response = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, session_id: sessionId })
      });

      const data = await response.json();
      
      if (data.content.part1?.user_context) {
        onContextUpdate(data.content.part1.user_context);
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        isClarity: data.clarity_activated,
        clarityData: data.clarity_activated ? data.content : null,
        rawResponse: data.raw_response || "",
        content: data.response_type === "plain" ? data.content.text : ""
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please ensure the backend is running." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Scrollable Message Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <h1 className="text-3xl font-semibold text-white mb-8">Where should we begin?</h1>
            
            {/* Suggestion Chips (as in screenshot) */}
            <div className="flex flex-col gap-2 w-full max-w-[600px] mt-4 px-4">
              <div className="p-3 border border-[#333] rounded-xl hover:bg-[#2f2f2f] cursor-pointer text-sm text-gray-300 flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Write polite group message
              </div>
              <div className="p-3 border border-[#333] rounded-xl hover:bg-[#2f2f2f] cursor-pointer text-sm text-gray-300 flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                Help me prep for interview
              </div>
              <div className="p-3 border border-[#333] rounded-xl hover:bg-[#2f2f2f] cursor-pointer text-sm text-gray-300 flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                Help me prepare for my exams
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto w-full py-8 space-y-6">
            {messages.map((msg, index) => (
              <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-[#2f2f2f] px-5 py-3 rounded-2xl max-w-[80%] text-gray-100">
                    {msg.content}
                  </div>
                ) : msg.isClarity && msg.clarityData ? (
                  <ClarityCard data={msg.clarityData} rawResponse={msg.rawResponse} />
                ) : (
                  <MessageBubble content={msg.content || msg.rawResponse} />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start">
                <ThinkingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="w-full max-w-[800px] mx-auto p-4 md:px-0">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center bg-[#2f2f2f] rounded-[24px] border border-[#444] px-4 py-3 focus-within:border-gray-500 shadow-sm transition-colors">
            <button type="button" className="text-gray-400 hover:text-white mr-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything"
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 text-base"
              disabled={isLoading}
            />
            {input.trim() ? (
              <button 
                type="submit" 
                disabled={isLoading}
                className="ml-3 bg-white text-black w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            ) : (
              <div className="flex items-center gap-3 ml-3 text-gray-400">
                <button type="button" className="hover:text-white transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                </button>
                <button type="button" className="hover:text-white transition-colors flex items-center gap-1 border border-[#444] px-2 py-1 rounded-full text-xs font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path></svg>
                  Voice
                </button>
              </div>
            )}
          </div>
          <div className="text-center mt-2">
            <span className="text-xs text-gray-500">By messaging ChatGPT, an AI chatbot, you agree to our Terms and have read our Privacy Policy.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
