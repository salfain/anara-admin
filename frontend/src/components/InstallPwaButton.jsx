import { Download } from 'lucide-react';
import usePwaInstall from '../hooks/usePwaInstall';

export default function InstallPwaButton({ className }) {
  const { canInstall, promptInstall } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <button
      onClick={promptInstall}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-left ${className || ''}`}
      style={{ color: '#2563eb' }}
    >
      <Download size={18} />
      Install App
    </button>
  );
}
