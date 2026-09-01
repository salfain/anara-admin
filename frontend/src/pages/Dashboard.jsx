import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import useAutoRefresh from '../hooks/useAutoRefresh';
import useThemeStore from '../store/themeStore';
import usePermissions from '../hooks/usePermissions';
import { badgeCounts } from '../utils/followUpBadge';
import Skeleton from '../components/Skeleton';

const STATUS_COLORS = {
  Baru: '#2563eb',
  Proses: '#eab308',
  Nego: '#f97316',
  'Sudah DP': '#22c55e',
  Batal: '#ef4444',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function fmtTanggalPendek(v) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function shortMonthLabel(key) {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { can } = usePermissions();
  const theme = useThemeStore((s) => s.theme);
  const tickColor = theme === 'dark' ? '#f1f5f9' : '#111827';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leadsSummary, setLeadsSummary] = useState(null);
  const [departures, setDepartures] = useState([]);
  const fuBadge = badgeCounts(leadsSummary?.followUp || {});

  const fetchStats = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    return api.get('/quick-replies/stats')
      .then(({ data }) => setStats(data.data))
      .finally(() => setLoading(false));
  }, []);

  const fetchLeadsSummary = useCallback(() => {
    return api.get('/leads/summary')
      .then(({ data }) => setLeadsSummary(data.data))
      .catch(() => {});
  }, []);

  // Keberangkatan terdekat butuh hak lihat paket; tanpa itu kartunya
  // disembunyikan, bukan menampilkan error.
  const bolehLihatPaket = can('packages.view');
  useEffect(() => {
    if (!bolehLihatPaket) return;
    api.get('/departures', { params: { upcoming: '1' } })
      .then(({ data }) => setDepartures(data.data.slice(0, 5)))
      .catch(() => {});
  }, [bolehLihatPaket]);

  useEffect(() => { fetchStats(true); fetchLeadsSummary(); }, [fetchStats, fetchLeadsSummary]);
  useAutoRefresh(() => fetchStats(false), 15000);
  useAutoRefresh(() => fetchLeadsSummary(), 15000);

  const monthlyChart = (leadsSummary?.monthly || []).map((m) => ({ ...m, label: shortMonthLabel(m.month) }));
  const totalLeads = (leadsSummary?.byStatus || []).reduce((sum, s) => sum + s.count, 0);

  const closing = (leadsSummary?.byStatus || []).find((s) => s.status === 'Sudah DP')?.count || 0;
  const berikutnya = departures[0];

  // Angka yang dipakai mengambil keputusan didahulukan; statistik quick replies
  // turun ke bawah — itu alat bantu, bukan kabar yang ditunggu tiap pagi.
  const metrics = leadsSummary
    ? [
        { label: 'Total Lead', value: totalLeads },
        {
          label: fuBadge.personal ? 'Perlu Follow-Up (kamu)' : 'Perlu Follow-Up',
          value: fuBadge.due,
          warna: fuBadge.overdue > 0 ? '#ef4444' : fuBadge.due > 0 ? '#f59e0b' : undefined,
        },
        { label: 'Total Closing', value: closing },
        {
          label: 'Keberangkatan Terdekat',
          value: berikutnya ? fmtTanggalPendek(berikutnya.departDate) : '-',
        },
      ]
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <div className="text-[28px] font-bold text-gray-dark">Selamat datang kembali, {user?.name?.split(' ')[0]} 👋</div>
        <div className="text-sm text-secondary mt-1">Ringkasan lead, follow-up, dan keberangkatan terdekat.</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-gray-med rounded-xl p-6 flex flex-col gap-1.5">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
        {!loading && metrics.map((m) => (
          <div key={m.label} className="bg-surface border border-gray-med rounded-xl p-6 flex flex-col gap-1.5 transition-shadow hover:shadow-lg">
            <div className="text-2xl font-bold" style={{ color: m.warna || '#2563eb' }}>{m.value}</div>
            <div className="text-[13px] text-secondary">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link
          to="/quick-replies"
          className="h-10 px-4 text-white rounded-full btn-3d text-[13px] font-semibold flex items-center cursor-pointer"
          style={{ background: '#2563eb' }}
        >
          Buka Quick Replies
        </Link>
        {can('analytics.view') && (
          <Link
            to="/analytics"
            className="h-10 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-[13px] font-semibold flex items-center cursor-pointer"
          >
            Lihat Analytics
          </Link>
        )}
        {fuBadge.due > 0 && (
          <Link
            to={`/leads?fu=due${fuBadge.personal ? '&mine=1' : ''}`}
            className="h-10 px-4 rounded-full btn-3d text-[13px] font-semibold flex items-center gap-2 cursor-pointer text-white"
            style={{ background: fuBadge.overdue > 0 ? '#ef4444' : '#f59e0b' }}
          >
            {fuBadge.due} lead{fuBadge.personal ? ' milikmu' : ''} perlu di-follow-up
            {fuBadge.overdue > 0 && ` (${fuBadge.overdue} terlambat)`}
          </Link>
        )}
        <Link
          to="/leads"
          className="h-10 px-4 bg-surface text-gray-dark border border-gray-med rounded-full btn-3d-secondary text-[13px] font-semibold flex items-center cursor-pointer"
        >
          Lihat Laporan Follow Up
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-surface border border-gray-med rounded-xl p-6 flex flex-col gap-4">
          <div>
            <div className="text-base font-semibold text-gray-dark">Lead Masuk per Bulan</div>
            <div className="text-xs text-secondary mt-0.5">6 bulan terakhir · Laporan Follow Up</div>
          </div>
          {!leadsSummary ? (
            <Skeleton className="w-full" style={{ height: 220 }} />
          ) : monthlyChart.every((m) => m.count === 0) ? (
            <div className="text-sm text-secondary">Belum ada data lead.</div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChart} margin={{ left: -16, right: 8 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Lead" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-surface border border-gray-med rounded-xl p-6 flex flex-col gap-4">
          <div className="text-base font-semibold text-gray-dark">Status Lead</div>
          {!leadsSummary ? (
            <Skeleton className="w-full" style={{ height: 160 }} />
          ) : totalLeads === 0 ? (
            <div className="text-sm text-secondary">Belum ada data lead.</div>
          ) : (
            <>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leadsSummary.byStatus} dataKey="count" nameKey="status" innerRadius={0} outerRadius={72}>
                      {leadsSummary.byStatus.map((s) => (
                        <Cell key={s.status} fill={STATUS_COLORS[s.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {leadsSummary.byStatus.map((s) => (
                  <div key={s.status} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: STATUS_COLORS[s.status] || '#94a3b8' }} />
                    <span className="text-[13px] text-gray-dark flex-1">{s.status}</span>
                    <span className="text-[13px] text-secondary">{s.count} ({totalLeads ? Math.round((s.count / totalLeads) * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {bolehLihatPaket && departures.length > 0 && (
        <div className="bg-surface border border-gray-med rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-med">
            <div className="text-base font-semibold text-gray-dark">Keberangkatan Terdekat</div>
            <Link to="/packages" className="text-[13px] font-semibold" style={{ color: '#2563eb' }}>Lihat jadwal</Link>
          </div>
          {departures.map((d, i) => (
            <div
              key={d.id}
              className={`px-6 py-3 flex items-center justify-between gap-3 ${i > 0 ? 'border-t border-gray-med' : ''}`}
            >
              <div className="min-w-0">
                <div className="text-sm text-gray-dark truncate">{d.packageName}</div>
                <div className="text-xs text-secondary">
                  {fmtTanggalPendek(d.departDate)}
                  {d.returnDate && ` - ${fmtTanggalPendek(d.returnDate)}`}
                </div>
              </div>
              {/* Sisa seat dihitung dari jumlah peserta di Penagihan. */}
              <div className="text-right shrink-0">
                <div
                  className="text-sm font-semibold"
                  style={{ color: d.seatsLeft <= 0 ? '#ef4444' : d.seatsLeft <= 5 ? '#f59e0b' : 'var(--color-gray-dark)' }}
                >
                  {d.seatsLeft} sisa
                </div>
                <div className="text-[11px] text-secondary">{d.booked}/{d.capacity} terisi</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface border border-gray-med rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-med">
          <div className="text-base font-semibold text-gray-dark">Balasan Paling Sering Digunakan</div>
          <Link to="/quick-replies" className="text-[13px] font-semibold" style={{ color: '#2563eb' }}>Lihat semua</Link>
        </div>
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`px-6 py-3.5 flex items-center gap-3 ${i > 0 ? 'border-t border-gray-med' : ''}`}>
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3.5 w-10 shrink-0" />
            </div>
          ))}
        {!loading && (stats?.topReplies || []).length === 0 && (
          <div className="text-center text-sm text-secondary py-10">Belum ada balasan.</div>
        )}
        {!loading && (stats?.topReplies || []).map((r, i) => (
          <div key={r.id} className={`px-6 py-3.5 flex items-center justify-between gap-3 ${i > 0 ? 'border-t border-gray-med' : ''}`}>
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
