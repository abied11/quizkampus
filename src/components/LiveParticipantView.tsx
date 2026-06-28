import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { QuizSession, Question, Attempt, User } from '../dbService';
import { dbSaveAttemptAnswers, dbSubmitAttempt, dbGetUsersByIds } from '../dbService';
import { useAppContext } from '../hooks/useAppContext';
import { KAHOOt_COLORS, isAnswerCorrect } from '../utils/scoring';
import { playCorrectSound, playWrongSound, playJoinSound, playQuizMusic, stopQuizMusic, isQuizMusicEnabled, setQuizMusicEnabled, isSoundEnabled, setSoundEnabled } from '../utils/sounds';
import { speakQuestion, stopSpeaking, isTTSEnabled, setTTSEnabled, isTTSSupported, initTTS } from '../utils/tts';
import { UserAvatar } from './UserAvatar';
import { Clock, Radio, CheckCircle, Volume2, VolumeX, Music, Music2, Mic, MicOff } from 'lucide-react';

interface LiveParticipantViewProps {
  session: QuizSession;
  questions: Question[];
  attempt: Attempt;
  user: User;
  onFinish: (final: Attempt) => void;
}

export const LiveParticipantView: React.FC<LiveParticipantViewProps> = ({
  session, questions, attempt, user, onFinish,
}) => {
  const { sessions, attempts, refreshSessions, refreshAttempts } = useAppContext();
  const [liveSession, setLiveSession] = useState(session);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(session.perQuestionSeconds || 30);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [musicOn, setMusicOn] = useState(isQuizMusicEnabled());
  const [ttsOn, setTtsOn] = useState(isTTSEnabled);
  const [participantUsers, setParticipantUsers] = useState<Record<string, User>>({});

  const currentQ = questions[liveSession.currentQuestionIndex];
  const prevPhaseRef = useRef<string>(liveSession.livePhase);
  const prevQIdxRef = useRef<number>(liveSession.currentQuestionIndex);
  const finishedRef = useRef(false);
  const answersSaved = useRef<Record<string, string>>({});

  // Init TTS
  useEffect(() => { initTTS(); }, []);

  // Play join sound on mount
  useEffect(() => { playJoinSound(); }, []);

  // Load participant users for waiting room
  useEffect(() => {
    const liveAttempts = attempts.filter(a => a.quizSessionId === session.id);
    const ids = [...new Set(liveAttempts.map(a => a.studentId))];
    if (!ids.length) return;
    dbGetUsersByIds(ids).then(users => {
      const map: Record<string, User> = {};
      users.forEach(u => { map[u.id] = u; });
      setParticipantUsers(map);
    }).catch(() => {});
  }, [attempts, session.id]);

  // Sync session from context
  useEffect(() => {
    const updated = sessions.find(s => s.id === session.id);
    if (updated) setLiveSession(updated);
  }, [sessions, session.id]);

  // Polling — 1.5s for faster response
  useEffect(() => {
    const interval = setInterval(() => refreshSessions(), 1500);
    return () => clearInterval(interval);
  }, [refreshSessions]);

  // Reset answer + TTS on question change (only when question actually changes)
  useEffect(() => {
    if (prevQIdxRef.current === liveSession.currentQuestionIndex && prevPhaseRef.current === liveSession.livePhase) return;

    const qChanged = prevQIdxRef.current !== liveSession.currentQuestionIndex;
    prevQIdxRef.current = liveSession.currentQuestionIndex;
    prevPhaseRef.current = liveSession.livePhase;

    if (qChanged) {
      // Only reset answer if we truly moved to a new question
      setSelectedAnswer(null);
      setSaveError('');
      setTimeLeft(session.perQuestionSeconds || 30);
      setRevealed(false);

      // Auto-read question via TTS
      if (liveSession.livePhase === 'question' && currentQ) {
        stopSpeaking();
        setTimeout(() => speakQuestion(currentQ.text), 600);
      }
    }

    if (liveSession.livePhase === 'reveal') setRevealed(true);
  }, [liveSession.currentQuestionIndex, liveSession.livePhase, currentQ, session.perQuestionSeconds]);

  // Also set revealed when phase changes to reveal without idx change
  useEffect(() => {
    if (liveSession.livePhase === 'reveal') setRevealed(true);
  }, [liveSession.livePhase]);

  // Timer countdown
  useEffect(() => {
    if (liveSession.livePhase !== 'question' || !currentQ) return;
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [liveSession.livePhase, liveSession.currentQuestionIndex, currentQ]);

  // Handle session finish
  useEffect(() => {
    if (liveSession.livePhase === 'finished' && !finishedRef.current) {
      finishedRef.current = true;
      stopSpeaking();
      stopQuizMusic();
      dbSubmitAttempt(attempt.id, sessions, questions, attempts).then(onFinish);
    }
  }, [liveSession.livePhase, attempt.id, sessions, questions, attempts, onFinish]);

  // Music
  useEffect(() => {
    if (musicOn && liveSession.livePhase === 'question') playQuizMusic();
    else stopQuizMusic();
    return () => stopQuizMusic();
  }, [musicOn, liveSession.livePhase]);

  const handleAnswer = useCallback(async (value: string) => {
    // Prevent double answer or answer after phase ended
    if (selectedAnswer || liveSession.livePhase !== 'question' || !currentQ || savingAnswer) return;

    setSelectedAnswer(value);
    setSaveError('');
    setSavingAnswer(true);

    const newAnswers = { ...answersSaved.current, [currentQ.id]: value };
    answersSaved.current = newAnswers;

    const meta = {
      ...attempt.answersMeta,
      [currentQ.id]: { answeredAt: new Date().toISOString(), timeSpentMs: (session.perQuestionSeconds - timeLeft) * 1000 },
    };

    try {
      await dbSaveAttemptAnswers(attempt.id, newAnswers, meta);
      await refreshAttempts();
    } catch (err) {
      setSaveError('Jawaban gagal tersimpan. Coba lagi.');
      console.error('Save answer error:', err);
    } finally {
      setSavingAnswer(false);
    }

    if (session.sessionMode !== 'poll' && isAnswerCorrect(currentQ, value)) playCorrectSound();
    else if (session.sessionMode !== 'poll') playWrongSound();
  }, [selectedAnswer, liveSession.livePhase, currentQ, savingAnswer, attempt, session, timeLeft, refreshAttempts]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
  };

  const toggleMusic = () => {
    const next = !musicOn;
    setQuizMusicEnabled(next);
    setMusicOn(next);
    if (next) playQuizMusic();
    else stopQuizMusic();
  };

  const toggleTTS = () => {
    const next = !ttsOn;
    setTTSEnabled(next);
    setTtsOn(next);
    if (!next) stopSpeaking();
    else if (currentQ && liveSession.livePhase === 'question') speakQuestion(currentQ.text);
  };

  // ── Controls bar ──────────────────────────────────────────────────────────
  const ControlBar = () => (
    <div className="flex items-center gap-2">
      {isTTSSupported() && (
        <button
          onClick={toggleTTS}
          className={`p-2 rounded-lg transition-all btn-press ${ttsOn ? 'bg-uir-green-medium/20 text-uir-green-muted border border-uir-green-medium/40' : 'bg-slate-800/60 text-slate-500'}`}
          title={ttsOn ? 'Matikan pembaca soal' : 'Aktifkan pembaca soal (TTS)'}
        >
          {ttsOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
      )}
      <button
        onClick={toggleMusic}
        className={`p-2 rounded-lg transition-all btn-press ${musicOn ? 'bg-uir-green-medium/20 text-uir-green-muted border border-uir-green-medium/40' : 'bg-slate-800/60 text-slate-500'}`}
        title={musicOn ? 'Matikan musik' : 'Nyalakan musik latar'}
      >
        {musicOn ? <Music className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
      </button>
      <button
        onClick={toggleSound}
        className={`p-2 rounded-lg transition-all btn-press ${soundOn ? 'bg-slate-700 text-slate-300' : 'bg-slate-800/60 text-slate-500'}`}
        title={soundOn ? 'Matikan efek suara' : 'Nyalakan efek suara'}
      >
        {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </div>
  );

  // ── Waiting Room ───────────────────────────────────────────────────────────
  if (liveSession.livePhase === 'waiting') {
    const liveAttempts = attempts.filter(a => a.quizSessionId === session.id);
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6">
        {/* Header controls */}
        <div className="absolute top-4 right-4">
          <ControlBar />
        </div>

        {/* User avatar */}
        <div className="mb-6 animate-float">
          <UserAvatar user={user} size="lg" className="ring-4 ring-uir-green-medium/40 shadow-xl shadow-uir-green-dark/30" />
        </div>

        <Radio className="h-10 w-10 text-uir-green-medium animate-pulse mb-4" />
        <h2 className="text-2xl font-bold text-white mb-1">Menunggu Host...</h2>
        <p className="text-slate-400 text-sm mb-2">Dosen akan memulai kuis sebentar lagi</p>
        <p className="text-uir-yellow-gold font-mono font-bold mt-2">{user.name}</p>
        <p className="text-slate-500 text-xs mt-1">{user.class}</p>

        {/* Participant list */}
        {liveAttempts.length > 0 && (
          <div className="mt-8 w-full max-w-sm">
            <p className="text-xs text-slate-500 text-center mb-3 uppercase tracking-wider">
              {liveAttempts.length} peserta bergabung
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {liveAttempts.map(a => {
                const u = participantUsers[a.studentId];
                return (
                  <div key={a.id} className="participant-card">
                    <UserAvatar
                      user={{ name: a.studentName, profilePhotoUrl: u?.profilePhotoUrl }}
                      size="sm"
                    />
                    <span className="text-xs text-slate-300 truncate font-medium">{a.studentName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Leaderboard Phase ────────────────────────────────────────────────────
  if (liveSession.livePhase === 'leaderboard') {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="absolute top-4 right-4"><ControlBar /></div>
        <div className="text-6xl animate-bounce mb-4">🏆</div>
        <h2 className="text-xl font-bold text-white mb-1">Papan Peringkat</h2>
        <p className="text-slate-400 text-sm">Lihat papan peringkat di layar dosen...</p>
      </div>
    );
  }

  if (!currentQ) return null;

  // ── Question Phase ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} size="sm" className="avatar-ring-green" />
          <div>
            <span className="text-sm text-slate-400">Soal {liveSession.currentQuestionIndex + 1}/{questions.length}</span>
            <p className="text-xs text-slate-600">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ControlBar />
          {liveSession.livePhase === 'question' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 font-mono font-bold text-white">
              <Clock className="h-4 w-4" /> {timeLeft}s
            </div>
          )}
        </div>
      </div>

      {/* Question */}
      <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8 max-w-2xl mx-auto">
        {currentQ.text}
      </h2>

      {/* Save error */}
      {saveError && (
        <div className="text-center text-xs text-red-400 mb-3 px-4 py-2 rounded-xl bg-red-950/30 border border-red-500/20 max-w-md mx-auto">
          ⚠️ {saveError}
          <button onClick={() => selectedAnswer && handleAnswer(selectedAnswer)} className="ml-3 underline">Coba Lagi</button>
        </div>
      )}

      {/* Answer Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full flex-1">
        {(currentQ.options ?? []).map((opt, i) => {
          const color = KAHOOt_COLORS[i % KAHOOt_COLORS.length];
          const isSelected = selectedAnswer === opt;
          const isCorrect = revealed && opt === currentQ.correctAnswer;
          const isWrong = revealed && isSelected && opt !== currentQ.correctAnswer;
          return (
            <button
              key={opt}
              disabled={!!selectedAnswer && !saveError}
              onClick={() => handleAnswer(opt)}
              className={`p-6 rounded-2xl text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] btn-press ${
                isCorrect ? 'ring-4 ring-emerald-400 brightness-110' : isWrong ? 'ring-4 ring-red-400 opacity-70' : ''
              } ${savingAnswer && isSelected ? 'opacity-70' : ''}`}
              style={{ backgroundColor: color }}
            >
              {String.fromCharCode(65 + i)}. {opt}
              {isSelected && !savingAnswer && <CheckCircle className="h-5 w-5 inline ml-2" />}
              {isSelected && savingAnswer && <span className="ml-2 text-sm opacity-70">...</span>}
            </button>
          );
        })}
      </div>

      {/* Selected answer confirmation */}
      {selectedAnswer && !saveError && (
        <div className="text-center mt-4 text-sm text-uir-green-muted animate-fade-in">
          ✓ Jawaban tersimpan: <strong>{selectedAnswer}</strong>
        </div>
      )}

      {/* Explanation after reveal */}
      {revealed && currentQ.explanation && (
        <div className="mt-6 max-w-2xl mx-auto w-full p-4 rounded-xl bg-uir-green-dark/30 border border-uir-green-medium/30 text-sm text-uir-green-muted animate-fade-in">
          💡 {currentQ.explanation}
        </div>
      )}
    </div>
  );
};
