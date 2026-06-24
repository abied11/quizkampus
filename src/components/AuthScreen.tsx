import React, { useState } from 'react';
import { dbRegisterUser } from '../dbService';
import type { User } from '../dbService';
import { UserCheck, UserPlus, GraduationCap, Users, LogIn } from 'lucide-react';
import { useAppContext } from '../AppContext';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const { users, refreshUsers, loading } = useAppContext();
  const [activeTab, setActiveTab] = useState<'quick' | 'register'>('quick');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'dosen' | 'mahasiswa'>('mahasiswa');
  const [className, setClassName] = useState('');
  const [error, setError] = useState('');

  const handleQuickLogin = (user: User) => {
    onLoginSuccess(user);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !className) {
      setError('Semua kolom wajib diisi.');
      return;
    }

    if (!email.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    try {
      const newUser = await dbRegisterUser(name, email, role, className);
      await refreshUsers();
      onLoginSuccess(newUser);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mendaftar.');
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
              onClick={() => { setActiveTab('quick'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                activeTab === 'quick'
                  ? 'bg-uir-green-medium text-white shadow-md shadow-uir-green-medium/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Masuk Cepat
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); }}
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

          {activeTab === 'quick' ? (
            <div className="space-y-4">
              <p className="text-slate-400 text-xs mb-3 text-center">
                Pilih salah satu akun demo di bawah untuk masuk secara instan:
              </p>
              
              <div className="space-y-3">
                {loading ? (
                  <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uir-green-medium"></div>
                    <span className="animate-pulse">Menghubungkan ke database Supabase...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    Tidak ada akun demo ditemukan. Silakan gunakan tab "Daftar Baru" untuk membuat akun pertama Anda.
                  </div>
                ) : (
                  users.map((user, idx) => (
                    <button
                      key={user.id}
                      onClick={() => handleQuickLogin(user)}
                      className="w-full text-left p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-uir-green-medium/50 hover:bg-slate-800/40 transition-all duration-200 flex items-center justify-between group hover-lift animate-slide-in-left"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl transition-all group-hover:scale-110 ${
                          user.role === 'dosen' 
                            ? 'bg-uir-yellow-gold/10 text-uir-yellow-gold border border-uir-yellow-gold/20 group-hover:bg-uir-yellow-gold/20' 
                            : 'bg-uir-green-medium/10 text-uir-green-muted border border-uir-green-medium/20 group-hover:bg-uir-green-medium/20'
                        }`}>
                          {user.role === 'dosen' ? <GraduationCap className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-100 group-hover:text-uir-yellow-accent transition-colors">
                            {user.name}
                          </h4>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {user.email} • {user.class}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                          user.role === 'dosen'
                            ? 'bg-uir-yellow-dark/40 text-uir-yellow-gold border border-uir-yellow-gold/20'
                            : 'bg-uir-green-dark/40 text-uir-green-muted border border-uir-green-medium/20'
                        }`}>
                          {user.role === 'dosen' ? 'Dosen' : 'Mhs'}
                        </span>
                        <LogIn className="h-4 w-4 text-slate-600 group-hover:text-uir-yellow-accent transition-colors" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
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

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-gradient-to-r from-uir-green-medium to-uir-green-dark hover:from-uir-green-bright hover:to-uir-green-medium text-white font-semibold rounded-xl shadow-lg shadow-uir-green-dark/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" />
                Daftar & Masuk
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
