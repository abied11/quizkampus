import React, { useMemo } from 'react';
import type { User } from '../dbService';
import {
  TrendingUp, TrendingDown, CheckCircle, XCircle, Clock,
  Shield, Trophy, AlertTriangle, BookOpen, BarChart2
} from 'lucide-react';
import { useAppContext } from '../AppContext';

interface StudentProgressViewProps {
  user: User;
}

export const StudentProgressView: React.FC<StudentProgressViewProps> = ({ user }) => {
  const { attempts: allAttempts, sessions: allSessions, logs: allLogs } = useAppContext();

  const myAttempts = useMemo(() =>
    allAttempts
      .filter(a => a.studentId === user.id && a.status === 'completed')
      .map(a => ({
        ...a,
        session: allSessions.find(s => s.id === a.quizSessionId),
      }))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [allAttempts, allSessions, user.id]
  );

  const myViolations = allLogs.filter(l => l.studentId === user.id);

  const stats = useMemo(() => {
    if (myAttempts.length === 0) return null;
    const scores = myAttempts.map(a => a.score);
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const best = Math.max(...scores);
    const worst = Math.min(...scores);
    const passing = scores.filter(s => s >= 60).length;
    // Trend: compare last half vs first half
    const half = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, half || 1);
    const lastHalf = scores.slice(half);
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const lastAvg = lastHalf.reduce((s, v) => s + v, 0) / lastHalf.length;
    const trend = lastAvg - firstAvg;
    return { avg, best, worst, passing, total: scores.length, trend };
  }, [myAttempts]);

  const violationLabel = (type: string) => {
    const labels: Record<string, string> = {
      tab_switch: 'Pindah Tab', exit_fullscreen: 'Keluar Layar Penuh',
      copy_paste: 'Copy/Paste', right_click: 'Klik Kanan',
      mouse_leave: 'Mouse Keluar', devtools: 'Developer Tools',
    };
    return labels[type] || type;
  };

  // Chart: simple bar chart for scores over time
  const chartMax = myAttempts.length > 0 ? Math.max(...myAttempts.map(a => a.score), 100) : 100;

  if (myAttempts.length === 0) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-white">Progres Saya</h2>
          <p className="text-slate-400 text-sm mt-1">Pantau perkembangan nilai dan riwayat kuis Anda.</p>
        </div>
        <div className="glass rounded-2xl p-12 text-center border border-slate-800">
          <BookOpen className="h-14 w-14 text-slate-600 mx-auto mb-4 animate-float" />
          <h3 className="text-lg font-semibold text-slate-300">Belum Ada Riwayat Kuis</h3>
          <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
            Ikuti kuis pertama Anda dengan memasukkan kode akses dari dosen di tab "Ikuti Kuis".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white">Progres Saya</h2>
        <p className="text-slate-400 text-sm mt-1">Pantau perkembangan nilai dan riwayat kuis Anda.</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Rata-rata Nilai',
              value: stats.avg,
              icon: BarChart2,
              cardClass: 'stat-card-blue',
              iconColor: 'text-uir-green-muted',
              suffix: '',
            },
            {
              label: 'Nilai Terbaik',
              value: stats.best,
              icon: Trophy,
              cardClass: 'stat-card-emerald',
              iconColor: 'text-uir-yellow-gold',
              suffix: '',
            },
            {
              label: 'Kuis Lulus',
              value: `${stats.passing}/${stats.total}`,
              icon: CheckCircle,
              cardClass: 'stat-card-blue',
              iconColor: 'text-emerald-400',
              suffix: '',
            },
            {
              label: 'Tren Nilai',
              value: stats.trend >= 0 ? `+${Math.round(stats.trend)}` : `${Math.round(stats.trend)}`,
              icon: stats.trend >= 0 ? TrendingUp : TrendingDown,
              cardClass: stats.trend >= 0 ? 'stat-card-emerald' : 'stat-card-red',
              iconColor: stats.trend >= 0 ? 'text-emerald-400' : 'text-red-400',
              suffix: '',
            },
          ].map(({ label, value, icon: Icon, cardClass, iconColor }, idx) => (
            <div
              key={label}
              className={`${cardClass} rounded-2xl p-4 text-center animate-fade-in-up hover-lift`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <Icon className={`h-5 w-5 mx-auto mb-2 ${iconColor}`} />
              <div className="text-2xl font-black text-white animate-count-up">{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Score Chart */}
      {myAttempts.length > 1 && (
        <div className="glass-card rounded-2xl p-5 border border-uir-green-medium/20 animate-fade-in-up delay-200">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-uir-yellow-gold" />
            Grafik Perkembangan Nilai
          </h3>
          <div className="flex items-end gap-2 h-36">
            {myAttempts.map((a, idx) => {
              const heightPct = Math.max((a.score / chartMax) * 100, 4);
              const isPassed = a.score >= 60;
              return (
                <div key={a.id} className="flex-1 flex flex-col items-center gap-1 group">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-full bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap z-10">
                    {a.session?.title || 'Sesi'}: {a.score}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{a.score}</span>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-700 ${
                      isPassed ? 'bg-gradient-to-t from-uir-green-medium to-uir-green-muted' : 'bg-gradient-to-t from-red-600 to-red-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] text-slate-500 text-center leading-tight line-clamp-1">
                    Kuis {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-uir-green-medium" /> Lulus (≥60)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Tidak Lulus</span>
          </div>
        </div>
      )}

      {/* Attempt History Table */}
      <div className="glass-card rounded-2xl border border-slate-800/60 overflow-hidden animate-fade-in-up delay-300">
        <div className="p-4 border-b border-slate-800/80">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Riwayat Pengerjaan
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr>
                {['Kuis', 'Tanggal', 'Durasi', 'Benar/Total', 'Nilai', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {myAttempts.slice().reverse().map((att, idx) => {
                const passed = att.score >= 60;
                const dur = att.submitTime
                  ? (() => {
                      const ms = new Date(att.submitTime).getTime() - new Date(att.startTime).getTime();
                      const m = Math.floor(ms / 60000);
                      const s = Math.floor((ms % 60000) / 1000);
                      return `${m}m ${s}s`;
                    })()
                  : '-';
                return (
                  <tr
                    key={att.id}
                    className={`hover:bg-slate-800/20 transition-colors animate-fade-in-up`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <td className="px-4 py-3 text-slate-200 font-medium text-xs max-w-[160px] truncate">
                      {att.session?.title || 'Sesi Tidak Diketahui'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {att.submitTime
                        ? new Date(att.submitTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{dur}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{att.correctCount}/{att.totalQuestions}</td>
                    <td className="px-4 py-3">
                      <span className={`text-lg font-black ${att.score >= 80 ? 'text-uir-yellow-gold' : att.score >= 60 ? 'text-uir-green-muted' : 'text-red-400'}`}>
                        {att.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        passed
                          ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
                          : 'bg-red-950/30 border-red-500/20 text-red-300'
                      }`}>
                        {passed
                          ? <><CheckCircle className="h-2.5 w-2.5" /> Lulus</>
                          : <><XCircle className="h-2.5 w-2.5" /> Tidak Lulus</>
                        }
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Violation Summary */}
      {myViolations.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-amber-500/15 animate-fade-in-up delay-400">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" />
            Catatan Aktivitas Anti-Cheat
          </h3>
          <div className="p-3 rounded-xl bg-amber-950/15 border border-amber-500/10 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-200 font-medium">
                {myViolations.length} pelanggaran tercatat
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Aktivitas yang dicatat:{' '}
                {Array.from(new Set(myViolations.map(l => l.type)))
                  .map(violationLabel)
                  .join(', ')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Pelanggaran ini dilaporkan kepada dosen dan dapat mempengaruhi penilaian.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
