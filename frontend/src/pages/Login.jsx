import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import AnaraLogo from '../components/AnaraLogo';

export default function Login() {
  const navigate = useNavigate();
  const { login, error, loading, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/');
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg,#f9fafb 0%,#eef2f7 100%)' }}>
      <div className="w-full max-w-[400px] bg-surface border border-gray-med rounded-xl shadow-md px-8 py-10 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <AnaraLogo height={48} />
          <div className="text-xl font-semibold text-gray-dark">Anara Quick Replies</div>
          <div className="text-sm text-secondary -mt-1">Masuk untuk mengakses dashboard CS</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@anara.com"
              className="h-10 px-3 border border-gray-med rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <div className="text-center text-sm text-secondary">
          Belum punya akun? <Link to="/signup" className="text-primary hover:underline" style={{ color: '#2563eb' }}>Daftar di sini</Link>
        </div>
      </div>
    </div>
  );
}
