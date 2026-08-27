export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirming }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-dark/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-[400px] bg-surface rounded-xl shadow-2xl p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold text-gray-dark">{title}</div>
        <div className="text-sm text-secondary">{message}</div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onCancel} className="h-9 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-sm font-semibold cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="h-9 px-4 text-white rounded-full btn-3d-danger text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: '#ef4444' }}
          >
            {confirming ? 'Menghapus...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
