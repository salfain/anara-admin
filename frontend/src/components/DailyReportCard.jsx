import { useCallback, useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { copyText } from '../utils/clipboard';
import Skeleton from './Skeleton';
import { susunLaporan } from '../utils/dailyReport';

export default function DailyReportCard() {
  const push = useToastStore((s) => s.push);
  const currentUser = useAuthStore((s) => s.user);

  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Belum ada datanya di aplikasi, jadi diketik sendiri.
  const [janjiTf, setJanjiTf] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/users/simple')
      .then(({ data: res }) => setUsers(res.data))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(() => {
    setLoading(true);
    return api.get('/leads/daily-report', { params: { date: tanggal, ...(userId ? { userId } : {}) } })
      .then(({ data: res }) => setData(res.data))
      .catch(() => push('Gagal memuat laporan harian', 'error'))
      .finally(() => setLoading(false));
  }, [tanggal, userId, push]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  async function salin() {
    if (!data) return;
    if (!(await copyText(susunLaporan({ data, janjiTf })))) {
      return push('Gagal menyalin', 'error');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const input =
    'h-9 px-3 border border-gray-med rounded-lg text-sm bg-surface text-gray-dark focus:outline-none focus:border-primary';

  return (
    <div className="bg-surface border border-gray-med rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-med">
        <div className="text-base font-semibold text-gray-dark">Laporan Harian</div>
        <div className="text-xs text-secondary mt-1">
          Angkanya dihitung dari data lead. Salin lalu kirim ke grup seperti biasa.
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={input} />
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className={`${input} flex-1 min-w-[150px]`}
          >
            <option value="">{currentUser?.name || 'Saya'}</option>
            {users
              .filter((u) => u.id !== currentUser?.id)
              .map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
          </select>
          <label className="flex items-center gap-2">
            <span className="text-xs text-secondary whitespace-nowrap">Janji TF</span>
            <input
              value={janjiTf}
              onChange={(e) => setJanjiTf(e.target.value)}
              placeholder="—"
              className={`${input} w-[70px]`}
            />
          </label>
        </div>

        {loading || !data ? (
          <Skeleton className="w-full" style={{ height: 200 }} />
        ) : (
          <pre className="text-xs text-gray-dark whitespace-pre-wrap font-sans leading-relaxed bg-gray-light border border-gray-med rounded-lg px-3.5 py-3 max-h-[280px] overflow-y-auto">
            {susunLaporan({ data, janjiTf })}
          </pre>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={salin}
            disabled={!data}
            className="h-9 px-4 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            style={{ background: copied ? '#16a34a' : '#2563eb' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Disalin' : 'Salin Laporan'}
          </button>
          <span className="text-[11px] text-secondary">
            Janji TF belum tercatat di aplikasi, jadi diisi sendiri.
          </span>
        </div>
      </div>
    </div>
  );
}
