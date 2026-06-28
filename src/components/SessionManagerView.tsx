import React, { useState } from 'react';
import {
  dbSaveSession, dbDeleteSession,
  dbBroadcastSessionNotification, defaultSessionSettings,
} from '../dbService';
import type { QuizSession, ActivityLog, SessionMode } from '../dbService';
import {
  Plus, Trash2, Edit2, X, Calendar, Clock, Lock, Unlock,
  Shield, Copy, CheckCircle, AlertTriangle, Users, BookOpen, Key, Radio, Monitor,
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { LiveHostPanel } from './LiveHostPanel';
import { QRJoinCard } from './QRJoinCard';

export const SessionManagerView: React.FC<{ user?: import('../dbService').User }> = ({ user }) => {
  const {
    sessions,
    questions: allQuestions,
    attempts: allAttempts,
    logs: allLogs,
    users,
    refreshSessions,
    packages
  } = useAppContext();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [timerType, setTimerType] = useState<'per_question' | 'total_session'>('total_session');
  const [perQuestionSeconds, setPerQuestionSeconds] = useState(60);
  const [accessCode, setAccessCode] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>('exam');
  const [isPublic, setIsPublic] = useState(false);
  const [proctorEnabled, setProctorEnabled] = useState(true);
  const [showExplanationMode, setShowExplanationMode] = useState<'never' | 'after_each' | 'after_submit'>('after_submit');
  const [speedBonusEnabled, setSpeedBonusEnabled] = useState(false);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [liveHostSession, setLiveHostSession] = useState<QuizSession | null>(null);
  const [showQRSession, setShowQRSession] = useState<QuizSession | null>(null);

  const generateAccessCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setAccessCode(code);
  };

  const handleOpenNewForm = () => {
    setEditingId(undefined);
    setTitle('');
    setSubject('');
    const now = new Date();
    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    setStartTime(toLocalISO(now));
    setEndTime(toLocalISO(later));
    setDurationMinutes(30);
    setAttemptLimit(1);
    setShuffleQuestions(true);
    setShuffleOptions(true);
    setTimerType('total_session');
    setPerQuestionSeconds(60);
    generateAccessCode();
    setSelectedQuestions([]);
    setSessionMode('exam');
    setProctorEnabled(true);
    setShowExplanationMode('after_submit');
    setSpeedBonusEnabled(false);
    setAdaptiveEnabled(false);
    setTeamsEnabled(false);
    setIsPublic(false);
    setSelectedPackageId('');
    setShowForm(true);
  };

  const handleOpenEditForm = (s: QuizSession) => {
    setEditingId(s.id);
    setTitle(s.title);
    setSubject(s.subject);
    setStartTime(s.startTime.slice(0, 16));
    setEndTime(s.endTime.slice(0, 16));
    setDurationMinutes(s.durationMinutes);
    setAttemptLimit(s.attemptLimit);
    setShuffleQuestions(s.shuffleQuestions);
    setShuffleOptions(s.shuffleOptions);
    setTimerType(s.timerType);
    setPerQuestionSeconds(s.perQuestionSeconds);
    setAccessCode(s.accessCode);
    setSelectedQuestions([...s.questions]);
    setSessionMode(s.sessionMode ?? 'exam');
    setProctorEnabled(s.proctorEnabled ?? true);
    setShowExplanationMode(s.showExplanationMode ?? 'after_submit');
    setSpeedBonusEnabled(s.speedBonusEnabled ?? false);
    setAdaptiveEnabled(s.adaptiveEnabled ?? false);
    setTeamsEnabled(s.teamsEnabled ?? false);
    setIsPublic(s.isPublic ?? false);
    setSelectedPackageId('');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus sesi kuis ini? Semua data pengerjaan terkait akan tetap tersimpan.')) {
      try {
        await dbDeleteSession(id);
        await refreshSessions();
      } catch (err: any) {
        alert('Gagal menghapus sesi: ' + err.message);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !accessCode) { alert('Judul, Mata Kuliah, dan Kode Akses wajib diisi.'); return; }
    if (selectedQuestions.length === 0) { alert('Pilih minimal 1 soal untuk sesi kuis ini.'); return; }

    setIsSaving(true);
    try {
      const modeDefaults = defaultSessionSettings(sessionMode);
      const saved = await dbSaveSession({
        id: editingId,
        title, subject,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMinutes,
        attemptLimit: sessionMode === 'practice' ? 0 : attemptLimit,
        shuffleQuestions, shuffleOptions,
        timerType, perQuestionSeconds,
        accessCode: accessCode.toUpperCase(),
        isClosed: false,
        questions: selectedQuestions,
        isPublic,
        ...modeDefaults,
        sessionMode,
        proctorEnabled: sessionMode === 'exam' ? proctorEnabled : false,
        showExplanationMode: sessionMode === 'practice' ? 'after_each' : showExplanationMode,
        speedBonusEnabled: sessionMode === 'live' ? true : speedBonusEnabled,
        adaptiveEnabled,
        teamsEnabled,
      });
      // Broadcast notification to all mahasiswa when new session is created
      if (!editingId) {
        await dbBroadcastSessionNotification(saved, 'session_open', users);
      }
      setShowForm(false);
      await refreshSessions();
    } catch (err: any) {
      alert('Gagal menyimpan sesi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleQuestion = (qId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const toggleClose = async (session: QuizSession) => {
    try {
      const updated = await dbSaveSession({ ...session, isClosed: !session.isClosed });
      // Broadcast notification when closing a session
      if (!session.isClosed) {
        await dbBroadcastSessionNotification(updated, 'session_close', users);
      } else {
        await dbBroadcastSessionNotification(updated, 'session_open', users);
      }
      await refreshSessions();
    } catch (err: any) {
      alert('Gagal mengubah status sesi: ' + err.message);
    }
  };

  const getSessionStatus = (s: QuizSession) => {
    if (s.isClosed) return { label: 'Ditutup', color: 'text-slate-400 bg-slate-800/60 border-slate-700' };
    const now = new Date();
    if (now < new Date(s.startTime)) return { label: 'Dijadwalkan', color: 'text-amber-300 bg-amber-950/40 border-amber-500/20' };
    if (now > new Date(s.endTime)) return { label: 'Berakhir', color: 'text-slate-400 bg-slate-800/60 border-slate-700' };
    return { label: 'Berlangsung', color: 'text-emerald-300 bg-emerald-950/40 border-emerald-500/20' };
  };

  const getSessionLogs = (sessionId: string): ActivityLog[] => {
    const sessionAttempts = allAttempts.filter(a => a.quizSessionId === sessionId);
    const attemptIds = new Set(sessionAttempts.map(a => a.id));
    return allLogs.filter(l => attemptIds.has(l.attemptId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Manajemen Sesi Kuis</h2>
          <p className="text-slate-400 text-sm mt-1">Buat, atur, dan pantau sesi ujian beserta kode aksesnya.</p>
        </div>
        <button
          onClick={handleOpenNewForm}
          className="px-4 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-bright text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-uir-green-medium/25 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" /> Buat Sesi Baru
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-slate-800">
          <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-300">Belum Ada Sesi Kuis</h3>
          <p className="text-slate-400 text-sm mt-1">Klik "Buat Sesi Baru" untuk memulai sesi ujian pertama Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map(session => {
            const status = getSessionStatus(session);
            const submissionCount = allAttempts.filter(a => a.quizSessionId === session.id && a.status === 'completed').length;
            const sessionLogs = getSessionLogs(session.id);

            return (
              <div key={session.id} className="glass-card rounded-2xl p-5 border border-slate-800/60 hover:border-slate-700/80 transition-all flex flex-col h-full">
                <div className="flex flex-col gap-4 justify-between flex-1">
                  {/* Top: Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${status.color}`}>
                        ● {status.label}
                      </span>
                      <span className="bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-700/50">
                        {session.subject}
                      </span>
                      <span className="bg-uir-green-dark/40 text-uir-green-muted px-2.5 py-1 rounded-full text-xs font-medium border border-uir-green-medium/20">
                        {session.questions.length} Soal
                      </span>
                      <span className="bg-indigo-950/40 text-indigo-300 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-500/20 uppercase">
                        {session.sessionMode ?? 'exam'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{session.title}</h3>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(session.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} —{' '}
                        {new Date(session.endTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {session.durationMinutes > 0 ? `${session.durationMinutes} menit` : 'Tanpa Batas'}
                        {session.timerType === 'per_question' ? ` (${session.perQuestionSeconds}dtk/soal)` : ' total'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {submissionCount} pengiriman
                      </span>
                      {session.attemptLimit > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5" />
                          Maks {session.attemptLimit}x percobaan
                        </span>
                      )}
                    </div>

                    {/* Access Code */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2">
                        <Key className="h-4 w-4 text-uir-yellow-gold" />
                        <span className="font-mono font-bold text-lg text-uir-yellow-gold tracking-[0.15em]">
                          {session.accessCode}
                        </span>
                      </div>
                      <button
                        onClick={() => copyCode(session.accessCode)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-uir-green-medium/30 text-slate-400 hover:text-uir-green-muted transition-colors"
                        title="Salin Kode Akses"
                      >
                        {copiedCode === session.accessCode ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Violation Warnings */}
                    {sessionLogs.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                          Terdeteksi <strong>{sessionLogs.length}</strong> pelanggaran anti-cheat dari{' '}
                          <strong>{new Set(sessionLogs.map(l => l.studentId)).size}</strong> mahasiswa.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Actions */}
                  <div className="flex flex-wrap gap-2 items-center border-t border-slate-800/50 pt-4 mt-auto">
                    {(session.sessionMode === 'live' || session.sessionMode === 'poll') && (
                      <button
                        onClick={() => setLiveHostSession(session)}
                        className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Radio className="h-3.5 w-3.5" /> Host Live
                      </button>
                    )}
                    <button
                      onClick={() => setShowQRSession(session)}
                      className="px-3 py-2 rounded-xl border border-uir-green-medium/30 bg-uir-green-dark/20 text-uir-green-muted text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Monitor className="h-3.5 w-3.5" /> QR Join
                    </button>
                    <button
                      onClick={() => toggleClose(session)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        session.isClosed
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40'
                          : 'bg-red-950/20 border-red-500/30 text-red-400 hover:bg-red-950/40'
                      }`}
                    >
                      {session.isClosed ? <><Unlock className="h-3.5 w-3.5" /> Buka</> : <><Lock className="h-3.5 w-3.5" /> Tutup</>}
                    </button>
                    <button
                      onClick={() => handleOpenEditForm(session)}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-uir-green-muted transition-colors"
                      title="Edit Sesi"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/30 text-red-400 transition-colors"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl w-full max-w-2xl border border-slate-800 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/40 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-uir-yellow-gold" />
                {editingId ? 'Edit Sesi Kuis' : 'Buat Sesi Kuis Baru'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Title & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Judul Sesi Kuis</label>
                  <input type="text" required placeholder="Contoh: UTS Pemrograman Web Ganjil 2024" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Mata Kuliah</label>
                  <input type="text" required placeholder="Contoh: Pemrograman Web" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Kode Akses</label>
                  <div className="flex gap-2">
                    <input type="text" required maxLength={8} placeholder="Kode 6 digit" value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} className="flex-1 px-3 py-2.5 rounded-xl glass-input text-sm font-mono tracking-widest" />
                    <button type="button" onClick={generateAccessCode} className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 transition-colors whitespace-nowrap">
                      Acak
                    </button>
                  </div>
                </div>
              </div>

              {/* Session Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Mode Sesi</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {([
                    ['exam', 'Ujian'],
                    ['live', 'Live'],
                    ['homework', 'PR/Tugas'],
                    ['practice', 'Latihan'],
                    ['poll', 'Poll'],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSessionMode(mode)}
                      className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                        sessionMode === mode
                          ? 'bg-uir-green-medium/20 border-uir-green-medium text-uir-green-muted'
                          : 'border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={proctorEnabled} onChange={e => setProctorEnabled(e.target.checked)} disabled={sessionMode !== 'exam'} />
                  Proctoring
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={speedBonusEnabled} onChange={e => setSpeedBonusEnabled(e.target.checked)} />
                  Bonus Kecepatan
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={adaptiveEnabled} onChange={e => setAdaptiveEnabled(e.target.checked)} />
                  Adaptive Quiz
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={teamsEnabled} onChange={e => setTeamsEnabled(e.target.checked)} />
                  Mode Tim
                </label>
              </div>

              {/* Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Waktu Mulai</label>
                  <input type="datetime-local" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Waktu Berakhir</label>
                  <input type="datetime-local" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
                </div>
              </div>

              {/* Timer & Attempts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Mode Timer</label>
                  <select value={timerType} onChange={e => setTimerType(e.target.value as 'per_question' | 'total_session')} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm">
                    <option value="total_session">Total Sesi</option>
                    <option value="per_question">Per Soal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    {timerType === 'total_session' ? 'Durasi (Menit)' : 'Detik / Soal'}
                  </label>
                  <input
                    type="number" min="0" required
                    value={timerType === 'total_session' ? durationMinutes : perQuestionSeconds}
                    onChange={e => timerType === 'total_session' ? setDurationMinutes(+e.target.value) : setPerQuestionSeconds(+e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Maks Percobaan</label>
                  <input type="number" min="1" value={attemptLimit} onChange={e => setAttemptLimit(+e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
                </div>
              </div>

              {/* Anti-Cheat Toggles */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-4 w-4 text-uir-green-muted" /> Pengaturan Acak & Keamanan
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Sesi Publik (Perpustakaan Kuis)', value: isPublic, onChange: setIsPublic },
                    { label: 'Acak Urutan Soal', value: shuffleQuestions, onChange: setShuffleQuestions },
                    { label: 'Acak Opsi Jawaban', value: shuffleOptions, onChange: setShuffleOptions },
                  ].map(({ label, value, onChange }) => (
                    <button
                      key={label} type="button"
                      onClick={() => onChange(!value)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                        value ? 'bg-uir-green-medium/10 border-uir-green-medium/40 text-uir-green-muted' : 'bg-slate-900/50 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded flex items-center justify-center border ${value ? 'bg-uir-green-medium border-uir-green-medium' : 'border-slate-600'}`}>
                        {value && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Pilih Paket Soal atau Pilih Manual <span className="text-uir-yellow-gold">({selectedQuestions.length} dipilih)</span>
                </label>
                
                <div className="mb-3">
                  <select
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                    value={selectedPackageId}
                    onChange={(e) => {
                      setSelectedPackageId(e.target.value);
                      if (e.target.value) {
                        const pkg = packages.find(p => p.id === e.target.value);
                        if (pkg) setSelectedQuestions(pkg.questions);
                      } else {
                        setSelectedQuestions([]);
                      }
                    }}
                  >
                    <option value="">Pilih dari Paket Soal (Opsional)</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>{pkg.title} ({pkg.questions.length} Soal)</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {allQuestions.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Belum ada soal. Tambahkan soal di Bank Soal terlebih dahulu.
                    </div>
                  ) : allQuestions.map(q => (
                    <button
                      key={q.id} type="button"
                      onClick={() => toggleQuestion(q.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedQuestions.includes(q.id)
                          ? 'bg-uir-green-medium/10 border-uir-green-medium/30 text-uir-green-muted'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className={`h-4 w-4 mt-0.5 rounded border shrink-0 flex items-center justify-center ${
                        selectedQuestions.includes(q.id) ? 'bg-uir-green-medium border-uir-green-medium' : 'border-slate-600'
                      }`}>
                        {selectedQuestions.includes(q.id) && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{q.text}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] text-slate-500">{q.subject} · {q.topic}</span>
                          <span className={`text-[10px] font-bold ${q.difficulty === 'easy' ? 'text-emerald-400' : q.difficulty === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                            {q.difficulty === 'easy' ? '● Mudah' : q.difficulty === 'medium' ? '● Sedang' : '● Sulit'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-850">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-bright text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {liveHostSession && (
        <LiveHostPanel
          session={liveHostSession}
          user={user ?? users.find(u => u.role === 'dosen') ?? users[0]}
          onClose={() => setLiveHostSession(null)}
        />
      )}

      {showQRSession && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQRSession(null)}>
          <div className="glass rounded-3xl p-6 border border-slate-800" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 text-center">QR Code Join — {showQRSession.title}</h3>
            <QRJoinCard session={showQRSession} />
            <button onClick={() => setShowQRSession(null)} className="w-full mt-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
};

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
