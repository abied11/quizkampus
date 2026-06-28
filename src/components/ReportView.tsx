import React, { useState } from 'react';
import { dbSubmitReport } from '../dbService';
import type { User } from '../dbService';
import {
  Send, Bug, MessageSquare, HelpCircle, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';

interface ReportViewProps {
  user: User;
}

const reportTypes = [
  { value: 'bug' as const, label: 'Bug / Error', icon: Bug, color: 'text-red-400 border-red-500/30 bg-red-950/20' },
  { value: 'feedback' as const, label: 'Saran / Masukan', icon: MessageSquare, color: 'text-blue-400 border-blue-500/30 bg-blue-950/20' },
  { value: 'question_error' as const, label: 'Kesalahan Soal', icon: AlertTriangle, color: 'text-amber-400 border-amber-500/30 bg-amber-950/20' },
  { value: 'other' as const, label: 'Lainnya', icon: HelpCircle, color: 'text-slate-400 border-slate-500/30 bg-slate-900/40' },
];

export const ReportView: React.FC<ReportViewProps> = ({ user }) => {
  const [type, setType] = useState<'bug' | 'feedback' | 'question_error' | 'other'>('bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await dbSubmitReport(user.id, type, message.trim());
      setSubmitted(true);
      setMessage('');
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err: any) {
      alert('Gagal mengirim laporan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">Kirim Laporan</h2>
        <p className="text-slate-400 text-sm mt-1">
          Temukan bug? Punya saran? Laporkan di sini dan tim kami akan menanganinya.
        </p>
      </div>

      {/* Success Banner */}
      {submitted && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 animate-fade-in">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Laporan Terkirim!</p>
            <p className="text-xs text-emerald-400/80">Terima kasih atas masukan Anda. Tim kami akan segera meninjau laporan ini.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Report Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
            Tipe Laporan
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {reportTypes.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-xs font-semibold transition-all ${
                  type === value
                    ? `${color} ring-1 ring-current scale-[1.02]`
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Detail Laporan
          </label>
          <textarea
            required
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              type === 'bug'
                ? 'Jelaskan bug yang Anda temukan. Sertakan langkah-langkah untuk mereproduksi masalah...'
                : type === 'feedback'
                ? 'Bagikan saran atau masukan Anda untuk perbaikan platform...'
                : type === 'question_error'
                ? 'Sebutkan soal mana yang memiliki kesalahan dan jelaskan koreksinya...'
                : 'Tuliskan laporan Anda di sini...'
            }
            className="w-full px-4 py-3 rounded-xl glass-input text-sm resize-none"
          />
          <p className="text-[10px] text-slate-500 mt-1.5">
            Semakin detail penjelasan Anda, semakin cepat kami bisa menindaklanjuti.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !message.trim()}
          className="w-full px-4 py-3 rounded-xl bg-uir-green-medium hover:bg-uir-green-bright text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-uir-green-medium/25 transition-all active:scale-95 btn-press disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</>
          ) : (
            <><Send className="h-4 w-4" /> Kirim Laporan</>
          )}
        </button>
      </form>

      {/* Guidelines */}
      <div className="glass rounded-2xl p-5 border border-slate-800/60">
        <h3 className="text-sm font-bold text-white mb-3">Panduan Pelaporan</h3>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-uir-green-muted mt-0.5">•</span>
            <span><strong className="text-slate-300">Bug:</strong> Sertakan langkah-langkah detail, pesan error, dan screenshot jika memungkinkan.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-uir-green-muted mt-0.5">•</span>
            <span><strong className="text-slate-300">Saran:</strong> Jelaskan fitur yang diinginkan dan bagaimana fitur tersebut akan membantu.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-uir-green-muted mt-0.5">•</span>
            <span><strong className="text-slate-300">Kesalahan Soal:</strong> Sebutkan mata kuliah, judul soal, dan koreksi yang diperlukan.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
