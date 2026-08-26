import { X, Copy } from 'lucide-react';

export default function ReplyDetailModal({ reply, onClose, onCopy }) {
  if (!reply) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-dark/50 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-[600px] max-h-[85vh] overflow-auto bg-surface rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-med">
          <div className="text-xl font-semibold text-gray-dark pr-4">{reply.question}</div>
          <button onClick={onClose} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-secondary hover:bg-gray-light cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="text-sm text-gray-dark leading-relaxed whitespace-pre-wrap">{reply.answer}</div>

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
            {reply.tags && (
              <span className="text-xs text-secondary">Tags: {reply.tags}</span>
            )}
          </div>
          <div className="text-xs text-secondary">📊 Digunakan {reply.usage_count}x</div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-med">
          <button
            onClick={onClose}
            className="h-10 px-5 bg-surface text-gray-dark border border-gray-med rounded-lg text-sm font-semibold cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={() => onCopy(reply)}
            className="h-10 px-5 text-white rounded-lg text-sm font-semibold cursor-pointer flex items-center gap-2"
            style={{ background: '#2563eb' }}
          >
            <Copy size={16} />
            Copy Answer
          </button>
        </div>
      </div>
    </div>
  );
}
