import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/quick-replies/stats')
      .then(({ data }) => setStats(data.data))
      .finally(() => setLoading(false));
  }, []);

  const metrics = stats
    ? [
        { label: 'Total Balasan', value: stats.totalReplies },
        { label: 'Total Pemakaian', value: stats.totalUsage },
        { label: 'Kategori Teraktif', value: stats.topCategory },
        { label: 'Anggota Tim', value: stats.totalUsers },
      ]
    : [];

  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Selamat datang kembali, {user?.name?.split(' ')[0]} 👋</div>
        <div className="text-sm text-secondary mt-1">Berikut ringkasan aktivitas quick replies tim CS.</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-med rounded-xl p-6 h-[92px] animate-pulse" />
        ))}
        {!loading && metrics.map((m) => (
          <div key={m.label} className="bg-white border border-gray-med rounded-xl p-6 flex flex-col gap-1.5 transition-shadow hover:shadow-lg">
            <div className="text-2xl font-bold" style={{ color: '#2563eb' }}>{m.value}</div>
            <div className="text-[13px] text-secondary">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link
          to="/quick-replies"
          className="h-10 px-4 text-white rounded-lg text-[13px] font-semibold flex items-center cursor-pointer"
          style={{ background: '#2563eb' }}
        >
          Buka Quick Replies
        </Link>
        {user?.role === 'admin' && (
          <Link
            to="/analytics"
            className="h-10 px-4 bg-white text-gray-dark border border-gray-med rounded-lg text-[13px] font-semibold flex items-center cursor-pointer"
          >
            Lihat Analytics
          </Link>
        )}
      </div>

      <div className="bg-white border border-gray-med rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-med">
          <div className="text-base font-semibold text-gray-dark">Balasan Paling Sering Digunakan</div>
          <Link to="/quick-replies" className="text-[13px] font-semibold" style={{ color: '#2563eb' }}>Lihat semua</Link>
        </div>
        {loading && <div className="text-center text-sm text-secondary py-10">Memuat...</div>}
        {!loading && (stats?.topReplies || []).length === 0 && (
          <div className="text-center text-sm text-secondary py-10">Belum ada balasan.</div>
        )}
        {!loading && (stats?.topReplies || []).map((r, i) => (
          <div key={r.id} className={`px-6 py-3.5 flex items-center justify-between gap-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-dark truncate">{r.question}</div>
              <div className="flex gap-1.5 items-center mt-1">
                {r.category && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#6d28d9' }}>{r.category}</span>
                )}
                {r.package_name && <span className="text-xs text-secondary">{r.package_name}</span>}
              </div>
            </div>
            <div className="text-xs font-semibold text-secondary shrink-0">{r.usage_count}x</div>
          </div>
        ))}
      </div>
    </div>
  );
}
