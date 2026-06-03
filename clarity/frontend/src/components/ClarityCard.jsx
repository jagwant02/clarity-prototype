import { useState } from 'react';

export default function ClarityCard({ data, rawResponse }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="flex items-start gap-4 max-w-full">
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-black text-xs font-bold">GPT</span>
      </div>
      
      <div className="flex-1 w-full max-w-[650px]">
        {/* Toggle between Clarity and Raw */}
        <div className="flex justify-end mb-2">
          <button 
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-gray-400 hover:text-white transition-colors underline"
          >
            {showRaw ? "Show Clarity Version" : "See original ChatGPT response"}
          </button>
        </div>

        {showRaw ? (
          <div className="text-gray-100 whitespace-pre-wrap leading-relaxed">
            {rawResponse}
          </div>
        ) : (
          <div className="bg-[#212121] rounded-2xl border border-[#333] overflow-hidden shadow-lg">
            
            {/* Clarity Badge Header */}
            <div className="px-4 py-2 bg-[#2f2f2f] border-b border-[#333] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                Processed by Clarity
              </span>
            </div>

            {/* Part 1: Recommendation (Now holds the entire output since UI tabs are removed) */}
            <div className="p-5 border-l-4 border-indigo-500">
              <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">
                {data.part1?.full_text || "No recommendation provided."}
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
