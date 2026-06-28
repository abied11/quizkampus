import React, { useEffect, useState } from 'react';
import { dbGetPublicProfile } from '../dbService';
import type { PublicProfileData } from '../dbService';
import { UserAvatar } from './UserAvatar';
import { Trophy, BarChart2, CheckCircle, BookOpen, ArrowLeft, Star, Calendar } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../utils/scoring';

interface PublicProfileViewProps {
  userId: string;
  onBack: () => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({ userId, onBack }) => {
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    dbGetPublicProfile(userId)
      .then(setData)
      .catch(e => setError(e.message ?? 'Gagal memuat profil'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-8">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <p className="text-red-400">{error || 'Profil tidak ditemukan.'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm">
          ← Kembali
        </button>
      </div>
    );
  }

  const { user, totalQuizzes, avgScore, bestScore, totalCorrect, recentAttempts } = data;

  const scoreColor = (s: number) =>
    s >= 85 ? 'text-amber-400' : s >= 60 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="max-w-xl mx-auto space-y-5 py-4 animate-fade-in-up">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors btn-press"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Peringkat
      </button>

      {/* Profile Header */}
      <div className="glass-premium rounded-3xl p-6 border border-uir-green-medium/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-uir-green-dark/20 via-transparent to-uir-green-medium/10 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <UserAvatar user={user} size="lg" className="ring-4 ring-uir-green-medium/30" />
            <div className="absolute -bottom-1 -right-1 bg-uir-green-medium rounded-full p-1">
              <Star className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-black text-white">{user.name}</h2>
            <p className="text-uir-yellow-gold text-sm font-semibold mt-0.5">{user.class}</p>
            {user.bio && (
              <p className="text-slate-400 text-sm mt-2 italic">"{user.bio}"</p>
            )}
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <span className="px-3 py-1 rounded-full bg-uir-green-dark/40 border border-uir-green-medium/30 text-uir-green-muted text-xs font-semibold">
                ⚡ {user.xp ?? 0} XP
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs">
                {user.role === 'dosen' ? '👨‍🏫 Dosen' : '🎓 Mahasiswa'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Quiz Selesai', value: totalQuizzes, icon: BookOpen, color: 'text-uir-green-muted' },
          { label: 'Rata-rata', value: avgScore, icon: BarChart2, color: scoreColor(avgScore) },
          { label: 'Nilai Terbaik', value: bestScore, icon: Trophy, color: scoreColor(bestScore) },
          { label: 'Total Benar', value: totalCorrect, icon: CheckCircle, color: 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="portfolio-stat">
            <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      {(user.badges ?? []).length > 0 && (
        <div className="glass rounded-2xl p-5 border border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🏅 Badge Diperoleh</p>
          <div className="flex flex-wrap gap-2">
            {(user.badges ?? []).map(b => (
              <span
                key={b}
                className="px-3 py-1.5 rounded-xl bg-uir-green-dark/30 border border-uir-green-medium/25 text-xs text-slate-200 font-medium"
              >
                {BADGE_DEFINITIONS[b]?.icon ?? '🏅'} {BADGE_DEFINITIONS[b]?.label ?? b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Quizzes */}
      {recentAttempts.length > 0 && (
        <div className="glass rounded-2xl border border-slate-800">
          <div className="p-4 border-b border-slate-800/80">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-uir-green-muted" /> Riwayat Quiz Terbaru
            </h3>
          </div>
          <div className="p-3 space-y-2">
            {recentAttempts.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800/60"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{a.sessionTitle}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {a.submitTime ? new Date(a.submitTime).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                    {' • '}{a.correct}/{a.total} benar
                  </p>
                </div>
                <span className={`text-xl font-black ${scoreColor(a.score)}`}>{a.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentAttempts.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center border border-slate-800">
          <BookOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Belum ada quiz yang diselesaikan.</p>
        </div>
      )}
    </div>
  );
};
