import { CheckCircle2, XCircle } from 'lucide-react';
import useToastStore from '../store/toastStore';

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            t.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {t.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
