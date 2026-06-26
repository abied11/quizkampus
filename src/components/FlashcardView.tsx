import React, { useCallback, useEffect, useState } from 'react';
import type { User, Question } from '../dbService';
import { dbGetFlashcardDue, dbUpdateFlashcardProgress } from '../dbService';
import { useAppContext } from '../hooks/useAppContext';
import { BookOpen, RotateCcw, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';

interface FlashcardViewProps {
  user: User;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({ user }) => {
  const { questions } = useAppContext();
  const [deck, setDeck] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    const due = await dbGetFlashcardDue(user.id, questions);
    setDeck(due);
    setIdx(0);
    setFlipped(false);
    setLoading(false);
  }, [user.id, questions]);

  useEffect(() => { loadDeck(); }, [loadDeck]);

  const current = deck[idx];

  const handleRate = async (quality: 'easy' | 'hard' | 'again') => {
    if (!current) return;
    await dbUpdateFlashcardProgress(user.id, current.id, quality);
    setFlipped(false);
    if (idx + 1 < deck.length) setIdx(i => i + 1);
    else await loadDeck();
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Memuat flashcard...</div>;
  }

  if (deck.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center border border-slate-800 max-w-lg mx-auto">
        <BookOpen className="h-12 w-12 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-300">Belum ada soal untuk flashcard</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Flashcard Belajar</h2>
        <p className="text-slate-400 text-sm mt-1">Kartu {idx + 1} dari {deck.length} • spaced repetition</p>
      </div>

      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full min-h-[220px] perspective-1000"
      >
        <div className={`glass rounded-3xl p-8 border border-slate-800 transition-all duration-500 ${flipped ? 'bg-uir-green-dark/20' : ''}`}>
          {!flipped ? (
            <p className="text-lg font-semibold text-white text-center">{current.text}</p>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-uir-green-muted font-bold">Jawaban:</p>
              <p className="text-white">{current.correctAnswer}</p>
              {current.explanation && (
                <p className="text-xs text-slate-400 mt-2">{current.explanation}</p>
              )}
            </div>
          )}
          <p className="text-[10px] text-slate-500 text-center mt-4">
            {flipped ? 'Klik untuk lihat pertanyaan' : 'Klik untuk lihat jawaban'}
          </p>
        </div>
      </button>

      {flipped && (
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => handleRate('again')} className="py-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm font-semibold flex flex-col items-center gap-1">
            <RefreshCw className="h-4 w-4" /> Ulangi
          </button>
          <button onClick={() => handleRate('hard')} className="py-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-sm font-semibold flex flex-col items-center gap-1">
            <ThumbsDown className="h-4 w-4" /> Sulit
          </button>
          <button onClick={() => handleRate('easy')} className="py-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex flex-col items-center gap-1">
            <ThumbsUp className="h-4 w-4" /> Mudah
          </button>
        </div>
      )}

      <button onClick={loadDeck} className="w-full py-2 text-xs text-slate-500 flex items-center justify-center gap-1 hover:text-slate-300">
        <RotateCcw className="h-3 w-3" /> Muat ulang deck
      </button>
    </div>
  );
};
