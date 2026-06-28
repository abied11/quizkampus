import React, { useMemo, useEffect, useState } from 'react';
import { Trophy, Medal, Clock, Users, Globe, GraduationCap, BookOpen } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { PodiumView } from './PodiumView';
import { PublicProfileView } from './PublicProfileView';
import { UserAvatar } from './UserAvatar';
import { buildPodiumFromAttempts } from '../utils/scoring';
import { dbGetGlobalLeaderboard, dbGetUsersByIds } from '../dbService';
import type { GlobalLeaderboardEntry } from '../dbService';

type LbTab = 'quiz' | 'global' | 'class';

interface LeaderboardScreenProps {
  filterSessionId?: string;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ filterSessionId }) => {
  const { sessions, attempts: allAttempts } = useAppContext();
  const [tab, setTab] = useState<LbTab>('quiz');
  const [selectedSessionId, setSelectedSessionId] = useState(filterSessionId || '');
  const [classFilter, setClassFilter] = useState('');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [globalData, setGlobalData] = useState<GlobalLeaderboardEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, { profilePhotoUrl?: string; name?: string }>>({});

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  // Load users map for profile photos in quiz leaderboard
  useEffect(() => {
    const ids = [...new Set(allAttempts.map(a => a.studentId))];
    if (!ids.length) return;
    dbGetUsersByIds(ids).then(users => {
      const map: Record<string, { profilePhotoUrl?: string; name?: string }> = {};
      users.forEach(u => { map[u.id] = { profilePhotoUrl: u.profilePhotoUrl, name: u.name }; });
      setUsersMap(map);
    }).catch(() => {});
  }, [allAttempts]);

  // Load global leaderboard when tab switches
  useEffect(() => {
    if (tab !== 'global') return;
    setGlobalLoading(true);
    dbGetGlobalLeaderboard()
      .then(setGlobalData)
      .catch(() => {})
      .finally(() => setGlobalLoading(false));
  }, [tab]);

  const leaderboard = useMemo(() => {
    const completed = allAttempts.filter(
      a => a.quizSessionId === selectedSessionId && a.status === 'completed'
    );
    const bestByStudent: Record<string, typeof completed[0]> = {};
    completed.forEach(att => {
      if (!bestByStudent[att.studentId] || att.score > bestByStudent[att.studentId].score) {
        bestByStudent[att.studentId] = att;
      }
    });
    return Object.values(bestByStudent).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const tA = a.submitTime && a.startTime ? new Date(a.submitTime).getTime() - new Date(a.startTime).getTime() : Infinity;
      const tB = b.submitTime && b.startTime ? new Date(b.submitTime).getTime() - new Date(b.startTime).getTime() : Infinity;
      return tA - tB;
    });
  }, [selectedSessionId, allAttempts]);

  const classLeaderboard = useMemo(() => {
    const bestByStudent: Record<string, typeof allAttempts[0]> = {};
    allAttempts.filter(a => a.status === 'completed').forEach(att => {
      if (!bestByStudent[att.studentId] || att.score > bestByStudent[att.studentId].score) {
        bestByStudent[att.studentId] = att;
      }
    });
    return Object.values(bestByStudent)
      .filter(a => !classFilter || (usersMap[a.studentId]?.name ?? '').toLowerCase().includes(classFilter.toLowerCase()))
      .sort((a, b) => b.score - a.score);
  }, [allAttempts, classFilter, usersMap]);

  const allClasses = [...new Set(globalData.map(e => e.user.class).filter(Boolean))];

  const getRankStyle = (idx: number) => {
    if (idx === 0) return { bg: 'from-amber-500/20 to-amber-600/5 border-amber-500/40', text: 'text-amber-400', icon: <Trophy className="h-6 w-6 text-amber-400" /> };
    if (idx === 1) return { bg: 'from-slate-400/20 to-slate-500/5 border-slate-400/30', text: 'text-slate-300', icon: <Medal className="h-5 w-5 text-slate-400" /> };
    if (idx === 2) return { bg: 'from-orange-700/15 to-orange-800/5 border-orange-600/25', text: 'text-orange-400', icon: <Medal className="h-5 w-5 text-orange-500" /> };
    return { bg: 'from-slate-900/40 to-slate-900/20 border-slate-800/60', text: 'text-slate-300', icon: null };
  };

  const formatDuration = (att: typeof leaderboard[0]) => {
    if (!att.submitTime || !att.startTime) return '-';
    const ms = new Date(att.submitTime).getTime() - new Date(att.startTime).getTime();
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  const scoreColor = (s: number) => s >= 80 ? 'text-uir-yellow-gold' : s >= 60 ? 'text-uir-green-muted' : 'text-red-400';

  // Show public profile
  if (viewingUserId) {
    return <PublicProfileView userId={viewingUserId} onBack={() => setViewingUserId(null)} />;
  }

  const tabs: { id: LbTab; label: string; icon: React.ElementType }[] = [
    { id: 'quiz', label: 'Per Ujian', icon: BookOpen },
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'class', label: 'Per Kelas', icon: GraduationCap },
  ];

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Trophy className="h-7 w-7 text-amber-400" /> Papan Peringkat
        </h2>
        <p className="text-slate-400 text-sm mt-1">Klik nama untuk melihat profil peserta.</p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 p-1 rounded-2xl bg-slate-900/60 border border-slate-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all btn-press border ${
              tab === t.id
                ? 'lb-tab-active'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Quiz Leaderboard ── */}
      {tab === 'quiz' && (
        <>
          <div className="glass rounded-2xl p-4 border border-slate-800">
            <select
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
            >
              {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          {leaderboard.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-slate-800">
              <Users className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-300">Belum Ada Peserta</h3>
              <p className="text-slate-400 text-sm mt-1">Belum ada mahasiswa yang menyelesaikan sesi kuis ini.</p>
            </div>
          ) : (
            <>
              <div className="glass rounded-2xl p-6 border border-slate-800 mb-4">
                <PodiumView
                  entries={buildPodiumFromAttempts(leaderboard, usersMap)}
                  onClickUser={setViewingUserId}
                />
              </div>
              <div className="space-y-3">
                {leaderboard.map((att, idx) => {
                  const style = getRankStyle(idx);
                  const passed = att.score >= 60;
                  const userInfo = usersMap[att.studentId];
                  return (
                    <div
                      key={att.id}
                      className={`bg-gradient-to-r ${style.bg} rounded-2xl p-4 border flex items-center gap-4 transition-all hover:scale-[1.01] cursor-pointer btn-press`}
                      onClick={() => setViewingUserId(att.studentId)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${style.text}`}>
                        {style.icon || <span className="text-slate-400 text-base">#{idx + 1}</span>}
                      </div>
                      <UserAvatar
                        user={{ name: att.studentName, profilePhotoUrl: userInfo?.profilePhotoUrl }}
                        size="sm"
                        className={idx === 0 ? 'avatar-rank-1' : idx === 1 ? 'avatar-rank-2' : idx === 2 ? 'avatar-rank-3' : 'avatar-ring-green'}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{att.studentName}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(att)}</span>
                          <span>{att.correctCount}/{att.totalQuestions} benar</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-2xl font-black ${scoreColor(att.score)}`}>{att.score}</div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          passed ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300' : 'bg-red-950/40 border-red-500/20 text-red-300'
                        }`}>
                          {passed ? 'Lulus' : 'Tidak Lulus'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Global Leaderboard ── */}
      {tab === 'global' && (
        <>
          {globalLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
            </div>
          ) : globalData.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-slate-800">
              <Globe className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-300">Belum Ada Data</h3>
            </div>
          ) : (
            <>
              <div className="glass rounded-2xl p-5 border border-slate-800 mb-2">
                <p className="text-xs text-slate-500 text-center">
                  Menampilkan {globalData.length} mahasiswa — diurutkan berdasarkan total XP
                </p>
              </div>
              <div className="space-y-3">
                {globalData.map((entry, idx) => {
                  const style = getRankStyle(idx);
                  return (
                    <div
                      key={entry.user.id}
                      className={`bg-gradient-to-r ${style.bg} rounded-2xl p-4 border flex items-center gap-4 transition-all hover:scale-[1.01] cursor-pointer btn-press`}
                      onClick={() => setViewingUserId(entry.user.id)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${style.text}`}>
                        {style.icon || <span className="text-slate-400 text-base">#{idx + 1}</span>}
                      </div>
                      <UserAvatar
                        user={entry.user}
                        size="sm"
                        className={idx === 0 ? 'avatar-rank-1' : idx === 1 ? 'avatar-rank-2' : idx === 2 ? 'avatar-rank-3' : 'avatar-ring-green'}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{entry.user.name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span className="text-uir-yellow-gold font-bold">⚡ {entry.user.xp ?? 0} XP</span>
                          <span>{entry.totalQuizzes} quiz</span>
                          <span>avg {entry.avgScore}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-2xl font-black ${scoreColor(entry.bestScore)}`}>{entry.bestScore}</div>
                        <div className="text-[10px] text-slate-500">terbaik</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Class Leaderboard ── */}
      {tab === 'class' && (
        <>
          <div className="glass rounded-2xl p-4 border border-slate-800 flex gap-3">
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl glass-input text-sm"
            >
              <option value="">Semua Kelas</option>
              {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {classLeaderboard.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-slate-800">
              <GraduationCap className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-300">Belum Ada Data</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {classLeaderboard.map((att, idx) => {
                const style = getRankStyle(idx);
                const userInfo = usersMap[att.studentId];
                return (
                  <div
                    key={att.id}
                    className={`bg-gradient-to-r ${style.bg} rounded-2xl p-4 border flex items-center gap-4 transition-all hover:scale-[1.01] cursor-pointer btn-press`}
                    onClick={() => setViewingUserId(att.studentId)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${style.text}`}>
                      {style.icon || <span className="text-slate-400 text-base">#{idx + 1}</span>}
                    </div>
                    <UserAvatar
                      user={{ name: att.studentName, profilePhotoUrl: userInfo?.profilePhotoUrl }}
                      size="sm"
                      className={idx < 3 ? `avatar-rank-${idx + 1}` : 'avatar-ring-green'}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-100 truncate">{att.studentName}</p>
                      <p className="text-xs text-slate-400">{att.correctCount}/{att.totalQuestions} benar</p>
                    </div>
                    <div className={`text-2xl font-black ${scoreColor(att.score)}`}>{att.score}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
