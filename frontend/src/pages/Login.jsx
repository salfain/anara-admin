import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import AnaraLogo from '../components/AnaraLogo';

export default function Login() {
  const navigate = useNavigate();
  const { login, error, loading, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/');
  }

  return (
    <div className="min-h-screen w-full flex" style={{ background: '#0b1220' }}>
      {/* Branding panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #1d4ed8 0%, #2563eb 45%, #1e40af 100%)' }}
      >
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[28rem] h-[28rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }}
        />

        <div className="relative">
          <AnaraLogo height={40} />
        </div>

        <div className="relative flex flex-col gap-4 max-w-md">
          <div className="text-[13px] font-semibold uppercase tracking-widest text-blue-200">Customer Service Hub</div>
          <div className="text-[34px] font-bold text-white leading-tight">
            Jawab pertanyaan customer dalam hitungan detik.
          </div>
          <div className="text-[15px] text-blue-100 leading-relaxed">
            Satu tempat untuk semua template balasan, itinerary paket, dan script follow-up tim CS Anara.
          </div>
        </div>

        <div className="relative flex items-center gap-6 text-blue-100 text-[13px]">
          <div>© {new Date().getFullYear()} Anara Explore</div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10" style={{ background: 'var(--color-gray-light)' }}>
        <div className="w-full max-w-[400px] flex flex-col gap-8">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <AnaraLogo height={44} />
          </div>

          <div className="flex flex-col gap-1.5 text-center lg:text-left">
            <div className="text-2xl font-bold text-gray-dark">Selamat datang kembali</div>
            <div className="text-sm text-secondary">Masuk untuk mengelola lead, paket, dan penagihan</div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Email</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@anara.com"
                  className="w-full h-12 pl-11 pr-4 border border-gray-med rounded-xl text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-dark">Password</label>
                <a href="#" className="text-xs font-medium" style={{ color: '#2563eb' }}>Lupa password?</a>
              </div>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-11 border border-gray-med rounded-xl text-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 text-white rounded-full btn-3d text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ background: '#2563eb' }}
            >
              {loading ? 'Memproses...' : 'Login'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="text-center text-sm text-secondary">
            Belum punya akun?{' '}
            <Link to="/signup" className="font-semibold" style={{ color: '#2563eb' }}>Daftar di sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
