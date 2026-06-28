import React, { useState } from 'react';
import { Search, BookOpen, Clock, Layers, Shield, Play } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import type { User, QuizSession } from '../dbService';

interface QuizLibraryViewProps {
  user: User;
  onStartQuiz: (accessCode: string) => void;
}

export const QuizLibraryView: React.FC<QuizLibraryViewProps> = ({ user, onStartQuiz }) => {
  const { sessions, allQuestions = [] } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Extract unique subjects from public sessions
  const publicSessions = sessions.filter(s => s.isPublic);
  const subjects = Array.from(new Set(publicSessions.map(s => s.subject)));

  const filteredSessions = publicSessions.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = subjectFilter === '' || s.subject === subjectFilter;
    return matchSearch && matchSubject;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Perpustakaan Kuis</h2>
          <p className="text-slate-400 text-sm mt-1">
            Jelajahi dan ikuti kuis publik yang disediakan oleh dosen untuk latihan belajar Anda.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-3 border border-slate-800">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama kuis atau topik..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
          />
        </div>
        
        <div className="min-w-[200px]">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
          >
            <option value="">Semua Mata Kuliah</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Quiz List */}
      {filteredSessions.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-slate-800/80">
          <BookOpen className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-300">Tidak ada kuis publik ditemukan</h3>
          <p className="text-slate-400 text-sm mt-1">
            Coba sesuaikan pencarian Anda atau tunggu dosen mempublikasikan kuis baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSessions.map(session => (
            <div key={session.id} className="glass-card rounded-2xl p-5 border border-slate-800/60 hover:border-slate-700/80 transition-all flex flex-col h-full">
              <div className="flex flex-col gap-4 justify-between flex-1">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-700/50">
                      {session.subject}
                    </span>
                    <span className="bg-uir-green-dark/40 text-uir-green-muted px-2.5 py-1 rounded-full text-xs font-medium border border-uir-green-medium/20">
                      {session.questions.length} Soal
                    </span>
                    <span className="bg-indigo-950/40 text-indigo-300 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-500/20 uppercase">
                      Publik
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">{session.title}</h3>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {session.durationMinutes > 0 ? `${session.durationMinutes} menit` : 'Tanpa Batas'}
                    </span>
                    {session.attemptLimit > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Maks {session.attemptLimit}x percobaan
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-800/50 pt-4 mt-auto">
                  <button
                    onClick={() => onStartQuiz(session.accessCode)}
                    className="w-full px-4 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-uir-green-dark/25 transition-all active:scale-95 btn-press"
                  >
                    <Play className="h-4 w-4" />
                    Mulai Belajar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
