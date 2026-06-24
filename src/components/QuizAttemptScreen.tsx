import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  dbStartAttempt, dbSaveAttemptAnswers, dbSubmitAttempt, dbAddActivityLog
} from '../dbService';
import type { QuizSession, Question, Attempt, User } from '../dbService';
import {
  Clock, Shield, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft,
  Send, Maximize, CornerUpLeft, X, Link2
} from 'lucide-react';
import { WebcamProctor } from './WebcamProctor';
import { useAppContext } from '../AppContext';

// ─── Matching Question Sub-Component (extracted to respect Rules of Hooks) ────
interface MatchingQuestionProps {
  question: Question;
  answers: Record<string, string>;
  onAnswer: (qId: string, value: string) => void;
}

const MatchingQuestion: React.FC<MatchingQuestionProps> = ({ question, answers, onAnswer }) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const pairs = (question.options || []).map(o => {
    const [left, right] = o.split('|');
    return { left: left?.trim() || '', right: right?.trim() || '' };
  }).filter(p => p.left && p.right);

  const rightItems = [...pairs.map(p => p.right)].sort(() => 0);

  let currentMap: Record<string, string> = {};
  try {
    if (answers[question.id]) {
      currentMap = JSON.parse(answers[question.id]);
    }
  } catch { currentMap = {}; }

  const handleMatchClick = (side: 'left' | 'right', item: string) => {
    if (side === 'left') {
      setSelectedLeft(prev => prev === item ? null : item);
    } else {
      if (!selectedLeft) return;
      const newMap = { ...currentMap };
      Object.keys(newMap).forEach(k => {
        if (newMap[k] === item) delete newMap[k];
      });
      newMap[selectedLeft] = item;
      setSelectedLeft(null);
      onAnswer(question.id, JSON.stringify(newMap));
    }
  };

  const unmatchLeft = (left: string) => {
    const newMap = { ...currentMap };
    delete newMap[left];
    onAnswer(question.id, JSON.stringify(newMap));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 mb-2">Klik item di kolom kiri, lalu klik pasangannya di kanan untuk menjodohkan.</p>
      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Kolom A</p>
          {pairs.map(({ left }) => {
            const isSelected = selectedLeft === left;
            const matched = currentMap[left];
            return (
              <button
                key={left}
                onClick={() => handleMatchClick('left', left)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-uir-green-medium/20 border-uir-green-medium text-white ring-2 ring-uir-green-medium/40'
                    : matched
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span>{left}</span>
                {matched && (
                  <div className="flex items-center gap-1 mt-1">
                    <Link2 className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">{matched}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); unmatchLeft(left); }}
                      className="ml-auto text-slate-500 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Kolom B</p>
          {rightItems.map((right) => {
            const isUsed = Object.values(currentMap).includes(right);
            const isTarget = selectedLeft !== null;
            return (
              <button
                key={right}
                onClick={() => handleMatchClick('right', right)}
                disabled={!isTarget && !isUsed}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  isUsed
                    ? 'bg-slate-800/40 border-slate-700/40 text-slate-500 line-through cursor-not-allowed opacity-60'
                    : isTarget
                      ? 'bg-uir-green-darker/30 border-uir-green-medium/50 text-white hover:bg-uir-green-medium/20 cursor-pointer'
                      : 'bg-slate-900/40 border-slate-700 text-slate-300'
                }`}
              >
                {right}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface QuizAttemptScreenProps {
  user: User;
  onBack: () => void;
}

type QuizPhase = 'lobby' | 'in_progress' | 'finished';

export const QuizAttemptScreen: React.FC<QuizAttemptScreenProps> = ({ user, onBack }) => {
  const {
    sessions,
    attempts,
    questions: allQuestionsFromDB,
    refreshAttempts,
    refreshLogs
  } = useAppContext();

  const [phase, setPhase] = useState<QuizPhase>('lobby');
  const [accessCode, setAccessCode] = useState('');
  const [lobbyError, setLobbyError] = useState('');

  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Anti-cheat states
  const [violations, setViolations] = useState<string[]>([]);
  const [showViolationBanner, setShowViolationBanner] = useState(false);
  const violationBannerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Finished attempt
  const [finalAttempt, setFinalAttempt] = useState<Attempt | null>(null);

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  // ─── Anti-cheat Listeners ─────────────────────────────────────────────────
  const logViolation = useCallback(async (type: 'tab_switch' | 'exit_fullscreen' | 'copy_paste' | 'right_click' | 'mouse_leave' | 'devtools' | 'face_missing' | 'multiple_faces', msg: string) => {
    if (!attempt) return;
    try {
      await dbAddActivityLog(attempt.id, user.id, user.name, type, msg);
      await refreshLogs();
    } catch (err) {
      console.error('Gagal menyimpan log aktivitas:', err);
    }
    setViolations(v => [...v, msg]);
    setShowViolationBanner(true);
    if (violationBannerRef.current) clearTimeout(violationBannerRef.current);
    violationBannerRef.current = setTimeout(() => setShowViolationBanner(false), 4000);
  }, [attempt, user, refreshLogs]);

  useEffect(() => {
    if (phase !== 'in_progress') return;

    const onVisChange = () => {
      if (document.hidden) logViolation('tab_switch', 'Mahasiswa berpindah/menutup tab browser');
    };
    const onBlur = () => logViolation('tab_switch', 'Fokus browser berpindah ke luar jendela kuis');
    const onContextMenu = (e: MouseEvent) => { e.preventDefault(); logViolation('right_click', 'Aksi klik kanan terdeteksi'); };
    const onCopy  = () => logViolation('copy_paste', 'Mahasiswa menyalin teks (Ctrl+C / copy)');
    const onPaste = () => logViolation('copy_paste', 'Mahasiswa menempelkan teks (Ctrl+V / paste)');
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        logViolation('exit_fullscreen', 'Mahasiswa keluar dari mode layar penuh');
      } else {
        setIsFullscreen(true);
      }
    };
    // Tahap 4: mouse leave window detection
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        logViolation('mouse_leave', 'Kursor mouse keluar dari area jendela browser');
      }
    };
    // Tahap 4: developer tools keyboard shortcut detection
    const onKeyDown = (e: KeyboardEvent) => {
      const isDevTools =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'U');
      if (isDevTools) {
        e.preventDefault();
        logViolation('devtools', `Shortcut developer tools terdeteksi: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`);
      }
    };

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy',  onCopy  as EventListener);
    document.addEventListener('paste', onPaste as EventListener);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy',  onCopy  as EventListener);
      document.removeEventListener('paste', onPaste as EventListener);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [phase, logViolation]);

  // ─── Timer ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'in_progress' || !session) return;

    if (session.timerType === 'total_session' && session.durationMinutes > 0) {
      setTimeLeft(session.durationMinutes * 60);
    } else if (session.timerType === 'per_question') {
      setTimeLeft(session.perQuestionSeconds);
    } else {
      return; // no timer
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (session.timerType === 'total_session') {
            handleSubmit();
          } else {
            // auto-advance question on per-question timer expiry
            setCurrentIdx(ci => {
              if (ci + 1 < questions.length) {
                return ci + 1;
              } else {
                handleSubmit();
                return ci;
              }
            });
            return session.perQuestionSeconds;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, session, questions.length]);

  // Reset per-question timer on question change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'in_progress' || !session || session.timerType !== 'per_question') return;
    setTimeLeft(session.perQuestionSeconds);
  }, [currentIdx, phase, session]);

  // ─── Lobby: Join Quiz ─────────────────────────────────────────────────────
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLobbyError('');

    const found = sessions.find(s => s.accessCode === accessCode.trim().toUpperCase());

    if (!found) { setLobbyError('Kode akses tidak valid. Periksa kembali kode dari dosen Anda.'); return; }
    if (found.isClosed) { setLobbyError('Sesi kuis ini telah ditutup oleh dosen.'); return; }
    const now = new Date();
    if (now < new Date(found.startTime)) { setLobbyError('Sesi kuis ini belum dimulai. Silakan tunggu.'); return; }
    if (now > new Date(found.endTime)) { setLobbyError('Sesi kuis ini telah berakhir.'); return; }

    let sessionQ = found.questions.map(qId => allQuestionsFromDB.find(q => q.id === qId)!).filter(Boolean);

    if (found.shuffleQuestions) {
      sessionQ = sessionQ.sort(() => Math.random() - 0.5);
    }

    if (found.shuffleOptions) {
      sessionQ = sessionQ.map(q => {
        if (q.type === 'multiple_choice' && q.options) {
          const shuffled = [...q.options].sort(() => Math.random() - 0.5);
          return { ...q, options: shuffled };
        }
        return q;
      });
    }

    try {
      const newAttempt = await dbStartAttempt(found.id, user.id, user.name, sessions, attempts);
      setSession(found);
      setQuestions(sessionQ);
      setAttempt(newAttempt);
      setAnswers({});
      setCurrentIdx(0);
      setViolations([]);
      setPhase('in_progress');
      await refreshAttempts();
    } catch (err: any) {
      setLobbyError(err.message || 'Gagal memulai kuis.');
    }
  };

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
  };

  // ─── In-Progress: Answer & Navigate ──────────────────────────────────────
  const handleAnswer = async (qId: string, value: string) => {
    const newAnswers = { ...answers, [qId]: value };
    setAnswers(newAnswers);
    if (attempt) {
      try {
        await dbSaveAttemptAnswers(attempt.id, newAnswers);
        await refreshAttempts();
      } catch (err) {
        console.error('Gagal menyimpan jawaban:', err);
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!attempt) return;
    try {
      const final = await dbSubmitAttempt(attempt.id, sessions, allQuestionsFromDB, attempts);
      setFinalAttempt(final);
      if (document.fullscreenElement) document.exitFullscreen();
      setPhase('finished');
      await refreshAttempts();
    } catch (err) {
      console.error(err);
    }
  }, [attempt, sessions, allQuestionsFromDB, attempts, refreshAttempts]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timeWarning = session?.timerType === 'total_session'
    ? timeLeft < 120
    : timeLeft < session?.perQuestionSeconds! * 0.3;

  // ─── Phase: Lobby ─────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    const myAttempts = attempts.filter((a: Attempt) => a.studentId === user.id && a.status === 'completed');
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-white">Ikuti Kuis</h2>
          <p className="text-slate-400 text-sm mt-1">Masukkan kode akses dari dosen untuk memulai ujian.</p>
        </div>

        {/* Join Form */}
        <div className="glass rounded-2xl p-6 border border-slate-800">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Kode Akses Kuis</label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="Contoh: WEB101"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3.5 rounded-xl glass-input text-xl font-mono tracking-[0.2em] text-center uppercase"
              />
            </div>
            {lobbyError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />{lobbyError}
              </div>
            )}
            <div className="p-3 bg-uir-green-darker/20 border border-uir-green-medium/10 rounded-xl text-xs text-uir-green-muted flex items-center gap-2">
              <Maximize className="h-4 w-4 shrink-0" />
              Kuis akan berjalan dalam mode <strong>layar penuh</strong>. Keluar layar penuh akan dicatat sebagai pelanggaran.
            </div>
            <button type="submit" className="w-full py-3 bg-uir-green-medium hover:bg-uir-green-dark text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-uir-green-dark/25 transition-all active:scale-[0.98]">
              <ChevronRight className="h-5 w-5" /> Masuk & Mulai Kuis
            </button>
          </form>
        </div>

        {/* My History */}
        {myAttempts.length > 0 && (
          <div className="glass rounded-2xl p-5 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Riwayat Pengerjaan Saya</h3>
            <div className="space-y-2">
              {myAttempts.slice().reverse().slice(0, 5).map(att => {
                const sess = sessions.find((s: QuizSession) => s.id === att.quizSessionId);
                return (
                  <div key={att.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{sess?.title || 'Sesi Tidak Diketahui'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{att.submitTime ? new Date(att.submitTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${att.score >= 80 ? 'text-uir-yellow-gold' : att.score >= 60 ? 'text-uir-green-muted' : 'text-red-400'}`}>{att.score}</span>
                      <p className="text-[10px] text-slate-400">{att.correctCount}/{att.totalQuestions} benar</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Phase: In Progress ───────────────────────────────────────────────────
  if (phase === 'in_progress' && session && currentQuestion) {
    const hasTimer = session.timerType === 'total_session'
      ? session.durationMinutes > 0
      : true;

    return createPortal(
      <div className="fixed inset-0 bg-slate-950 flex flex-col" style={{ zIndex: 9999 }}>
        {/* Violation Banner */}
        {showViolationBanner && (
          <div className="absolute top-16 left-1/2 z-50 px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl shadow-2xl shadow-red-500/40 flex items-center gap-3 text-sm font-semibold animate-violation-slide border border-red-400/30">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            <span>⚠️ Pelanggaran terdeteksi! Aktivitas ini dicatat.</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/80 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <Shield className={`h-5 w-5 ${violations.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
            <div>
              <p className="text-sm font-bold text-white line-clamp-1 max-w-xs">{session.title}</p>
              <p className="text-xs text-slate-400">{answeredCount}/{questions.length} dijawab • {violations.length} pelanggaran</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isFullscreen && (
              <button onClick={requestFullscreen} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-600/25">
                <Maximize className="h-3.5 w-3.5" /> Layar Penuh
              </button>
            )}
            {hasTimer && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${timeWarning ? 'bg-red-950/40 border border-red-500/40 text-red-300 animate-pulse' : 'bg-slate-800/60 border border-slate-700 text-slate-100'}`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Question Nav Sidebar */}
          <div className="hidden md:flex flex-col w-48 bg-slate-900/60 border-r border-slate-800 p-3 gap-1 overflow-y-auto shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Navigasi Soal</p>
            {questions.map((q, idx) => {
              const answered = !!answers[q.id];
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent ? 'bg-uir-green-medium text-white'
                    : answered ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="font-bold">Soal {idx + 1}</span>
                  {answered && !isCurrent && <CheckCircle className="h-3 w-3 inline ml-1.5 text-emerald-400" />}
                </button>
              );
            })}
          </div>

          {/* Question Area */}
          <div className="flex-1 flex flex-col p-5 md:p-8 overflow-y-auto">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Soal <span className="font-bold text-white">{currentIdx + 1}</span> dari {questions.length}</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                  currentQuestion.difficulty === 'easy' ? 'text-emerald-300 bg-emerald-950/50 border border-emerald-500/20'
                  : currentQuestion.difficulty === 'medium' ? 'text-amber-300 bg-amber-950/50 border border-amber-500/20'
                  : 'text-red-300 bg-red-950/50 border border-red-500/20'
                }`}>
                  {currentQuestion.difficulty === 'easy' ? '● Mudah' : currentQuestion.difficulty === 'medium' ? '● Sedang' : '● Sulit'}
                </span>
              </div>
              <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${((currentIdx + 1) / questions.length) * 100}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)'
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">{answeredCount} dijawab</span>
                <span className="text-[10px] text-slate-500">{questions.length - answeredCount} belum</span>
              </div>
            </div>

            {/* Question */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800/60 mb-5">
              <p className="text-lg md:text-xl font-semibold text-slate-50 leading-relaxed select-none">
                {currentQuestion.text}
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 flex-1">
              {currentQuestion.type === 'multiple_choice' && currentQuestion.options?.map((opt, idx) => {
                const label = String.fromCharCode(65 + idx);
                const selected = answers[currentQuestion.id] === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(currentQuestion.id, opt)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3 ${
                      selected
                        ? 'bg-uir-green-medium/15 border-uir-green-medium text-white shadow-lg shadow-uir-green-dark/10'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
                  >
                    <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border ${selected ? 'bg-uir-green-medium border-uir-green-medium text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {label}
                    </span>
                    <span className="font-medium">{opt}</span>
                    {selected && <CheckCircle className="ml-auto h-5 w-5 text-uir-yellow-gold" />}
                  </button>
                );
              })}

              {currentQuestion.type === 'boolean' && ['true', 'false'].map(val => {
                const selected = answers[currentQuestion.id] === val;
                return (
                  <button
                    key={val}
                    onClick={() => handleAnswer(currentQuestion.id, val)}
                    className={`w-full text-left p-5 rounded-2xl border text-base font-bold transition-all ${
                      selected
                        ? val === 'true'
                          ? 'bg-emerald-600/15 border-emerald-500 text-emerald-200'
                          : 'bg-red-600/15 border-red-500 text-red-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {val === 'true' ? '✓ BENAR' : '✗ SALAH'}
                  </button>
                );
              })}

              {currentQuestion.type === 'matching' && (
                <MatchingQuestion
                  question={currentQuestion}
                  answers={answers}
                  onAnswer={handleAnswer}
                />
              )}
              
              {currentQuestion.type === 'essay' && (
                <textarea
                  rows={4}
                  placeholder="Ketikkan jawaban Anda di sini..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-base resize-none"
                />
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 gap-3">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(i => i - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold disabled:opacity-40 hover:bg-slate-700 transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(i => i + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold shadow-lg shadow-uir-green-dark/20 transition-all"
                >
                  Selanjutnya <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (answeredCount < questions.length) {
                      if (!confirm(`Anda baru menjawab ${answeredCount} dari ${questions.length} soal. Yakin ingin mengumpulkan?`)) return;
                    }
                    handleSubmit();
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Send className="h-4 w-4" /> Kumpulkan Jawaban
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Webcam Proctor – picture-in-picture overlay */}
        {attempt && (
          <WebcamProctor
            attempt={attempt}
            user={user}
            enabled={phase === 'in_progress'}
          />
        )}
      </div>,
      document.body
    );
  }

  // ─── Phase: Finished ──────────────────────────────────────────────────────
  if (phase === 'finished' && finalAttempt) {
    const passed = finalAttempt.score >= 60;
    const isExcellent = finalAttempt.score >= 85;
    const mySession = sessions.find((s: QuizSession) => s.id === finalAttempt.quizSessionId);
    const sessionQ = mySession
      ? mySession.questions.map((id: string) => allQuestionsFromDB.find((q: Question) => q.id === id)).filter(Boolean) as Question[]
      : [];

    // Confetti pieces for high scores
    const confettiColors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4'];
    const confettiPieces = isExcellent ? Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: confettiColors[i % confettiColors.length],
      duration: `${2 + Math.random() * 2}s`,
      delay: `${Math.random() * 1.5}s`,
      width: `${6 + Math.random() * 8}px`,
    })) : [];

    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        {/* Confetti for excellent scores */}
        {isExcellent && (
          <div className="confetti-container">
            {confettiPieces.map(p => (
              <div
                key={p.id}
                className="confetti-piece"
                style={{
                  left: p.left,
                  backgroundColor: p.color,
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                  width: p.width,
                  height: p.width,
                }}
              />
            ))}
          </div>
        )}

        {/* Score Card */}
        <div className={`glass-premium rounded-3xl p-8 border text-center animate-card-reveal ${
          isExcellent ? 'border-amber-500/30 glow-blue' : passed ? 'border-emerald-500/30' : 'border-red-500/30'
        }`}>
          <div className={`inline-flex p-5 rounded-2xl mb-4 ${
            isExcellent ? 'bg-gradient-to-br from-amber-500/20 to-yellow-600/10'
            : passed ? 'bg-emerald-600/10' : 'bg-red-600/10'
          }`}>
            {passed ? <CheckCircle className={`h-14 w-14 ${isExcellent ? 'text-amber-400' : 'text-emerald-400'}`} /> : <X className="h-14 w-14 text-red-400" />}
          </div>
          <h2 className="text-2xl font-black text-white mb-1">
            {isExcellent ? '🏆 Luar Biasa!' : passed ? '🎉 Selamat! Kuis Selesai' : 'Kuis Selesai'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">{mySession?.title}</p>

          <div className={`text-9xl font-black mb-4 animate-score-reveal ${
            isExcellent ? 'gradient-text-amber' : passed ? 'score-gradient-pass' : 'score-gradient-fail'
          }`}>
            {finalAttempt.score}
          </div>

          <div className="flex justify-center gap-8 text-sm text-slate-300 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{finalAttempt.correctCount}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Benar</div>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{finalAttempt.totalQuestions - finalAttempt.correctCount}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Salah</div>
            </div>
            {violations.length > 0 && (
              <>
                <div className="w-px bg-slate-700" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{violations.length}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Pelanggaran</div>
                </div>
              </>
            )}
          </div>

          <span className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider border ${
            isExcellent ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            : passed ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950/30 border-red-500/30 text-red-300'
          }`}>
            {isExcellent ? '⭐ NILAI SEMPURNA' : passed ? 'LULUS' : 'TIDAK LULUS'}
          </span>
        </div>

        {/* Answer Review */}
        {sessionQ.length > 0 && (
          <div className="glass rounded-2xl border border-slate-800">
            <div className="p-4 border-b border-slate-800/80">
              <h3 className="text-sm font-semibold text-white">Pembahasan Jawaban</h3>
            </div>
            <div className="p-4 space-y-4">
              {sessionQ.map((q, idx) => {
                const myAns = (finalAttempt.answers[q.id] || '').trim().toLowerCase();
                const correct = q.correctAnswer.trim().toLowerCase();
                const isRight = myAns === correct;
                return (
                  <div key={q.id} className={`p-4 rounded-xl border ${isRight ? 'bg-emerald-950/10 border-emerald-500/15' : 'bg-red-950/10 border-red-500/15'}`}>
                    <p className="text-xs font-bold text-slate-400 mb-1">Soal {idx + 1}</p>
                    <p className="text-slate-100 text-sm font-medium mb-3">{q.text}</p>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span>
                        Jawaban Anda:{' '}
                        <strong className={isRight ? 'text-emerald-400' : 'text-red-400'}>
                          {finalAttempt.answers[q.id] || '(tidak dijawab)'}
                        </strong>
                      </span>
                      {!isRight && (
                        <span>
                          Kunci Jawaban:{' '}
                          <strong className="text-emerald-400">{q.correctAnswer}</strong>
                        </span>
                      )}
                    </div>
                    {q.explanation && (
                      <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/50 pt-2">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={onBack} className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
          <CornerUpLeft className="h-4 w-4" /> Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return null;
};
