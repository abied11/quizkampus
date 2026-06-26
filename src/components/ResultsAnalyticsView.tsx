import React, { useState, useMemo } from 'react';
import { computeGradeDistribution, computeQuestionAnalysis } from '../dbService';
import type { Attempt, ActivityLog, QuizSession } from '../dbService';
import { generatePDFReport, generateExcelReport } from '../ReportGenerator';
import {
  BarChart2, Download, Users, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Trophy, Filter, Printer, FileSpreadsheet
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';

export const ResultsAnalyticsView: React.FC = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const { sessions, attempts: allAttempts, logs: allLogs, questions } = useAppContext();

  const session: QuizSession | undefined = sessions.find(s => s.id === selectedSessionId);
  const sessionAttempts: Attempt[] = allAttempts.filter(
    a => a.quizSessionId === selectedSessionId && a.status === 'completed'
  );
  const attemptIds = new Set(sessionAttempts.map(a => a.id));
  const sessionLogs: ActivityLog[] = allLogs.filter(l => attemptIds.has(l.attemptId));
  const gradeDistribution = selectedSessionId ? computeGradeDistribution(allAttempts, selectedSessionId) : [];
  const questionAnalysis = selectedSessionId ? computeQuestionAnalysis(sessions, questions, allAttempts, selectedSessionId) : [];

  const stats = useMemo(() => {
    if (sessionAttempts.length === 0) return null;
    const scores = sessionAttempts.map(a => a.score);
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passing = scores.filter(s => s >= 60).length;
    return { avg, max, min, passing, total: scores.length };
  }, [sessionAttempts]);

  const maxDistCount = Math.max(...gradeDistribution.map(d => d.count), 1);

  const exportCSV = () => {
    if (!session) return;
    const header = 'Nama Mahasiswa,Waktu Mulai,Waktu Selesai,Skor,Benar,Total Soal,Status\n';
    const rows = sessionAttempts.map(a =>
      `"${a.studentName}","${new Date(a.startTime).toLocaleString('id-ID')}","${a.submitTime ? new Date(a.submitTime).toLocaleString('id-ID') : '-'}",${a.score},${a.correctCount},${a.totalQuestions},"${a.score >= 60 ? 'Lulus' : 'Tidak Lulus'}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nilai_${session.title.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPDF = () => {
    if (!session || !stats) return;
    generatePDFReport({
      session,
      attempts: sessionAttempts,
      questionAnalysis,
      stats,
    });
  };

  const handleExportExcel = () => {
    if (!session || !stats) return;
    generateExcelReport({
      session,
      attempts: sessionAttempts,
      questionAnalysis,
      stats,
      logs: sessionLogs,
    });
  };

  const violationsByStudent = useMemo(() => {
    const map: Record<string, { name: string; count: number; types: Set<string> }> = {};
    sessionLogs.forEach(log => {
      if (!map[log.studentId]) {
        map[log.studentId] = { name: log.studentName, count: 0, types: new Set() };
      }
      map[log.studentId].count++;
      map[log.studentId].types.add(log.type);
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [sessionLogs]);

  const violationLabel = (type: string) => {
    const labels: Record<string, string> = {
      tab_switch: 'Pindah Tab',
      exit_fullscreen: 'Keluar Layar Penuh',
      copy_paste: 'Copy/Paste',
      right_click: 'Klik Kanan',
      mouse_leave: 'Kursor Keluar',
      devtools: 'Developer Tools',
      face_missing: '📷 Wajah Hilang',
      multiple_faces: '👥 Multi-Wajah',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analitik Hasil & Nilai</h2>
          <p className="text-slate-400 text-sm mt-1">Pantau statistik pengerjaan kuis dan unduh laporan nilai.</p>
        </div>
        {selectedSessionId && sessionAttempts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
            <button
              onClick={handlePrintPDF}
              className="px-4 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-bright text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-uir-green-medium/25 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" /> Cetak PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4" /> Ekspor Excel
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-uir-green-dark/25 transition-all active:scale-95"
            >
              <Download className="h-4 w-4" /> Ekspor CSV
            </button>
          </div>
        )}
      </div>

      {/* Session Selector */}
      <div className="glass rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        <select
          value={selectedSessionId}
          onChange={e => setSelectedSessionId(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl glass-input text-sm"
        >
          <option value="">-- Pilih sesi kuis untuk ditampilkan --</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {!selectedSessionId ? (
        <div className="glass rounded-2xl p-12 text-center border border-slate-800">
          <BarChart2 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-300">Pilih Sesi untuk Melihat Analitik</h3>
          <p className="text-slate-400 text-sm mt-1">Gunakan dropdown di atas untuk memilih sesi kuis.</p>
        </div>
      ) : sessionAttempts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-slate-800">
          <Clock className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-300">Belum Ada Pengerjaan Selesai</h3>
          <p className="text-slate-400 text-sm mt-1">Belum ada mahasiswa yang menyelesaikan kuis ini.</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Peserta', value: stats.total, icon: Users, color: 'text-uir-green-muted' },
                { label: 'Rata-rata', value: `${stats.avg}`, icon: TrendingUp, color: 'text-uir-yellow-gold' },
                { label: 'Tertinggi', value: `${stats.max}`, icon: Trophy, color: 'text-emerald-400' },
                { label: 'Terendah', value: `${stats.min}`, icon: TrendingUp, color: 'text-red-400' },
                { label: 'Lulus (≥60)', value: `${stats.passing}/${stats.total}`, icon: CheckCircle, color: 'text-emerald-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass-card rounded-2xl p-4 border border-slate-800/60 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Grade Distribution Chart */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800/60">
            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-uir-green-medium" /> Distribusi Nilai
            </h3>
            <div className="flex items-end justify-center gap-3 h-48">
              {gradeDistribution.map((item) => {
                const heightPct = item.count > 0 ? (item.count / maxDistCount) * 100 : 2;
                const colors = ['bg-red-500', 'bg-orange-500', 'bg-uir-yellow-gold', 'bg-uir-green-medium', 'bg-uir-green-bright'];
                const idx = gradeDistribution.indexOf(item);
                return (
                  <div key={item.range} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-300 font-bold">{item.count}</span>
                    <div
                      className={`w-full rounded-t-lg ${colors[idx]} transition-all duration-700 ease-out opacity-85`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] text-slate-400 text-center">{item.range}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">Rentang Nilai</p>
          </div>

          {/* Question Analysis */}
          {questionAnalysis.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-slate-800/60">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-uir-yellow-gold" /> Analisis Per Soal
              </h3>
              <div className="space-y-3">
                {questionAnalysis.map((item) => (
                  <div key={item.questionId} className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs text-slate-300 flex-1 line-clamp-2">{item.text}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.difficulty === 'easy' ? 'text-emerald-300 bg-emerald-950/40'
                          : item.difficulty === 'medium' ? 'text-amber-300 bg-amber-950/40'
                          : 'text-red-300 bg-red-950/40'
                        }`}>
                          {item.difficulty === 'easy' ? 'Mudah' : item.difficulty === 'medium' ? 'Sedang' : 'Sulit'}
                        </span>
                        <span className="text-sm font-bold text-white">{item.correctRate}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          item.correctRate >= 70 ? 'bg-emerald-500' : item.correctRate >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.correctRate}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">{item.attemptCount} pengerjaan menjawab soal ini</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Violation Logs */}
          {violationsByStudent.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-amber-500/15">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" /> Log Pelanggaran Anti-Cheat
              </h3>
              <div className="space-y-3">
                {violationsByStudent.map(([id, info]) => (
                  <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-amber-950/15 border border-amber-500/15">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{info.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {Array.from(info.types).map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-500/20">
                            {violationLabel(t)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-amber-400">{info.count}</span>
                      <p className="text-[10px] text-slate-400">pelanggaran</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade Table */}
          <div className="glass-card rounded-2xl border border-slate-800/60 overflow-hidden">
            <div className="p-4 border-b border-slate-800/80">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-uir-green-medium" /> Daftar Nilai Mahasiswa
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50">
                  <tr>
                    {['Nama', 'Waktu Mulai', 'Waktu Selesai', 'Benar/Total', 'Skor', 'Keterangan'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sessionAttempts
                    .sort((a, b) => b.score - a.score)
                    .map((att, idx) => (
                      <tr key={att.id} className={`hover:bg-slate-800/20 transition-colors ${idx === 0 ? 'bg-emerald-950/10' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-100">
                          {idx === 0 && <Trophy className="inline h-3.5 w-3.5 text-amber-400 mr-1.5 mb-0.5" />}
                          {att.studentName}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(att.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{att.submitTime ? new Date(att.submitTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{att.correctCount}/{att.totalQuestions}</td>
                        <td className="px-4 py-3">
                          <span className={`text-lg font-bold ${att.score >= 80 ? 'text-uir-yellow-gold' : att.score >= 60 ? 'text-uir-green-muted' : 'text-red-400'}`}>
                            {att.score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            att.score >= 60
                              ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
                              : 'bg-red-950/30 border-red-500/20 text-red-300'
                          }`}>
                            {att.score >= 60 ? 'Lulus' : 'Tidak Lulus'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
