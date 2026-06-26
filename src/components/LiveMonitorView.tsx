import React, { useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Activity, Users, AlertTriangle, Clock } from 'lucide-react';

interface LiveMonitorViewProps {
  filterSessionId?: string;
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({ filterSessionId }) => {
  const { sessions, attempts, logs } = useAppContext();
  const [selectedId, setSelectedId] = React.useState(filterSessionId || '');

  React.useEffect(() => {
    if (!selectedId && sessions.length > 0) setSelectedId(sessions[0].id);
  }, [sessions, selectedId]);

  const session = sessions.find(s => s.id === selectedId);
  const sessionAttempts = attempts.filter(a => a.quizSessionId === selectedId);
  const inProgress = sessionAttempts.filter(a => a.status === 'in_progress');
  const completed = sessionAttempts.filter(a => a.status === 'completed');
  const violations = logs.filter(l => sessionAttempts.some(a => a.id === l.attemptId));

  const avgProgress = useMemo(() => {
    if (!session || inProgress.length === 0) return 0;
    const total = session.questions.length || 1;
    const avg = inProgress.reduce((s, a) => s + Object.keys(a.answers).length, 0) / inProgress.length;
    return Math.round((avg / total) * 100);
  }, [session, inProgress]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-uir-green-medium" /> Monitor Real-time
        </h2>
        <p className="text-slate-400 text-sm mt-1">Pantau peserta yang sedang mengerjakan kuis secara langsung</p>
      </div>

      <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm">
        {sessions.map(s => <option key={s.id} value={s.id}>{s.title} ({s.sessionMode})</option>)}
      </select>

      {session && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Sedang Mengerjakan" value={inProgress.length} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Selesai" value={completed.length} icon={<Clock className="h-5 w-5" />} />
            <StatCard label="Pelanggaran" value={violations.length} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
            <StatCard label="Progress Rata-rata" value={`${avgProgress}%`} icon={<Activity className="h-5 w-5" />} />
          </div>

          <div className="glass rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 text-sm font-semibold text-slate-300">Peserta Aktif</div>
            {inProgress.length === 0 ? (
              <p className="p-6 text-center text-slate-500 text-sm">Tidak ada peserta aktif</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {inProgress.map(a => {
                  const answered = Object.keys(a.answers).length;
                  const total = session.questions.length;
                  const pct = total ? Math.round((answered / total) * 100) : 0;
                  return (
                    <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{a.studentName}</p>
                        {a.teamName && <p className="text-[10px] text-slate-500">Tim: {a.teamName}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-uir-green-medium rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-16 text-right">{answered}/{total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string }> = ({
  label, value, icon, color,
}) => (
  <div className="glass rounded-2xl p-4 border border-slate-800">
    <div className={`mb-2 ${color === 'red' ? 'text-red-400' : 'text-uir-green-muted'}`}>{icon}</div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-xs text-slate-400 mt-1">{label}</p>
  </div>
);
