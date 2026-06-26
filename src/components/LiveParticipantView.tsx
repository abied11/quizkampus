import React, { useEffect, useState, useRef } from 'react';
import type { QuizSession, Question, Attempt, User } from '../dbService';
import { dbSaveAttemptAnswers, dbSubmitAttempt } from '../dbService';
import { useAppContext } from '../hooks/useAppContext';
import { KAHOOt_COLORS, isAnswerCorrect } from '../utils/scoring';
import { playCorrectSound, playWrongSound, playJoinSound } from '../utils/sounds';
import { Clock, Radio, CheckCircle } from 'lucide-react';

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

  const currentQ = questions[liveSession.currentQuestionIndex];

  useEffect(() => {
    playJoinSound();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshSessions();
      const updated = sessions.find(s => s.id === session.id);
      if (updated) setLiveSession(updated);
    }, 2000);
    return () => clearInterval(interval);
  }, [session.id, sessions, refreshSessions]);

  useEffect(() => {
    setSelectedAnswer(null);
    setRevealed(false);
    setTimeLeft(session.perQuestionSeconds || 30);
  }, [liveSession.currentQuestionIndex, liveSession.livePhase, session.perQuestionSeconds]);

  useEffect(() => {
    if (liveSession.livePhase !== 'question' || !currentQ) return;
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [liveSession.livePhase, currentQ]);

  const finishedRef = useRef(false);

  useEffect(() => {
    if (liveSession.livePhase === 'reveal') setRevealed(true);
    if (liveSession.livePhase === 'finished' && !finishedRef.current) {
      finishedRef.current = true;
      dbSubmitAttempt(attempt.id, sessions, questions, attempts).then(onFinish);
    }
  }, [liveSession.livePhase, attempt.id, sessions, questions, attempts, onFinish]);

  const handleAnswer = async (value: string) => {
    if (selectedAnswer || liveSession.livePhase !== 'question' || !currentQ) return;
    setSelectedAnswer(value);
    const newAnswers = { ...attempt.answers, [currentQ.id]: value };
    const meta = {
      ...attempt.answersMeta,
      [currentQ.id]: { answeredAt: new Date().toISOString(), timeSpentMs: (session.perQuestionSeconds - timeLeft) * 1000 },
    };
    await dbSaveAttemptAnswers(attempt.id, newAnswers, meta);
    await refreshAttempts();
    if (session.sessionMode !== 'poll' && isAnswerCorrect(currentQ, value)) playCorrectSound();
    else if (session.sessionMode !== 'poll') playWrongSound();
  };

  if (liveSession.livePhase === 'waiting') {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6">
        <Radio className="h-12 w-12 text-uir-green-medium animate-pulse mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Menunggu Host...</h2>
        <p className="text-slate-400 text-sm">Dosen akan memulai kuis sebentar lagi</p>
        <p className="text-uir-yellow-gold font-mono mt-4">{user.name}</p>
      </div>
    );
  }

  if (liveSession.livePhase === 'leaderboard') {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6">
        <TrophyPlaceholder />
        <p className="text-slate-400 mt-4">Lihat papan peringkat di layar dosen...</p>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-slate-400">Soal {liveSession.currentQuestionIndex + 1}/{questions.length}</span>
        {liveSession.livePhase === 'question' && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 font-mono font-bold text-white">
            <Clock className="h-4 w-4" /> {timeLeft}s
          </div>
        )}
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8 max-w-2xl mx-auto">{currentQ.text}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full flex-1">
        {(currentQ.options ?? []).map((opt, i) => {
          const color = KAHOOt_COLORS[i % KAHOOt_COLORS.length];
          const isSelected = selectedAnswer === opt;
          const isCorrect = revealed && opt === currentQ.correctAnswer;
          const isWrong = revealed && isSelected && opt !== currentQ.correctAnswer;
          return (
            <button
              key={opt}
              disabled={!!selectedAnswer && liveSession.livePhase === 'question'}
              onClick={() => handleAnswer(opt)}
              className={`p-6 rounded-2xl text-white font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-70 ${
                isCorrect ? 'ring-4 ring-emerald-400' : isWrong ? 'ring-4 ring-red-400' : ''
              }`}
              style={{ backgroundColor: color }}
            >
              {String.fromCharCode(65 + i)}. {opt}
              {isSelected && <CheckCircle className="h-5 w-5 inline ml-2" />}
            </button>
          );
        })}
      </div>

      {revealed && currentQ.explanation && (
        <div className="mt-6 max-w-2xl mx-auto w-full p-4 rounded-xl bg-uir-green-dark/30 border border-uir-green-medium/30 text-sm text-uir-green-muted">
          💡 {currentQ.explanation}
        </div>
      )}
    </div>
  );
};

const TrophyPlaceholder = () => (
  <div className="text-6xl animate-bounce">🏆</div>
);
