export default function MessageBubble({ content }) {
  return (
    <div className="flex items-start gap-4 max-w-full">
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-black text-xs font-bold">GPT</span>
      </div>
      <div className="flex-1 text-gray-100 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}
