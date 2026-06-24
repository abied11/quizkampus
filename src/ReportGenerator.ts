import * as XLSX from 'xlsx';
import type { QuizSession, Attempt, QuestionDifficultyAnalysis, ActivityLog } from './dbService';

interface ReportData {
  session: QuizSession;
  attempts: Attempt[];
  questionAnalysis: QuestionDifficultyAnalysis[];
  stats: {
    avg: number;
    max: number;
    min: number;
    passing: number;
    total: number;
  };
}

const diffLabel = (d: string) =>
  d === 'easy' ? 'Mudah' : d === 'medium' ? 'Sedang' : 'Sulit';

const gradeLabel = (score: number) => {
  if (score >= 85) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'D+';
  if (score >= 50) return 'D';
  return 'E';
};

export const generatePDFReport = (data: ReportData): void => {
  const { session, attempts, questionAnalysis, stats } = data;
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  const passRate = stats.total > 0 ? Math.round((stats.passing / stats.total) * 100) : 0;

  const sortedAttempts = [...attempts].sort((a, b) => b.score - a.score);

  const attemptsRows = sortedAttempts
    .map((att, idx) => `
      <tr class="${idx % 2 === 0 ? 'even' : ''} ${idx === 0 ? 'top-student' : ''}">
        <td class="rank">${idx + 1}</td>
        <td class="name">${idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}${att.studentName}</td>
        <td>${att.submitTime ? new Date(att.submitTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
        <td>${att.correctCount}/${att.totalQuestions}</td>
        <td class="score ${att.score >= 80 ? 'high' : att.score >= 60 ? 'mid' : 'low'}">${att.score}</td>
        <td class="grade">${gradeLabel(att.score)}</td>
        <td class="status ${att.score >= 60 ? 'pass' : 'fail'}">${att.score >= 60 ? '✓ Lulus' : '✗ Tidak Lulus'}</td>
      </tr>
    `).join('');

  const qAnalysisRows = questionAnalysis.map((q, idx) => `
    <tr class="${idx % 2 === 0 ? 'even' : ''}">
      <td class="rank">${idx + 1}</td>
      <td class="q-text">${q.text.length > 80 ? q.text.substring(0, 80) + '...' : q.text}</td>
      <td>${diffLabel(q.difficulty)}</td>
      <td>${q.attemptCount}</td>
      <td class="score ${q.correctRate >= 70 ? 'high' : q.correctRate >= 40 ? 'mid' : 'low'}">${q.correctRate}%</td>
      <td class="status ${q.correctRate >= 70 ? 'pass' : q.correctRate >= 40 ? 'mid-label' : 'fail'}">${
        q.correctRate >= 70 ? 'Mudah Dijawab' : q.correctRate >= 40 ? 'Cukup' : 'Sulit Dijawab'
      }</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laporan Hasil Kuis — ${session.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #1e293b;
      background: #f8fafc;
      padding: 32px;
    }

    /* Header */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 3px solid #065D3E;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .institution { color: #64748b; font-size: 11px; margin-bottom: 4px; }
    .report-title { font-size: 20px; font-weight: 800; color: #1e293b; }
    .report-subtitle { font-size: 13px; color: #065D3E; font-weight: 600; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.6; }
    .report-meta strong { color: #1e293b; }

    /* Section */
    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      border-left: 4px solid #065D3E;
      padding-left: 10px;
      margin-bottom: 14px;
    }

    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 0;
    }
    .stat-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: 900; }
    .stat-label { font-size: 10px; color: #64748b; margin-top: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-blue   .stat-value { color: #065D3E; }
    .stat-purple .stat-value { color: #FFB102; }
    .stat-green  .stat-value { color: #168A26; }
    .stat-red    .stat-value { color: #ef4444; }
    .stat-amber  .stat-value { color: #f59e0b; }

    /* Info Grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-box { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    .info-box h4 { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
    .info-row:last-child { border-bottom: none; }
    .info-row .label { color: #64748b; }
    .info-row .value { font-weight: 600; color: #1e293b; }

    /* Pass rate bar */
    .pass-rate-bar {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 6px;
    }
    .pass-rate-fill {
      height: 100%;
      background: linear-gradient(90deg, #065D3E, #FFB102);
      border-radius: 4px;
    }

    /* Table */
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
    thead tr { background: #004029; color: white; }
    th { padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    td { padding: 9px 12px; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
    tr.even td { background: #f8fafc; }
    tr.top-student td { background: #fefce8; }
    tr:last-child td { border-bottom: none; }
    .rank { font-weight: 700; color: #64748b; text-align: center; width: 36px; }
    .name { font-weight: 600; }
    .score { font-weight: 900; text-align: center; }
    .score.high { color: #168A26; }
    .score.mid  { color: #065D3E; }
    .score.low  { color: #ef4444; }
    .grade { font-weight: 700; text-align: center; }
    .status { font-weight: 600; font-size: 11px; text-align: center; }
    .status.pass { color: #10b981; }
    .status.fail { color: #ef4444; }
    .status.mid-label { color: #f59e0b; }
    .q-text { max-width: 280px; line-height: 1.4; }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
    }

    @media print {
      body { background: white; padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Report Header -->
  <div class="report-header">
    <div>
      <div class="institution">UNIVERSITAS ISLAM RIAU (UIR) — LAPORAN RESMI HASIL UJIAN</div>
      <div class="report-title">${session.title}</div>
      <div class="report-subtitle">Mata Kuliah: ${session.subject}</div>
    </div>
    <div class="report-meta">
      <div>Dicetak: <strong>${now}</strong></div>
      <div>Sesi ID: <strong>${session.id}</strong></div>
      <div>Periode: <strong>${new Date(session.startTime).toLocaleDateString('id-ID')} — ${new Date(session.endTime).toLocaleDateString('id-ID')}</strong></div>
      <div>Durasi: <strong>${session.durationMinutes > 0 ? session.durationMinutes + ' menit' : 'Tidak Dibatasi'}</strong></div>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="section">
    <div class="section-title">Ringkasan Statistik Kelas</div>
    <div class="summary-grid">
      <div class="stat-card stat-blue"><div class="stat-value">${stats.total}</div><div class="stat-label">Peserta</div></div>
      <div class="stat-card stat-purple"><div class="stat-value">${stats.avg}</div><div class="stat-label">Nilai Rata-rata</div></div>
      <div class="stat-card stat-green"><div class="stat-value">${stats.max}</div><div class="stat-label">Nilai Tertinggi</div></div>
      <div class="stat-card stat-red"><div class="stat-value">${stats.min}</div><div class="stat-label">Nilai Terendah</div></div>
      <div class="stat-card stat-amber"><div class="stat-value">${passRate}%</div><div class="stat-label">Tingkat Kelulusan</div></div>
    </div>
    <div style="margin-top: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; font-weight: 600;">
        <span style="color: #10b981;">✓ Lulus: ${stats.passing} mahasiswa</span>
        <span style="color: #ef4444;">✗ Tidak Lulus: ${stats.total - stats.passing} mahasiswa</span>
        <span style="color: #64748b;">Tingkat Kelulusan: ${passRate}%</span>
      </div>
      <div class="pass-rate-bar">
        <div class="pass-rate-fill" style="width: ${passRate}%"></div>
      </div>
    </div>
  </div>

  <!-- Daftar Nilai -->
  <div class="section">
    <div class="section-title">Daftar Nilai Mahasiswa (Diurutkan Berdasarkan Nilai)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 36px;">#</th>
          <th>Nama Mahasiswa</th>
          <th>Waktu Selesai</th>
          <th>Benar/Total</th>
          <th style="width: 60px; text-align: center;">Nilai</th>
          <th style="width: 50px; text-align: center;">Grade</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>${attemptsRows || '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px;">Belum ada data pengerjaan</td></tr>'}</tbody>
    </table>
  </div>

  <!-- Analisis Soal -->
  ${questionAnalysis.length > 0 ? `
  <div class="section">
    <div class="section-title">Analisis Tingkat Kesulitan Per Soal</div>
    <table>
      <thead>
        <tr>
          <th style="width: 36px;">#</th>
          <th>Pertanyaan</th>
          <th>Tingkat</th>
          <th style="width: 70px;">Dijawab</th>
          <th style="width: 70px; text-align: center;">Benar (%)</th>
          <th style="text-align: center;">Evaluasi</th>
        </tr>
      </thead>
      <tbody>${qAnalysisRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <span>Web Quiz Kampus — Platform Pelaksanaan Ujian Online</span>
    <span>Dokumen ini digenerate secara otomatis pada ${now}</span>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

// ─── Excel Report Generator ──────────────────────────────────────────────────

interface ExcelReportData extends ReportData {
  logs?: ActivityLog[];
}

export const generateExcelReport = (data: ExcelReportData): void => {
  const { session, attempts, questionAnalysis, stats, logs = [] } = data;
  const passRate = stats.total > 0 ? Math.round((stats.passing / stats.total) * 100) : 0;
  const now = new Date().toLocaleString('id-ID');

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Ringkasan ────────────────────────────────────────────────────
  const summaryData = [
    ['WEB QUIZ KAMPUS – LAPORAN HASIL UJIAN'],
    [],
    ['Judul Sesi', session.title],
    ['Mata Kuliah', session.subject],
    ['Kode Akses', session.accessCode],
    ['Tanggal Mulai', new Date(session.startTime).toLocaleString('id-ID')],
    ['Tanggal Selesai', new Date(session.endTime).toLocaleString('id-ID')],
    ['Durasi', session.durationMinutes > 0 ? `${session.durationMinutes} menit` : 'Tidak Dibatasi'],
    ['Digenerate', now],
    [],
    ['STATISTIK KELAS'],
    ['Total Peserta', stats.total],
    ['Nilai Rata-rata', stats.avg],
    ['Nilai Tertinggi', stats.max],
    ['Nilai Terendah', stats.min],
    ['Jumlah Lulus (≥60)', stats.passing],
    ['Jumlah Tidak Lulus', stats.total - stats.passing],
    ['Tingkat Kelulusan', `${passRate}%`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');

  // ── Sheet 2: Daftar Nilai ─────────────────────────────────────────────────
  const sortedAttempts = [...attempts].sort((a, b) => b.score - a.score);
  const gradeHeader = [
    ['#', 'Nama Mahasiswa', 'Waktu Mulai', 'Waktu Selesai', 'Jawaban Benar', 'Total Soal', 'Skor', 'Grade', 'Status']
  ];
  const gradeRows = sortedAttempts.map((att, idx) => [
    idx + 1,
    att.studentName,
    att.startTime ? new Date(att.startTime).toLocaleString('id-ID') : '-',
    att.submitTime ? new Date(att.submitTime).toLocaleString('id-ID') : '-',
    att.correctCount,
    att.totalQuestions,
    att.score,
    gradeLabel(att.score),
    att.score >= 60 ? 'Lulus' : 'Tidak Lulus',
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([...gradeHeader, ...gradeRows]);
  ws2['!cols'] = [
    { wch: 4 }, { wch: 25 }, { wch: 22 }, { wch: 22 },
    { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Daftar Nilai');

  // ── Sheet 3: Analisis Soal ────────────────────────────────────────────────
  if (questionAnalysis.length > 0) {
    const qaHeader = [
      ['#', 'Pertanyaan', 'Tingkat Kesulitan', 'Jumlah Dijawab', 'Tingkat Kebenaran (%)', 'Evaluasi']
    ];
    const qaRows = questionAnalysis.map((q, idx) => [
      idx + 1,
      q.text,
      diffLabel(q.difficulty),
      q.attemptCount,
      q.correctRate,
      q.correctRate >= 70 ? 'Mudah Dijawab' : q.correctRate >= 40 ? 'Cukup' : 'Sulit Dijawab',
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([...qaHeader, ...qaRows]);
    ws3['!cols'] = [{ wch: 4 }, { wch: 60 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Analisis Soal');
  }

  // ── Sheet 4: Log Pelanggaran ──────────────────────────────────────────────
  const violationTypeLabel: Record<string, string> = {
    tab_switch: 'Pindah Tab',
    exit_fullscreen: 'Keluar Layar Penuh',
    copy_paste: 'Copy/Paste',
    right_click: 'Klik Kanan',
    mouse_leave: 'Kursor Keluar',
    devtools: 'Developer Tools',
    face_missing: 'Wajah Tidak Terdeteksi',
    multiple_faces: 'Multi-Wajah Terdeteksi',
  };

  const logsHeader = [['Nama Mahasiswa', 'Waktu', 'Tipe Pelanggaran', 'Detail']];
  const logsRows = logs.map(log => [
    log.studentName,
    new Date(log.timestamp).toLocaleString('id-ID'),
    violationTypeLabel[log.type] || log.type,
    log.details,
  ]);
  const ws4 = XLSX.utils.aoa_to_sheet(logsRows.length > 0 ? [...logsHeader, ...logsRows] : [...logsHeader, ['-', '-', '-', 'Tidak ada pelanggaran']]);
  ws4['!cols'] = [{ wch: 25 }, { wch: 22 }, { wch: 25 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Log Pelanggaran');

  // Download
  const filename = `laporan_${session.title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
};
