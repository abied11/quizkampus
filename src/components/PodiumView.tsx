import React from 'react';
import { Trophy, Medal } from 'lucide-react';

interface PodiumViewProps {
  entries: { name: string; score: number; bonus?: number }[];
  title?: string;
}

export const PodiumView: React.FC<PodiumViewProps> = ({ entries, title = 'Podium Juara' }) => {
  const top3 = entries.slice(0, 3);
  const order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  const heights = ['h-24', 'h-36', 'h-20'];
  const medals = ['🥈', '🥇', '🥉'];
  const colors = [
    'from-slate-400/30 to-slate-500/10 border-slate-400/40',
    'from-amber-500/30 to-amber-600/10 border-amber-500/50',
    'from-orange-700/20 to-orange-800/10 border-orange-600/30',
  ];

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Belum ada peserta di podium
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-center text-lg font-bold text-white flex items-center justify-center gap-2">
        <Trophy className="h-5 w-5 text-amber-400" /> {title}
      </h3>
      <div className="flex items-end justify-center gap-4 px-4">
        {order.map((entry, idx) => {
          if (!entry) return null;
          const rank = entries.indexOf(entry);
          return (
            <div key={entry.name + rank} className="flex flex-col items-center flex-1 max-w-[120px] animate-fade-in-up">
              <span className="text-3xl mb-1">{medals[idx] ?? '🏅'}</span>
              <p className="text-xs font-bold text-white text-center line-clamp-2 mb-2">{entry.name}</p>
              <p className="text-lg font-black text-uir-yellow-gold mb-2">{entry.score}</p>
              <div className={`w-full ${heights[idx] ?? 'h-16'} rounded-t-xl border bg-gradient-to-t ${colors[idx]} flex items-end justify-center pb-2`}>
                <Medal className="h-5 w-5 text-white/60" />
              </div>
            </div>
          );
        })}
      </div>
      {entries.length > 3 && (
        <div className="space-y-2 mt-4">
          {entries.slice(3, 8).map((e, i) => (
            <div key={e.name} className="flex justify-between px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800 text-sm">
              <span className="text-slate-300">#{i + 4} {e.name}</span>
              <span className="font-bold text-slate-200">{e.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
