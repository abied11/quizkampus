import React, { useState } from 'react';
import { dbRegisterUser, dbLoginUser } from '../dbService';
import { UserPlus, GraduationCap, Users, LogIn, Lock } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: import('../dbService').User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'dosen' | 'mahasiswa'>('mahasiswa');
  const [className, setClassName] = useState('');
  const [dosenCode, setDosenCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await dbLoginUser(email, password);
      onLoginSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password || !confirmPassword || !className) {
      setError('Semua kolom wajib diisi.');
      return;
    }

    if (!email.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    if (role === 'dosen' && dosenCode !== 'DOSEN-UIR-2026') {
      setError('Kode Registrasi Dosen tidak valid.');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      await dbRegisterUser(name, email, password, role, className);
      setName('');
      setPassword('');
      setConfirmPassword('');
      setClassName('');
      setDosenCode('');
      setRole('mahasiswa');
      setActiveTab('login');
      setSuccess('Pendaftaran berhasil! Silakan masuk dengan email dan password Anda.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mendaftar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="auth-orb animate-orb-1 w-[500px] h-[500px] top-[-100px] left-[-150px] opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(6,93,62,0.6), transparent 70%)' }} />
      <div className="auth-orb animate-orb-2 w-[400px] h-[400px] bottom-[-80px] right-[-100px] opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(255,177,2,0.7), transparent 70%)' }} />
      <div className="auth-orb animate-orb-1 w-[300px] h-[300px] top-[40%] right-[20%] opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(22,138,38,0.5), transparent 70%)', animationDelay: '-5s' }} />
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      <div className="w-full max-w-md z-10 animate-card-reveal">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-uir-green-dark to-uir-green-medium shadow-2xl shadow-uir-green-dark/40 mb-4 animate-float">
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-uir-yellow-gold via-uir-green-muted to-uir-yellow-accent mb-1">
            Web Quiz Kampus
          </h1>
          <p className="text-slate-400 text-sm">
            Platform Pelaksanaan Ujian &amp; Kuis Online Mandiri
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-premium rounded-3xl p-6 shadow-2xl relative animate-border-glow">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-950/80 rounded-2xl mb-6 border border-slate-900">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-uir-green-medium text-white shadow-md shadow-uir-green-medium/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                activeTab === 'register'
                  ? 'bg-uir-green-medium text-white shadow-md shadow-uir-green-medium/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Daftar Baru
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-uir-green-dark/40 border border-uir-green-medium/30 rounded-xl text-uir-green-muted text-xs">
              {success}
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-slate-400 text-xs mb-1 text-center">
                Masuk dengan email dan password akun Anda
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Contoh: budi@student.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 bg-gradient-to-r from-uir-green-medium to-uir-green-dark hover:from-uir-green-bright hover:to-uir-green-medium disabled:opacity-60 text-white font-semibold rounded-xl shadow-lg shadow-uir-green-dark/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" />
                {submitting ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Pratama"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Contoh: budi@student.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Peran (Role)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('mahasiswa')}
                    className={`py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      role === 'mahasiswa'
                        ? 'bg-uir-green-medium/10 border-uir-green-medium text-uir-green-muted'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    Mahasiswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('dosen')}
                    className={`py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      role === 'dosen'
                        ? 'bg-uir-yellow-gold/10 border-uir-yellow-gold text-uir-yellow-gold'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    Dosen
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  {role === 'dosen' ? 'Mata Kuliah / Bidang' : 'Kelas / Angkatan'}
                </label>
                <input
                  type="text"
                  placeholder={role === 'dosen' ? 'Contoh: Informatika' : 'Contoh: IF-2024-A'}
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>

              {role === 'dosen' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Kode Registrasi Dosen
                  </label>
                  <input
                    type="password"
                    placeholder="Masukkan kode rahasia dosen"
                    value={dosenCode}
                    onChange={(e) => setDosenCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm border-uir-yellow-gold/30 focus:border-uir-yellow-gold/70"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    *Hubungi administrator untuk mendapatkan kode dosen.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 bg-gradient-to-r from-uir-green-medium to-uir-green-dark hover:from-uir-green-bright hover:to-uir-green-medium disabled:opacity-60 text-white font-semibold rounded-xl shadow-lg shadow-uir-green-dark/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Lock className="h-4 w-4" />
                {submitting ? 'Memproses...' : 'Daftar Akun'}
              </button>

              <p className="text-slate-500 text-xs text-center">
                Setelah daftar, Anda akan diarahkan ke halaman masuk
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
