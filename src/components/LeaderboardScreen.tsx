import React, { useMemo } from 'react';
import { Trophy, Medal, Clock, Users } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { PodiumView } from './PodiumView';
import { buildPodiumFromAttempts } from '../utils/scoring';

interface LeaderboardScreenProps {
  filterSessionId?: string;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ filterSessionId }) => {
  const { sessions, attempts: allAttempts } = useAppContext();
  const [selectedSessionId, setSelectedSessionId] = React.useState(filterSessionId || '');

  React.useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const leaderboard = useMemo(() => {
    const completed = allAttempts.filter(
      a => a.quizSessionId === selectedSessionId && a.status === 'completed'
    );

    // Best attempt per student
    const bestByStudent: Record<string, typeof completed[0]> = {};
    completed.forEach(att => {
      if (!bestByStudent[att.studentId] || att.score > bestByStudent[att.studentId].score) {
        bestByStudent[att.studentId] = att;
      }
    });

    return Object.values(bestByStudent).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break: faster time
      const tA = a.submitTime && a.startTime ? new Date(a.submitTime).getTime() - new Date(a.startTime).getTime() : Infinity;
      const tB = b.submitTime && b.startTime ? new Date(b.submitTime).getTime() - new Date(b.startTime).getTime() : Infinity;
      return tA - tB;
    });
  }, [selectedSessionId, allAttempts]);

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Trophy className="h-7 w-7 text-amber-400" /> Papan Peringkat
        </h2>
        <p className="text-slate-400 text-sm mt-1">Peringkat terbaik berdasarkan nilai dan kecepatan pengerjaan.</p>
      </div>

      {/* Session Selector */}
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
          <PodiumView entries={buildPodiumFromAttempts(leaderboard)} />
        </div>
        <div className="space-y-3">
          {leaderboard.map((att, idx) => {
            const style = getRankStyle(idx);
            const passed = att.score >= 60;
            return (
              <div
                key={att.id}
                className={`bg-gradient-to-r ${style.bg} rounded-2xl p-4 border flex items-center gap-4 transition-all hover:scale-[1.01]`}
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${style.text}`}>
                  {style.icon || <span className="text-slate-400 text-base">#{idx + 1}</span>}
                </div>

                {/* Avatar Initial */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : idx === 1 ? 'bg-slate-500/20 text-slate-300 border border-slate-400/30'
                  : idx === 2 ? 'bg-orange-600/20 text-orange-300 border border-orange-500/25'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {att.studentName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100 truncate">{att.studentName}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDuration(att)}
                    </span>
                    <span>{att.correctCount}/{att.totalQuestions} benar</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-black ${att.score >= 80 ? 'text-uir-yellow-gold' : att.score >= 60 ? 'text-uir-green-muted' : 'text-red-400'}`}>
                    {att.score}
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    passed
                      ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/20 text-red-300'
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
    </div>
  );
};
