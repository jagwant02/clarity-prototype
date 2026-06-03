import { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import MemoryPanel from './components/MemoryPanel';

export default function App() {
  const [userContext, setUserContext] = useState([]);
  const [showMemory, setShowMemory] = useState(false);

  return (
    <div className="flex h-screen bg-[#212121] text-white font-sans overflow-hidden">
      {/* Sidebar - ChatGPT Style */}
      <div className="w-[260px] bg-[#171717] flex-shrink-0 hidden md:flex flex-col">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#212121] rounded-lg cursor-pointer">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <span className="text-black text-xs font-bold">ChatGPT</span>
            </div>
          </div>
          <button className="p-2 hover:bg-[#212121] rounded-lg text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          </button>
        </div>
        <div className="p-3">
          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-[#212121] rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
            New chat
          </button>
        </div>
        
        {/* Memory Toggle */}
        <div className="mt-auto p-3 border-t border-[#333]">
          <button 
            onClick={() => setShowMemory(!showMemory)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-[#212121] rounded-lg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            {showMemory ? "Hide Context Memory" : "Show Context Memory"}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#212121]">
        {/* Header */}
        <div className="h-[60px] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-medium text-lg text-gray-200 cursor-pointer hover:bg-[#2f2f2f] px-3 py-1.5 rounded-xl">
            ChatGPT <span className="text-gray-400 text-sm">v</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden px-3 py-1.5 text-xs font-medium border border-[#333] text-gray-300 rounded-lg hover:bg-[#2f2f2f]"
              onClick={() => setShowMemory(!showMemory)}
            >
              {showMemory ? "Close" : "Memory"}
            </button>
            <button className="hidden sm:block px-4 py-2 text-sm font-medium bg-white text-black rounded-full hover:bg-gray-200">Log in</button>
            <button className="hidden sm:block px-4 py-2 text-sm font-medium bg-[#2f2f2f] text-white rounded-full hover:bg-[#3f3f3f]">Sign up</button>
          </div>
        </div>

        {/* Chat Interface */}
        <ChatInterface onContextUpdate={setUserContext} />
      </div>

      {/* Context Memory Panel (Clarity Feature) */}
      {showMemory && (
        <>
          {/* Mobile Overlay */}
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMemory(false)}
          ></div>
          
          <div className="absolute right-0 top-0 h-full z-50 md:relative w-[80vw] max-w-[300px] md:w-[300px] md:max-w-none border-l border-[#333] bg-[#171717] flex-shrink-0 flex flex-col shadow-2xl md:shadow-none">
            <MemoryPanel context={userContext} />
          </div>
        </>
      )}
    </div>
  );
}
