export default function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-4 max-w-full">
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-black text-xs font-bold">GPT</span>
      </div>
      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span>Clarity is analyzing context...</span>
      </div>
    </div>
  );
}
