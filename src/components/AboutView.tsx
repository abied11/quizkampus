import React from 'react';
import {
  GraduationCap, Shield, Zap, Users, BookOpen, BarChart2, Globe,
  Heart, Code, Mail
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const features = [
    { icon: BookOpen, title: 'Bank Soal & Paket', desc: 'Kelola ribuan soal dalam paket terorganisir dengan berbagai tipe: pilihan ganda, esai, boolean, matching, dan polling.' },
    { icon: Shield, title: 'Anti-Cheat Canggih', desc: 'Deteksi tab switch, copy-paste, developer tools, klik kanan, webcam proctoring, dan exit fullscreen.' },
    { icon: Zap, title: 'Mode Live Quiz', desc: 'Kuis interaktif real-time dengan leaderboard langsung, speed bonus, dan podium pemenang.' },
    { icon: BarChart2, title: 'Analitik Mendalam', desc: 'Statistik lengkap per sesi, per mahasiswa, distribusi nilai, dan ekspor laporan PDF/Excel.' },
    { icon: Users, title: 'Manajemen Pengguna', desc: 'Sistem peran dosen-mahasiswa, profil dengan foto, XP, badge, dan tracking aktivitas.' },
    { icon: Globe, title: 'Perpustakaan Kuis Publik', desc: 'Dosen dapat mempublikasikan kuis untuk latihan mandiri mahasiswa tanpa kode akses.' },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="glass rounded-3xl p-8 border border-slate-800/60 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-uir-green-dark/20 via-transparent to-uir-green-medium/10" />
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-tr from-uir-green-dark to-uir-green-medium shadow-xl shadow-uir-green-dark/30 mb-5">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Web Quiz Kampus</h1>
          <p className="text-uir-yellow-gold font-semibold text-sm uppercase tracking-wider mb-4">
            Platform Kuis Digital Universitas Islam Riau
          </p>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl mx-auto">
            Web Quiz Kampus adalah platform ujian dan kuis digital modern yang dirancang khusus untuk lingkungan akademik. 
            Dibangun dengan teknologi terkini untuk memberikan pengalaman belajar dan evaluasi yang interaktif, aman, dan menyenangkan.
          </p>
          <div className="flex items-center justify-center gap-4 mt-5">
            <span className="px-3 py-1.5 rounded-full bg-uir-green-dark/40 border border-uir-green-medium/30 text-uir-green-muted text-xs font-semibold">
              v2.0
            </span>
            <span className="px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-300 text-xs font-medium">
              React + TypeScript + Supabase
            </span>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-uir-yellow-gold" />
          Fitur Unggulan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card rounded-2xl p-5 border border-slate-800/60 hover:border-uir-green-medium/30 transition-all group">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-uir-green-dark/30 border border-uir-green-medium/20 group-hover:bg-uir-green-dark/50 transition-colors shrink-0">
                  <Icon className="h-5 w-5 text-uir-green-muted" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="glass rounded-2xl p-6 border border-slate-800/60">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Code className="h-5 w-5 text-uir-yellow-gold" />
          Teknologi
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'React 18', desc: 'UI Library' },
            { name: 'TypeScript', desc: 'Type Safety' },
            { name: 'Supabase', desc: 'Backend & DB' },
            { name: 'Tailwind CSS', desc: 'Styling' },
            { name: 'Vite', desc: 'Build Tool' },
            { name: 'Lucide Icons', desc: 'Ikon UI' },
            { name: 'Web Speech API', desc: 'Text-to-Speech' },
            { name: 'Recharts', desc: 'Visualisasi Data' },
          ].map(tech => (
            <div key={tech.name} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
              <p className="text-xs font-bold text-slate-200">{tech.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <div className="glass rounded-2xl p-6 border border-slate-800/60">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-400" />
          Dibuat Dengan ❤️
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Platform ini dikembangkan sebagai bagian dari upaya digitalisasi sistem evaluasi pembelajaran 
          di Universitas Islam Riau. Dirancang untuk memudahkan dosen dalam mengelola ujian dan memberikan 
          pengalaman belajar yang lebih interaktif bagi mahasiswa.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <a
            href="mailto:support@quizkampus.id"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-uir-green-dark/30 border border-uir-green-medium/20 text-uir-green-muted text-xs font-semibold hover:bg-uir-green-dark/50 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" /> Hubungi Tim
          </a>
        </div>
      </div>

      <p className="text-center text-xs text-slate-600 pb-4">
        © 2026 Web Quiz Kampus — Universitas Islam Riau. Hak cipta dilindungi.
      </p>
    </div>
  );
};
