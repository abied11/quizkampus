import type { Question, QuizSession, Attempt } from '../dbService';

export const KAHOOt_COLORS = ['#E21B3C', '#1368CE', '#D89E00', '#26890C'];

export const computeSpeedBonus = (
  session: QuizSession,
  answersMeta: Record<string, { answeredAt: string; timeSpentMs: number }>,
  correctCount: number,
): number => {
  if (!session.speedBonusEnabled || correctCount === 0) return 0;
  const times = Object.values(answersMeta).map(m => m.timeSpentMs).filter(t => t > 0);
  if (times.length === 0) return 0;
  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const maxBonus = 20;
  if (avgMs <= 5000) return maxBonus;
  if (avgMs >= 60000) return 0;
  return Math.round(maxBonus * (1 - (avgMs - 5000) / 55000));
};

export const isAnswerCorrect = (q: Question, studentAnswer: string): boolean => {
  if (q.type === 'poll') return true;
  if (q.type === 'matching') {
    try {
      const correctMap: Record<string, string> = JSON.parse(q.correctAnswer);
      const studentMap: Record<string, string> = studentAnswer ? JSON.parse(studentAnswer) : {};
      return Object.entries(correctMap).every(
        ([k, v]) => (studentMap[k] || '').trim().toLowerCase() === v.trim().toLowerCase(),
      );
    } catch {
      return false;
    }
  }
  return (studentAnswer || '').trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
};

export const selectAdaptiveNextQuestion = (
  pool: Question[],
  answeredIds: string[],
  lastWasCorrect: boolean | null,
): Question | null => {
  const remaining = pool.filter(q => !answeredIds.includes(q.id));
  if (remaining.length === 0) return null;
  const order = { easy: 0, medium: 1, hard: 2 };
  const sorted = [...remaining].sort((a, b) => order[a.difficulty] - order[b.difficulty]);
  if (lastWasCorrect === null) return sorted[Math.floor(sorted.length / 2)] ?? sorted[0];
  if (lastWasCorrect) {
    const harder = sorted.filter(q => order[q.difficulty] >= 1);
    return harder[0] ?? sorted[sorted.length - 1];
  }
  return sorted[0];
};

export const BADGE_DEFINITIONS: Record<string, { label: string; icon: string; desc: string }> = {
  first_quiz: { label: 'Pemula', icon: '🎯', desc: 'Selesaikan kuis pertama' },
  perfect_score: { label: 'Sempurna', icon: '💯', desc: 'Dapat nilai 100' },
  speed_demon: { label: 'Kilat', icon: '⚡', desc: 'Bonus kecepatan maksimal' },
  no_violations: { label: 'Jujur', icon: '🛡️', desc: 'Selesai tanpa pelanggaran' },
  streak_3: { label: 'Streak 3', icon: '🔥', desc: '3 kuis lulus berturut-turut' },
  live_winner: { label: 'Juara Live', icon: '🏆', desc: 'Peringkat 1 mode live' },
};

export const xpForAttempt = (score: number, bonus: number, violations: number): number => {
  let xp = Math.round(score / 2) + bonus;
  if (violations === 0) xp += 10;
  return Math.max(5, xp);
};

export const buildPodiumFromAttempts = (
  attempts: Attempt[],
  usersMap?: Record<string, { profilePhotoUrl?: string }>,
): { name: string; score: number; bonus?: number; profilePhotoUrl?: string; userId?: string }[] =>
  [...attempts]
    .sort((a, b) => b.score - a.score || (a.submitTime ?? '').localeCompare(b.submitTime ?? ''))
    .map(a => ({
      name: a.studentName,
      score: a.score,
      bonus: a.bonusPoints,
      profilePhotoUrl: usersMap?.[a.studentId]?.profilePhotoUrl,
      userId: a.studentId,
    }));

