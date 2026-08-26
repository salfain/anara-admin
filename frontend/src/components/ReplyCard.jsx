import { Copy, Pencil, Trash2 } from 'lucide-react';

export default function ReplyCard({ reply, isAdmin, onCopy, onEdit, onDelete }) {
  return (
    <div className="bg-white border border-gray-med rounded-xl p-6 flex flex-col gap-3 transition-shadow hover:shadow-lg hover:-translate-y-0.5 duration-150">
      <div className="flex justify-between items-start gap-4">
        <div className="text-base font-semibold text-gray-dark">{reply.question}</div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onCopy(reply)}
            className="h-8 px-3.5 bg-primary text-white rounded-md text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
            style={{ background: '#2563eb' }}
          >
            <Copy size={14} />
            Copy
          </button>
          <button
            onClick={() => onEdit(reply)}
            className="w-8 h-8 bg-white text-secondary border border-gray-med rounded-md flex items-center justify-center cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(reply)}
              className="w-8 h-8 bg-white text-danger border border-gray-med rounded-md flex items-center justify-center cursor-pointer"
              style={{ color: '#ef4444' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed line-clamp-2">{reply.answer}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {reply.package_name && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#dbeafe', color: '#1e40af' }}>
            {reply.package_name}
          </span>
        )}
        {reply.category && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#ede9fe', color: '#6d28d9' }}>
            {reply.category}
          </span>
        )}
        <span className="text-xs text-secondary ml-1">📊 Digunakan {reply.usage_count}x</span>
      </div>
    </div>
  );
}
