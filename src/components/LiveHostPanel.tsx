import React, { useEffect, useState } from 'react';
import {
  dbUpdateLiveSession, dbGetPollResults,
} from '../dbService';
import type { QuizSession, Question, User } from '../dbService';
import { QRJoinCard } from './QRJoinCard';
import { PodiumView } from './PodiumView';
import { buildPodiumFromAttempts } from '../utils/scoring';
import { useAppContext } from '../hooks/useAppContext';
import {
  Play, SkipForward, Eye, Trophy, Users, Radio, BarChart2,
} from 'lucide-react';

interface LiveHostPanelProps {
  session: QuizSession;
  user: User;
  onClose: () => void;
}

export const LiveHostPanel: React.FC<LiveHostPanelProps> = ({ session, user, onClose }) => {
  const { questions, attempts, refreshSessions } = useAppContext();
  const [liveSession, setLiveSession] = useState(session);
  const [pollResults, setPollResults] = useState<{ option: string; count: number; pct: number }[]>([]);

  const sessionQuestions = liveSession.questions
    .map(id => questions.find(q => q.id === id))
    .filter(Boolean) as Question[];

  const currentQ = sessionQuestions[liveSession.currentQuestionIndex];
  const liveAttempts = attempts.filter(a => a.quizSessionId === liveSession.id);

  useEffect(() => {
    setLiveSession(session);
  }, [session]);

  useEffect(() => {
    if (liveSession.sessionMode !== 'poll' || !currentQ) return;
    dbGetPollResults(liveSession.id, currentQ.id, attempts).then(setPollResults);
  }, [liveSession, currentQ, attempts]);

  const updateLive = async (patch: Parameters<typeof dbUpdateLiveSession>[1]) => {
    await dbUpdateLiveSession(liveSession.id, patch);
    await refreshSessions();
  };

  const advanceQuestion = async () => {
    const next = liveSession.currentQuestionIndex + 1;
    if (next >= sessionQuestions.length) {
      await updateLive({ livePhase: 'finished', isClosed: true });
    } else {
      await updateLive({ currentQuestionIndex: next, livePhase: 'question' });
    }
  };

  const startLive = async () => {
    await dbUpdateLiveSession(liveSession.id, {
      livePhase: 'question',
      currentQuestionIndex: 0,
      hostId: user.id,
    });
    await refreshSessions();
  };

  const participantCount = liveAttempts.filter(a => a.status === 'in_progress' || a.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-red-400 animate-pulse" />
          <div>
            <h2 className="font-bold text-white">{liveSession.title}</h2>
            <p className="text-xs text-slate-400">Mode Live • {liveSession.livePhase}</p>
          </div>
        </div>
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">
          Tutup Panel
        </button>
      </header>

      <div className="flex-1 grid lg:grid-cols-3 gap-6 p-6 overflow-y-auto">
        <div className="space-y-4">
          <QRJoinCard session={liveSession} />
          <div className="glass rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
              <Users className="h-4 w-4" /> {participantCount} peserta
            </div>
            <p className="text-xs text-slate-500">Soal {liveSession.currentQuestionIndex + 1} / {sessionQuestions.length}</p>
          </div>
          <div className="flex flex-col gap-2">
            {liveSession.livePhase === 'waiting' && (
              <button onClick={startLive} className="py-3 rounded-xl bg-uir-green-medium text-white font-semibold flex items-center justify-center gap-2">
                <Play className="h-4 w-4" /> Mulai Live
              </button>
            )}
            {liveSession.livePhase === 'question' && (
              <>
                <button onClick={() => updateLive({ livePhase: 'reveal' })} className="py-3 rounded-xl bg-uir-yellow-gold/20 border border-uir-yellow-gold/40 text-uir-yellow-gold font-semibold flex items-center justify-center gap-2">
                  <Eye className="h-4 w-4" /> Tampilkan Jawaban
                </button>
                <button onClick={advanceQuestion} className="py-3 rounded-xl bg-uir-green-medium text-white font-semibold flex items-center justify-center gap-2">
                  <SkipForward className="h-4 w-4" /> Soal Berikutnya
                </button>
              </>
            )}
            {liveSession.livePhase === 'reveal' && (
              <button onClick={() => updateLive({ livePhase: 'leaderboard' })} className="py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2">
                <Trophy className="h-4 w-4" /> Tampilkan Peringkat
              </button>
            )}
            {liveSession.livePhase === 'leaderboard' && (
              <button onClick={advanceQuestion} className="py-3 rounded-xl bg-uir-green-medium text-white font-semibold flex items-center justify-center gap-2">
                <SkipForward className="h-4 w-4" /> Lanjut
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {currentQ && liveSession.livePhase !== 'waiting' && (
            <div className="glass rounded-2xl p-6 border border-slate-800">
              <p className="text-lg font-semibold text-white mb-4">{currentQ.text}</p>
              {currentQ.options?.map((opt, i) => (
                <div key={opt} className="px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-sm text-slate-300 mb-2">
                  {String.fromCharCode(65 + i)}. {opt}
                </div>
              ))}
            </div>
          )}

          {liveSession.sessionMode === 'poll' && pollResults.length > 0 && (
            <div className="glass rounded-2xl p-6 border border-slate-800">
              <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> Hasil Poll
              </h4>
              {pollResults.map(r => (
                <div key={r.option} className="mb-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{r.option}</span><span>{r.pct}% ({r.count})</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-uir-green-medium rounded-full transition-all" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {(liveSession.livePhase === 'leaderboard' || liveSession.livePhase === 'finished') && (
            <div className="glass rounded-2xl p-6 border border-slate-800">
              <PodiumView entries={buildPodiumFromAttempts(liveAttempts.filter(a => a.status === 'completed'))} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
