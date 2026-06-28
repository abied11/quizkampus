import { useState, Component } from 'react';
import type { ReactNode } from 'react';
import { initDB, dbGetCurrentUser, dbSetCurrentUser } from './dbService';
import type { User } from './dbService';
import { AuthScreen } from './components/AuthScreen';
import { DosenDashboard } from './components/DosenDashboard';
import { MahasiswaDashboard } from './components/MahasiswaDashboard';
import { AppProvider } from './AppContext';
import { useAppContext } from './hooks/useAppContext';

// ─── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      const isMissingEnv = err.message?.includes('Supabase environment');
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-white">
              {isMissingEnv ? 'Konfigurasi Database Belum Diset' : 'Terjadi Kesalahan'}
            </h1>
            {isMissingEnv ? (
              <div className="text-sm text-slate-400 space-y-3 text-left">
                <p>Variabel environment Supabase belum dikonfigurasi di Vercel.</p>
                <p className="font-semibold text-slate-300">Langkah perbaikan:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Buka <span className="text-blue-400">vercel.com/dashboard</span></li>
                  <li>Pilih project <strong className="text-white">uirquiz</strong></li>
                  <li>Klik <strong className="text-white">Settings → Environment Variables</strong></li>
                  <li>Tambahkan <code className="text-green-400 bg-slate-800 px-1 rounded">VITE_SUPABASE_URL</code></li>
                  <li>Tambahkan <code className="text-green-400 bg-slate-800 px-1 rounded">VITE_SUPABASE_ANON_KEY</code></li>
                  <li>Redeploy project</li>
                </ol>
              </div>
            ) : (
              <p className="text-sm text-slate-400">{err.message}</p>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Env check before Supabase init ──────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseKey) {
  initDB();
}

function AppContent() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are missing');
  }

  const [user, setUser] = useState<User | null>(() => dbGetCurrentUser());
  const { refreshAll } = useAppContext();

  const handleLogin = (loggedInUser: User) => {
    dbSetCurrentUser(loggedInUser);
    setUser(loggedInUser);
    refreshAll();
  };

  const handleLogout = () => {
    dbSetCurrentUser(null);
    setUser(null);
    refreshAll();
  };

  const handleUserUpdated = (updated: User) => {
    dbSetCurrentUser(updated);
    setUser(updated);
    refreshAll();
  };

  if (!user) return <AuthScreen onLoginSuccess={handleLogin} />;
  if (user.role === 'dosen') {
    return <DosenDashboard user={user} onLogout={handleLogout} onUserUpdated={handleUserUpdated} />;
  }
  return <MahasiswaDashboard user={user} onLogout={handleLogout} onUserUpdated={handleUserUpdated} />;
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
