import { useState } from 'react';
import { initDB, dbGetCurrentUser, dbSetCurrentUser } from './dbService';
import type { User } from './dbService';
import { AuthScreen } from './components/AuthScreen';
import { DosenDashboard } from './components/DosenDashboard';
import { MahasiswaDashboard } from './components/MahasiswaDashboard';

import { AppProvider } from './AppContext';
import { useAppContext } from './hooks/useAppContext';

initDB();

function AppContent() {
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
