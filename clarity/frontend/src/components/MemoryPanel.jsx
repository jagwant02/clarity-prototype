export default function MemoryPanel({ context }) {
  return (
    <div className="flex flex-col h-full bg-[#171717] text-white">
      <div className="p-4 border-b border-[#333] flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Context Memory</h2>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs text-gray-500 mb-4">
          Clarity builds this memory over your session to provide personalized answers.
        </p>

        {context && context.length > 0 ? (
          <ul className="space-y-3">
            {context.map((fact, index) => (
              <li key={index} className="bg-[#212121] p-3 rounded-lg border border-[#333] text-sm text-gray-200">
                {fact}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p className="text-sm">No context extracted yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
