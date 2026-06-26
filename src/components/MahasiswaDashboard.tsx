import React, { useState } from 'react';
import type { User } from '../dbService';
import { QuizAttemptScreen } from './QuizAttemptScreen';
import { LeaderboardScreen } from './LeaderboardScreen';
import { StudentProgressView } from './StudentProgressView';
import { NotificationBell } from './NotificationBell';
import { FlashcardView } from './FlashcardView';
import { ProfileView } from './ProfileView';
import { UserAvatar } from './UserAvatar';
import { isSoundEnabled, setSoundEnabled } from '../utils/sounds';
import {
  GraduationCap, Play, Trophy, LogOut, ChevronRight,
  User as UserIcon, BarChart2, Layers, Volume2, VolumeX, UserCircle
} from 'lucide-react';

interface MahasiswaDashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}

type MhsTab = 'quiz' | 'flashcards' | 'progress' | 'leaderboard' | 'profile';

export const MahasiswaDashboard: React.FC<MahasiswaDashboardProps> = ({ user, onLogout, onUserUpdated }) => {
  const [activeTab, setActiveTab] = useState<MhsTab>('quiz');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  const tabs: { id: MhsTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'quiz',        label: 'Ikuti Kuis',   icon: Play,     desc: 'Masukkan kode akses dan mulai ujian' },
    { id: 'flashcards',  label: 'Flashcard',    icon: Layers,   desc: 'Mode belajar kartu & spaced repetition' },
    { id: 'progress',   label: 'Progres Saya',  icon: BarChart2, desc: 'Pantau perkembangan nilai, XP & badge' },
    { id: 'leaderboard', label: 'Peringkat',    icon: Trophy,   desc: 'Papan peringkat peserta kuis' },
    { id: 'profile',     label: 'Profil',       icon: UserCircle, desc: 'Edit foto profil dan data diri' },
  ];

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

        {/* Profile & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {sidebarOpen && (
            <div className="px-3 py-2.5 rounded-xl bg-slate-950/40 flex items-center gap-2.5 animate-fade-in">
              <UserAvatar user={user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                <p className="text-[10px] text-uir-yellow-gold font-semibold">{user.class} • {user.xp ?? 0} XP</p>
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
            <button
              onClick={() => { setSoundOn((v: boolean) => { const n = !v; setSoundEnabled(n); return n; }); }}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              title={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <NotificationBell user={user} />
            <div className="flex items-center gap-2 text-xs text-slate-400 hidden sm:flex">
              <UserIcon className="h-3.5 w-3.5" />
              <span className="text-slate-300 font-medium">{user.name}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="animate-fade-in-up">
            {activeTab === 'quiz' && (
              <QuizAttemptScreen
                user={user}
                onBack={() => setActiveTab('quiz')}
              />
            )}
            {activeTab === 'flashcards' && <FlashcardView user={user} />}
            {activeTab === 'progress' && <StudentProgressView user={user} />}
            {activeTab === 'leaderboard' && <LeaderboardScreen />}
            {activeTab === 'profile' && <ProfileView user={user} onUserUpdated={onUserUpdated} />}
          </div>
        </div>
      </main>
    </div>
  );
};
