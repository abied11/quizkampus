import React, { useState, useMemo } from 'react';
import { computeStudentStats } from '../dbService';
import type { Attempt, StudentStats } from '../dbService';
import {
  Users, Search, Shield,
  CheckCircle, XCircle, AlertTriangle, BarChart2, BookOpen,
  ChevronDown, ChevronUp, Clock, Filter
} from 'lucide-react';
import { useAppContext } from '../AppContext';

export const UserManagementView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortBy, setSortBy] = useState<'studentName' | 'avgScore' | 'totalAttempts' | 'violationCount'>('avgScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { users, attempts: allAttempts, sessions: allSessions, logs: allLogs } = useAppContext();

  const allStats = computeStudentStats(users, allAttempts, allLogs);

  const classes = Array.from(new Set(allStats.map(s => s.studentClass))).sort();

  const filtered = useMemo(() => {
    let list = allStats.filter(s => {
      const matchSearch = s.studentName.toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === '' || s.studentClass === classFilter;
      return matchSearch && matchClass;
    });

    list.sort((a, b) => {
      const aVal = a[sortBy as keyof StudentStats] as number | string;
      const bVal = b[sortBy as keyof StudentStats] as number | string;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return list;
  }, [allStats, search, classFilter, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
      : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  };

  const getStudentAttempts = (studentId: string): (Attempt & { sessionTitle: string })[] =>
    allAttempts
      .filter(a => a.studentId === studentId && a.status === 'completed')
      .map(a => ({
        ...a,
        sessionTitle: allSessions.find(s => s.id === a.quizSessionId)?.title || 'Sesi Tidak Diketahui',
      }))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const getStudentLogs = (studentId: string) =>
    allLogs.filter(l => l.studentId === studentId);

  const violationLabel = (type: string) => {
    const labels: Record<string, string> = {
      tab_switch: 'Pindah Tab', exit_fullscreen: 'Keluar Layar Penuh',
      copy_paste: 'Copy/Paste', right_click: 'Klik Kanan',
      mouse_leave: 'Mouse Keluar', devtools: 'Developer Tools',
    };
    return labels[type] || type;
  };

  // Summary stats
  const totalStudents = allStats.length;
  const activeStudents = allStats.filter(s => s.totalAttempts > 0).length;
  const globalAvg = allStats.length > 0
    ? Math.round(allStats.filter(s => s.totalAttempts > 0).reduce((sum, s) => sum + s.avgScore, 0) / Math.max(activeStudents, 1))
    : 0;
  const totalViolations = allStats.reduce((sum, s) => sum + s.violationCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white">Manajemen Mahasiswa</h2>
        <p className="text-slate-400 text-sm mt-1">Monitor performa dan aktivitas seluruh mahasiswa yang terdaftar.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Mahasiswa', value: totalStudents, icon: Users, cardClass: 'stat-card-blue', iconColor: 'text-uir-green-muted' },
          { label: 'Aktif Mengikuti', value: activeStudents, icon: BookOpen, cardClass: 'stat-card-emerald', iconColor: 'text-emerald-400' },
          { label: 'Rata-rata Kelas', value: globalAvg, icon: BarChart2, cardClass: 'stat-card-blue', iconColor: 'text-uir-yellow-gold' },
          { label: 'Total Pelanggaran', value: totalViolations, icon: Shield, cardClass: totalViolations > 0 ? 'stat-card-amber' : 'stat-card-blue', iconColor: totalViolations > 0 ? 'text-amber-400' : 'text-slate-400' },
        ].map(({ label, value, icon: Icon, cardClass, iconColor }, idx) => (
          <div
            key={label}
            className={`${cardClass} rounded-2xl p-4 text-center animate-fade-in-up hover-lift`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <Icon className={`h-5 w-5 mx-auto mb-2 ${iconColor}`} />
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-3 border border-slate-800 animate-fade-in-up delay-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama mahasiswa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl glass-input text-sm"
          >
            <option value="">Semua Kelas</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Student Table */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-slate-800 animate-fade-in-up">
          <Users className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-300">Tidak Ada Mahasiswa Ditemukan</h3>
          <p className="text-slate-400 text-sm mt-1">Coba sesuaikan filter pencarian Anda.</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in-up delay-300">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2">
            {[
              { key: 'studentName' as const, label: 'Mahasiswa' },
              { key: 'totalAttempts' as const, label: 'Kuis Dikerjakan' },
              { key: 'avgScore' as const, label: 'Rata-rata' },
              { key: 'avgScore' as const, label: 'Terbaik', noSort: true },
              { key: 'avgScore' as const, label: 'Lulus/Gagal', noSort: true },
              { key: 'violationCount' as const, label: 'Pelanggaran' },
            ].map(({ key, label, noSort }) => (
              <button
                key={label}
                onClick={() => !noSort && toggleSort(key)}
                className={`text-left text-xs font-semibold uppercase tracking-wider text-slate-400 ${!noSort ? 'hover:text-white transition-colors cursor-pointer' : 'cursor-default'}`}
              >
                {label}
                {!noSort && <SortIcon col={key} />}
              </button>
            ))}
          </div>

          {filtered.map((student, idx) => {
            const isExpanded = expandedId === student.studentId;
            const studentAttempts = isExpanded ? getStudentAttempts(student.studentId) : [];
            const studentLogs = isExpanded ? getStudentLogs(student.studentId) : [];

            return (
              <div
                key={student.studentId}
                className={`glass-card rounded-2xl border transition-all animate-fade-in-up ${
                  isExpanded ? 'border-uir-green-medium/40 glow-blue' : 'border-slate-800/60 hover:border-uir-green-medium/30'
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Main Row */}
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : student.studentId)}
                >
                  <div className="grid grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center">
                    {/* Name & Class */}
                    <div className="flex items-center gap-3 col-span-2 lg:col-span-1">
                      <div className="h-9 w-9 rounded-xl bg-uir-green-medium/15 border border-uir-green-medium/30 flex items-center justify-center text-sm font-bold text-uir-green-muted shrink-0">
                        {student.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{student.studentName}</p>
                        <p className="text-xs text-slate-400">{student.studentClass}</p>
                      </div>
                    </div>

                    {/* Total Attempts */}
                    <div className="hidden lg:block">
                      <span className="text-sm font-bold text-white">{student.totalAttempts}</span>
                      <span className="text-xs text-slate-400 ml-1">kuis</span>
                    </div>

                    {/* Avg Score */}
                    <div className="hidden lg:block">
                      <span className={`text-lg font-black ${
                        student.avgScore >= 80 ? 'text-uir-yellow-gold' :
                        student.avgScore >= 60 ? 'text-uir-green-muted' :
                        student.totalAttempts > 0 ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        {student.totalAttempts > 0 ? student.avgScore : '—'}
                      </span>
                    </div>

                    {/* Best Score */}
                    <div className="hidden lg:block">
                      <span className={`text-sm font-bold ${student.bestScore >= 60 ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {student.totalAttempts > 0 ? student.bestScore : '—'}
                      </span>
                    </div>

                    {/* Pass/Fail */}
                    <div className="hidden lg:flex items-center gap-2">
                      {student.passCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                          <CheckCircle className="h-3.5 w-3.5" />{student.passCount}
                        </span>
                      )}
                      {student.failCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                          <XCircle className="h-3.5 w-3.5" />{student.failCount}
                        </span>
                      )}
                      {student.totalAttempts === 0 && <span className="text-xs text-slate-500">—</span>}
                    </div>

                    {/* Violations */}
                    <div className="hidden lg:flex items-center gap-2">
                      {student.violationCount > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />{student.violationCount}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <Shield className="h-3.5 w-3.5" />Bersih
                        </span>
                      )}
                    </div>

                    {/* Mobile: quick stats */}
                    <div className="flex items-center gap-3 lg:hidden text-xs text-slate-400">
                      <span>Avg: <strong className="text-white">{student.totalAttempts > 0 ? student.avgScore : '—'}</strong></span>
                      <span>{student.totalAttempts} kuis</span>
                      {student.violationCount > 0 && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />{student.violationCount}
                        </span>
                      )}
                    </div>

                    {/* Expand icon */}
                    <div className="hidden lg:flex items-center justify-end">
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-uir-yellow-gold" />
                        : <ChevronDown className="h-4 w-4 text-slate-400" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 p-4 space-y-4 animate-fade-in">
                    {/* Attempt History */}
                    {studentAttempts.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" /> Riwayat Kuis
                        </p>
                        <div className="space-y-2">
                          {studentAttempts.slice(0, 5).map(att => (
                            <div key={att.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-200 truncate max-w-[200px]">{att.sessionTitle}</p>
                                <p className="text-[10px] text-slate-500">
                                  {att.submitTime ? new Date(att.submitTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-slate-400">{att.correctCount}/{att.totalQuestions} benar</span>
                                <span className={`text-base font-black ${att.score >= 80 ? 'text-uir-yellow-gold' : att.score >= 60 ? 'text-uir-green-muted' : 'text-red-400'}`}>
                                  {att.score}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Belum ada kuis yang dikerjakan.</p>
                    )}

                    {/* Violation Logs */}
                    {studentLogs.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Log Pelanggaran ({studentLogs.length})
                        </p>
                        <div className="max-h-28 overflow-y-auto space-y-1.5">
                          {studentLogs.slice(-5).reverse().map(log => (
                            <div key={log.id} className="flex justify-between items-start p-2 rounded-lg bg-amber-950/15 border border-amber-500/10">
                              <div>
                                <span className="text-[10px] font-bold text-amber-300 px-1.5 py-0.5 rounded-full bg-amber-900/30">
                                  {violationLabel(log.type)}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{log.details}</p>
                              </div>
                              <span className="text-[9px] text-slate-500 shrink-0 ml-2">
                                {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
