import { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client';
import useAutoRefresh from '../hooks/useAutoRefresh';
import useThemeStore from '../store/themeStore';
import Skeleton from '../components/Skeleton';

const PIE_COLORS = ['#2563eb', '#60a5fa', '#f59e0b', '#10b981', '#a78bfa', '#f87171'];

const RANGE_PRESETS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week', label: 'Minggu Ini' },
  { key: 'month', label: 'Bulan Ini' },
];

function getRange(preset) {
  const end = new Date();
  const start = new Date();
  if (preset === 'today') start.setHours(0, 0, 0, 0);
  else if (preset === 'week') start.setDate(end.getDate() - 7);
  else start.setMonth(end.getMonth() - 1);
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

const TABS = [
  { key: 'replies', label: 'Quick Replies' },
  { key: 'sales', label: 'Penjualan' },
];

export default function Analytics() {
  const [tab, setTab] = useState('sales');
  const theme = useThemeStore((s) => s.theme);
  const tickColor = theme === 'dark' ? '#f1f5f9' : '#111827';
  const [preset, setPreset] = useState('month');
  const [summary, setSummary] = useState({ totalReplies: 0, totalUsage: 0, activeUsers: 0 });
  const [topQuestions, setTopQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback((showLoading = true) => {
    const range = getRange(preset);
    if (showLoading) setLoading(true);
    return Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/top-questions', { params: { ...range, limit: 10 } }),
      api.get('/analytics/categories', { params: range }),
    ])
      .then(([s, t, c]) => {
        setSummary(s.data.data);
        setTopQuestions(t.data.data);
        setCategories(c.data.data);
      })
      .finally(() => setLoading(false));
  }, [preset]);

  useEffect(() => { fetchData(true); }, [fetchData]);
  useAutoRefresh(() => fetchData(false), 15000, [preset]);

  const maxUsage = Math.max(...topQuestions.map((q) => q.usage_count), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[28px] font-bold text-gray-dark">Analytics</div>
          <div className="text-sm text-secondary mt-1">
            {tab === 'sales' ? 'Dari mana lead datang, dan berapa yang jadi' : 'Insight penggunaan quick replies tim'}
          </div>
        </div>
        <div className={`flex gap-2 ${tab === 'sales' ? 'hidden' : ''}`}>
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`h-9 px-3.5 rounded-full text-[13px] font-semibold cursor-pointer ${preset === p.key ? 'btn-3d-sm btn-3d' : ''}`}
              style={preset === p.key ? { background: '#2563eb', color: '#fff' } : { background: 'var(--color-surface)', color: 'var(--color-gray-dark)', border: '1px solid var(--color-gray-med)' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-surface rounded-xl p-1.5 w-fit border border-gray-med">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer ${tab === t.key ? 'btn-3d-sm btn-3d' : ''}`}
            style={tab === t.key
              ? { background: '#2563eb', color: '#fff' }
              : { background: 'transparent', color: 'var(--color-secondary)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sales' && <SalesTab tickColor={tickColor} />}

      {tab === 'replies' && (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total Replies" value={summary.totalReplies} loading={loading} />
        <MetricCard label="Total Usage" value={`${summary.totalUsage}x`} loading={loading} />
        <MetricCard label="Active Users" value={summary.activeUsers} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-surface rounded-xl p-6 flex flex-col gap-4">
          <div className="text-base font-semibold text-gray-dark">Top 10 Pertanyaan</div>
          {loading ? (
            <Skeleton className="w-full" style={{ height: 200 }} />
          ) : topQuestions.length === 0 ? (
            <div className="text-sm text-secondary">Belum ada data pada periode ini.</div>
          ) : (
            <div className="w-full" style={{ height: Math.max(topQuestions.length * 40, 200) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topQuestions} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" hide domain={[0, maxUsage]} />
                  <YAxis
                    type="category"
                    dataKey="question"
                    width={180}
                    tick={{ fontSize: 12, fill: tickColor }}
                    tickFormatter={(v) => (v.length > 26 ? v.slice(0, 26) + '…' : v)}
                  />
                  <Tooltip />
                  <Bar dataKey="usage_count" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl p-6 flex flex-col gap-4">
          <div className="text-base font-semibold text-gray-dark">Distribusi Kategori</div>
          {loading ? (
            <Skeleton className="w-full" style={{ height: 180 }} />
          ) : categories.length === 0 ? (
            <div className="text-sm text-secondary">Belum ada data pada periode ini.</div>
          ) : (
            <>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="totalUsage" nameKey="category" innerRadius={0} outerRadius={80}>
                      {categories.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {categories.map((c, i) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[13px] text-gray-dark flex-1">{c.category}</span>
                    <span className="text-[13px] text-secondary">{c.percentOfTotal}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-xl overflow-hidden">
        <div className="px-6 pt-5 text-base font-semibold text-gray-dark">Category Breakdown</div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Category', 'Replies', 'Total Usage', '% of Total'].map((h) => (
                  <th key={h} className="text-xs font-semibold uppercase tracking-wide text-secondary text-left px-4 py-2.5 border-b border-gray-med">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category}>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-med">{c.category}</td>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-med">{c.replies}</td>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-med">{c.totalUsage}</td>
                  <td className="text-sm text-gray-dark px-4 py-3.5 border-b border-gray-med">{c.percentOfTotal}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function MetricCard({ label, value, loading }) {
  return (
    <div className="bg-surface rounded-xl p-6 flex flex-col gap-2 transition-shadow hover:shadow-lg">
      <div className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</div>
      {loading ? (
        <Skeleton className="h-8 w-24 my-1" />
      ) : (
        <div className="text-[32px] font-bold text-gray-dark">{value}</div>
      )}
    </div>
  );
}

/** Ringkasan penjualan: sumber lead, hasilnya, dan siapa yang mengerjakan. */
function SalesTab({ tickColor }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    return api.get('/analytics/sales')
      .then(({ data: res }) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSales(true); }, [fetchSales]);
  useAutoRefresh(() => fetchSales(false), 30000);

  const total = (data?.funnel || []).reduce((sum, f) => sum + f.count, 0);
  const won = (data?.funnel || []).find((f) => f.label === 'Sudah DP')?.count || 0;
  const lost = (data?.funnel || []).find((f) => f.label === 'Batal')?.count || 0;
  const selesai = won + lost;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Lead" value={total} loading={loading} />
        <MetricCard label="Closing" value={won} loading={loading} />
        <MetricCard
          label="Konversi"
          value={selesai > 0 ? `${Math.round((won / selesai) * 100)}%` : '—'}
          loading={loading}
        />
        <MetricCard
          label="Rata-rata sampai closing"
          value={data?.timeToWin?.avgDays != null ? `${data.timeToWin.avgDays} hari` : '—'}
          loading={loading}
        />
      </div>

      {!loading && selesai > 0 && (
        <div className="text-xs text-secondary -mt-3">
          Konversi dihitung dari {selesai} lead yang sudah selesai ({won} closing, {lost} batal).
          Lead yang masih berjalan tidak ikut, supaya angkanya tidak terlihat buruk hanya karena antrean panjang.
          {data?.timeToWin?.sample === 0 && ' Lama sampai closing baru mulai tercatat sejak fitur ini aktif.'}
          {data?.timeToWin?.sample > 0 && data.timeToWin.sample < 5 &&
            ` Rata-rata waktu masih dari ${data.timeToWin.sample} lead saja — belum bisa dijadikan patokan.`}
        </div>
      )}

      <SalesTable
        title="Per Paket"
        hint="Paket yang ramai ditanya tapi sedikit closing layak ditinjau ulang — harga, itinerary, atau cara menjelaskannya."
        rows={data?.byPackage}
        loading={loading}
        headLabel="Paket"
      />

      <SalesTable
        title="Per PIC Sales"
        hint="Bandingkan konversi, bukan jumlah lead — yang pegang lead terbanyak belum tentu yang paling banyak closing."
        rows={data?.byPic}
        loading={loading}
        headLabel="PIC"
      />

      <div className="bg-surface rounded-xl p-6 flex flex-col gap-4 border border-gray-med">
        <div className="text-base font-semibold text-gray-dark">Sebaran Status</div>
        {loading ? (
          <Skeleton className="w-full" style={{ height: 200 }} />
        ) : total === 0 ? (
          <div className="text-sm text-secondary">Belum ada lead.</div>
        ) : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.funnel} margin={{ left: -16, right: 8 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Lead" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function SalesTable({ title, hint, rows, loading, headLabel }) {
  return (
    <div className="bg-surface rounded-xl border border-gray-med overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-med">
        <div className="text-base font-semibold text-gray-dark">{title}</div>
        <div className="text-xs text-secondary mt-1 max-w-[620px]">{hint}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="bg-gray-light text-[11px] font-semibold uppercase tracking-wide text-secondary">
              <th className="text-left px-6 py-3">{headLabel}</th>
              <th className="text-right px-4 py-3">Lead</th>
              <th className="text-right px-4 py-3">Closing</th>
              <th className="text-right px-4 py-3">Batal</th>
              <th className="text-right px-4 py-3">Berjalan</th>
              <th className="text-right px-6 py-3">Konversi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-6 py-4"><Skeleton className="h-3.5" /></td></tr>
            )}
            {!loading && (rows || []).length === 0 && (
              <tr><td colSpan={6} className="text-center text-sm text-secondary py-10">Belum ada data.</td></tr>
            )}
            {!loading && (rows || []).map((r) => (
              <tr key={r.label} className="border-t border-gray-med">
                <td className="px-6 py-3 text-sm text-gray-dark">{r.label}</td>
                <td className="px-4 py-3 text-sm text-gray-dark text-right">{r.leads}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: '#16a34a' }}>{r.won}</td>
                <td className="px-4 py-3 text-sm text-secondary text-right">{r.lost}</td>
                <td className="px-4 py-3 text-sm text-secondary text-right">{r.open}</td>
                <td className="px-6 py-3 text-right">
                  {r.conversion === null ? (
                    // Belum ada satu pun lead yang selesai, jadi persentase apa
                    // pun akan menyesatkan.
                    <span className="text-xs text-secondary" title="Belum ada lead yang selesai">—</span>
                  ) : (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={r.conversion >= 50
                        ? { background: 'var(--color-success-soft)', color: 'var(--color-success-soft-text)' }
                        : { background: 'var(--color-neutral-soft)', color: 'var(--color-neutral-soft-text)' }}
                    >
                      {r.conversion}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
