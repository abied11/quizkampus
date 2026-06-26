import React, { useState } from 'react';
import type { User } from '../dbService';
import { QuestionBankView } from './QuestionBankView';
import { SessionManagerView } from './SessionManagerView';
import { ResultsAnalyticsView } from './ResultsAnalyticsView';
import { LeaderboardScreen } from './LeaderboardScreen';
import { UserManagementView } from './UserManagementView';
import { LiveMonitorView } from './LiveMonitorView';
import { NotificationBell } from './NotificationBell';
import { BookOpen, Calendar, BarChart2, Trophy, LogOut, GraduationCap, ChevronRight, Users, Activity, UserCircle } from 'lucide-react';
import { ProfileView } from './ProfileView';
import { UserAvatar } from './UserAvatar';

interface DosenDashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}

type DosenTab = 'questions' | 'sessions' | 'students' | 'results' | 'leaderboard' | 'monitor' | 'profile';

const tabs: { id: DosenTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'questions',   label: 'Bank Soal',    icon: BookOpen,  desc: 'Kelola kumpulan soal kuis' },
  { id: 'sessions',    label: 'Sesi Kuis',    icon: Calendar,  desc: 'Atur jadwal dan konfigurasi ujian' },
  { id: 'monitor',     label: 'Monitor Live', icon: Activity,  desc: 'Pantau peserta real-time' },
  { id: 'students',    label: 'Mahasiswa',    icon: Users,     desc: 'Monitor performa dan aktivitas mahasiswa' },
  { id: 'results',     label: 'Analitik Nilai', icon: BarChart2, desc: 'Lihat hasil dan statistik kelas' },
  { id: 'leaderboard', label: 'Peringkat',    icon: Trophy,    desc: 'Papan peringkat peserta kuis' },
  { id: 'profile',     label: 'Profil',       icon: UserCircle, desc: 'Edit foto profil dan data diri' },
];

export const DosenDashboard: React.FC<DosenDashboardProps> = ({ user, onLogout, onUserUpdated }) => {
  const [activeTab, setActiveTab] = useState<DosenTab>('questions');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeTabInfo = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} shrink-0 transition-all duration-300 sidebar-gradient border-r border-slate-800/80 flex flex-col h-screen sticky top-0`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800/80 ${!sidebarOpen ? 'justify-center' : ''}`}>
          <div className="p-2 rounded-xl bg-gradient-to-tr from-uir-green-dark to-uir-green-medium shrink-0 shadow-lg shadow-uir-green-dark/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in">
              <p className="text-xs font-black tracking-tight text-white leading-none">Web Quiz</p>
              <p className="text-[10px] text-uir-yellow-gold font-semibold uppercase tracking-wider">Kampus</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map(({ id, label, icon: Icon }, idx) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all animate-slide-in-left ${
                activeTab === id
                  ? 'nav-item-active text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              } ${!sidebarOpen ? 'justify-center' : ''}`}
              style={{ animationDelay: `${idx * 60}ms` }}
              title={!sidebarOpen ? label : ''}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && activeTab === id && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-uir-yellow-gold" />
              )}
            </button>
          ))}
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {sidebarOpen && (
            <div className="px-3 py-2.5 rounded-xl bg-slate-950/40 animate-fade-in flex items-center gap-2.5">
              <UserAvatar user={user} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                <p className="text-[10px] text-uir-yellow-gold font-semibold">Dosen • {user.class}</p>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-all ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && 'Keluar'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div>
              <h1 className="text-base font-bold text-white">{activeTabInfo.label}</h1>
              <p className="text-xs text-slate-400">{activeTabInfo.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Bell (Dosen juga bisa terima info) */}
            <NotificationBell user={user} />
            <div className="text-xs text-slate-500 hidden sm:block">
              Selamat datang, <span className="text-slate-300 font-medium">{user.name}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="animate-fade-in-up">
            {activeTab === 'questions'   && <QuestionBankView />}
            {activeTab === 'sessions'    && <SessionManagerView user={user} />}
            {activeTab === 'monitor'     && <LiveMonitorView />}
            {activeTab === 'students'    && <UserManagementView />}
            {activeTab === 'results'     && <ResultsAnalyticsView />}
            {activeTab === 'leaderboard' && <LeaderboardScreen />}
            {activeTab === 'profile' && <ProfileView user={user} onUserUpdated={onUserUpdated} />}
          </div>
        </div>
      </main>
    </div>
  );
};
