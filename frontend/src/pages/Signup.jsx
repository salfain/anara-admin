import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, error, loading, user } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await signup(form.email, form.password, form.name);
    if (ok) navigate('/');
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg,#f9fafb 0%,#eef2f7 100%)' }}>
      <div className="w-full max-w-[400px] bg-white border border-gray-med rounded-xl shadow-md px-8 py-10 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-[10px] flex items-center justify-center" style={{ background: '#2563eb' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L14.5 8.5 L21 9.3 L16 13.9 L17.4 20.4 L12 17 L6.6 20.4 L8 13.9 L3 9.3 L9.5 8.5 Z" />
            </svg>
          </div>
          <div className="text-xl font-semibold text-gray-dark">Buat Akun</div>
          <div className="text-sm text-secondary">Daftar untuk mulai pakai Anara Quick Replies</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Nama Lengkap</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama kamu"
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nama@anara.com"
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimal 8 karakter"
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="h-10 text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: '#2563eb' }}
          >
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <div className="text-center text-sm text-secondary">
          Sudah punya akun? <Link to="/login" className="text-primary hover:underline" style={{ color: '#2563eb' }}>Login di sini</Link>
        </div>
      </div>
    </div>
  );
}
