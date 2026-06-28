import React, { useState } from 'react';
import { dbSaveQuestion, dbDeleteQuestion, dbBulkUploadQuestions } from '../dbService';
import type { Question } from '../dbService';
import { Package, Search, Plus, Trash2, Edit2, Upload, Download, Check, AlertCircle, X, HelpCircle, GraduationCap, Link2, PlusCircle, MinusCircle, Sparkles, FileSpreadsheet } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { generateQuestionsWithAI } from '../utils/aiQuestionGenerator';
import * as XLSX from 'xlsx';
import { dbCreatePackage, dbDeletePackage, dbUpdatePackage } from '../dbService';

export const QuestionBankView: React.FC<{ currentUser?: import('../dbService').User }> = ({ currentUser }) => {
  const { questions, refreshQuestions, packages, refreshPackages } = useAppContext();
  const [activeMainTab, setActiveMainTab] = useState<'soal' | 'paket'>('soal');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<Question['type']>('multiple_choice');
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<Question['difficulty']>('medium');
  const [isSaving, setIsSaving] = useState(false);

  // Package Form states
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | undefined>(undefined);
  const [packageTitle, setPackageTitle] = useState('');
  const [packageDesc, setPackageDesc] = useState('');
  const [packageImageUrl, setPackageImageUrl] = useState('');
  const [packageQuestions, setPackageQuestions] = useState<string[]>([]);
  const [packageSearch, setPackageSearch] = useState('');

  // CSV Bulk upload states
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiSubject, setAiSubject] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState<Question['difficulty']>('medium');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<Omit<Question, 'id'>[]>([]);

  // Text Copy-Paste Auto-Parse states
  const [showTextImport, setShowTextImport] = useState(false);
  const [importTextContent, setImportTextContent] = useState('');
  const [importTextSubject, setImportTextSubject] = useState('');
  const [importTextTopic, setImportTextTopic] = useState('');
  const [parsedDrafts, setParsedDrafts] = useState<Omit<Question, 'id'>[]>([]);

  // Matching pairs state: [{left, right}]
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([
    { left: '', right: '' },
    { left: '', right: '' },
  ]);

  const handleOpenNewForm = () => {
    setEditingId(undefined);
    setSubject('');
    setTopic('');
    setType('multiple_choice');
    setText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setExplanation('');
    setDifficulty('medium');
    setMatchingPairs([{ left: '', right: '' }, { left: '', right: '' }]);
    setShowForm(true);
  };

  const handleOpenEditForm = (q: Question) => {
    setEditingId(q.id);
    setSubject(q.subject);
    setTopic(q.topic);
    setType(q.type);
    setText(q.text);
    setOptions(q.options ? [...q.options] : ['', '', '', '']);
    setCorrectAnswer(q.correctAnswer);
    setExplanation(q.explanation);
    setDifficulty(q.difficulty);
    // Parse matching pairs from options if matching
    if (q.type === 'matching' && q.options) {
      const pairs = q.options.map(o => {
        const [left, right] = o.split('|');
        return { left: left?.trim() || '', right: right?.trim() || '' };
      });
      setMatchingPairs(pairs.length > 0 ? pairs : [{ left: '', right: '' }]);
    } else {
      setMatchingPairs([{ left: '', right: '' }, { left: '', right: '' }]);
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
      try {
        await dbDeleteQuestion(id);
        await refreshQuestions();
      } catch (err: any) {
        alert('Gagal menghapus soal: ' + err.message);
      }
    }
  };

  const handleOpenNewPackageForm = () => {
    setEditingPackageId(undefined);
    setPackageTitle('');
    setPackageDesc('');
    setPackageImageUrl('');
    setPackageQuestions([]);
    setShowPackageForm(true);
  };

  const handleOpenEditPackageForm = (pkg: import('../dbService').QuestionPackage) => {
    setEditingPackageId(pkg.id);
    setPackageTitle(pkg.title);
    setPackageDesc(pkg.description);
    setPackageImageUrl(pkg.imageUrl || '');
    setPackageQuestions([...pkg.questions]);
    setShowPackageForm(true);
  };

  const handleDeletePackage = async (id: string) => {
    if (confirm('Yakin ingin menghapus paket soal ini?')) {
      try {
        await dbDeletePackage(id);
        await refreshPackages();
      } catch (err: any) {
        alert('Gagal menghapus paket: ' + err.message);
      }
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageTitle) {
      alert('Judul paket wajib diisi.');
      return;
    }
    if (packageQuestions.length === 0) {
      alert('Pilih minimal 1 soal untuk dimasukkan ke paket.');
      return;
    }
    if (!currentUser) {
      alert('Sesi pengguna tidak valid.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingPackageId) {
        await dbUpdatePackage(editingPackageId, {
          title: packageTitle,
          description: packageDesc,
          imageUrl: packageImageUrl || undefined,
          questions: packageQuestions,
        });
      } else {
        await dbCreatePackage(packageTitle, packageDesc, packageQuestions, currentUser.id, packageImageUrl || undefined);
      }
      setShowPackageForm(false);
      await refreshPackages();
    } catch (err: any) {
      alert('Gagal menyimpan paket: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !topic || !text) {
      alert('Semua kolom utama wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      if (type === 'matching') {
        const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
        if (validPairs.length < 2) {
          alert('Soal menjodohkan memerlukan minimal 2 pasangan.');
          setIsSaving(false);
          return;
        }
        // Build options as ["left|right", ...] and correctAnswer as JSON
        const savedOptions = validPairs.map(p => `${p.left.trim()}|${p.right.trim()}`);
        const correctMap: Record<string, string> = {};
        validPairs.forEach(p => { correctMap[p.left.trim()] = p.right.trim(); });
        await dbSaveQuestion({
          id: editingId, subject, topic, type, text,
          options: savedOptions,
          correctAnswer: JSON.stringify(correctMap),
          explanation, difficulty,
        });
      } else {
        if (!correctAnswer) {
          alert('Kunci jawaban wajib diisi.');
          setIsSaving(false);
          return;
        }

        const savedOptions = type === 'multiple_choice' 
          ? options.filter(o => o.trim() !== '') 
          : undefined;

        if (type === 'multiple_choice' && (!savedOptions || savedOptions.length < 2)) {
          alert('Untuk tipe Pilihan Ganda, minimal isi 2 opsi jawaban.');
          setIsSaving(false);
          return;
        }

        await dbSaveQuestion({
          id: editingId,
          subject,
          topic,
          type,
          text,
          options: savedOptions,
          correctAnswer,
          explanation,
          difficulty,
        });
      }

      setShowForm(false);
      await refreshQuestions();
    } catch (err: any) {
      alert('Gagal menyimpan soal: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      alert('Tempelkan isi CSV terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await dbBulkUploadQuestions(csvContent);
      setUploadResult({ success: res.successCount, errors: res.errors });
      setCsvContent('');
      await refreshQuestions();
    } catch (err: any) {
      alert('Gagal mengunggah soal: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // CSV Template helper
  const downloadTemplate = () => {
    const header = 'Subject,Topic,Type,Text,Options(semicolon separated),CorrectAnswer,Explanation,Difficulty\n';
    const sampleRow = 'Pemrograman Web,React JS,multiple_choice,Manakah hook dasar React untuk state?,useContext;useState;useEffect,useState,useState hook menyimpan state lokal,easy\n';
    const sampleRow2 = 'Pemrograman Web,JavaScript,boolean,const membuat nilai tidak berubah sama sekali, ,false,const membatasi reassignment bukan mutasi objek,medium\n';
    const blob = new Blob([header + sampleRow + sampleRow2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_soal_kuis.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unique subjects for filters
  const subjects = Array.from(new Set(questions.map(q => q.subject)));

  // Filter questions
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_csv(sheet);
      const res = await dbBulkUploadQuestions(rows);
      setUploadResult({ success: res.successCount, errors: res.errors });
      await refreshQuestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal import Excel');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAIGenerate = async () => {
    if (!aiSubject || !aiTopic) return;
    setAiGenerating(true);
    try {
      setAiPreview(await generateQuestionsWithAI({ subject: aiSubject, topic: aiTopic, count: aiCount, difficulty: aiDifficulty }));
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAIPreview = async () => {
    for (const q of aiPreview) {
      await dbSaveQuestion(q);
    }
    await refreshQuestions();
    setShowAIGenerator(false);
    setAiPreview([]);
  };

  // Parsing engine for raw text copy-paste
  const parseTextToQuestions = (textStr: string, subj: string, topicStr: string) => {
    // Regex matches common question starters: 1. or 1) or Soal 1:
    const questionBlocks = textStr.split(/(?=\b\d+[\.\)\-]\s+)|(?=\bSoal\s*\d+[\.\)\-]?\s+)/gi)
      .map(b => b.trim())
      .filter(Boolean);
    
    const results: Omit<Question, 'id'>[] = [];

    for (const block of questionBlocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) continue;

      // First line is the question text (remove prefix number)
      let qText = lines[0].replace(/^\s*(?:Soal\s*)?\d+[\.\)\-]?\s*/gi, '').trim();
      const optLines: string[] = [];
      let correct = '';
      let expl = '';
      let diff: Question['difficulty'] = 'medium';
      let textEnded = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Match option pattern e.g., A. Option text, B) Option, etc.
        const optMatch = line.match(/^\s*([A-Ea-e])[\.\)\-\s]\s*(.*)/i);
        
        if (optMatch) {
          textEnded = true;
          optLines.push(optMatch[2].trim());
        } else if (line.toLowerCase().startsWith('kunci:') || line.toLowerCase().startsWith('jawaban:') || line.toLowerCase().startsWith('answer:') || line.toLowerCase().startsWith('key:')) {
          textEnded = true;
          correct = line.replace(/^\s*(?:kunci|jawaban|answer|key):\s*/gi, '').trim();
        } else if (line.toLowerCase().startsWith('pembahasan:') || line.toLowerCase().startsWith('penjelasan:') || line.toLowerCase().startsWith('explanation:')) {
          textEnded = true;
          expl = line.replace(/^\s*(?:pembahasan|penjelasan|explanation):\s*/gi, '').trim();
        } else if (line.toLowerCase().startsWith('kesulitan:') || line.toLowerCase().startsWith('difficulty:')) {
          textEnded = true;
          const dText = line.replace(/^\s*(?:kesulitan|difficulty):\s*/gi, '').trim().toLowerCase();
          if (dText.includes('easy') || dText.includes('mudah')) diff = 'easy';
          else if (dText.includes('hard') || dText.includes('sulit')) diff = 'hard';
          else diff = 'medium';
        } else {
          // If option/metadata has not started, treat as part of multiline question text
          if (!textEnded) {
            qText += ' ' + line;
          }
        }
      }

      let qType: Question['type'] = 'multiple_choice';
      if (optLines.length === 0) {
        if (correct.toLowerCase() === 'true' || correct.toLowerCase() === 'false' || correct.toLowerCase() === 'benar' || correct.toLowerCase() === 'salah') {
          qType = 'boolean';
          correct = (correct.toLowerCase() === 'true' || correct.toLowerCase() === 'benar') ? 'true' : 'false';
        } else {
          qType = 'essay';
        }
      } else {
        // If answer was specified as a single letter choice, match with options
        const matchLetter = correct.match(/^\s*([A-Ea-e])\s*$/);
        if (matchLetter) {
          const idx = matchLetter[1].toUpperCase().charCodeAt(0) - 65;
          if (optLines[idx]) {
            correct = optLines[idx];
          }
        }
      }

      results.push({
        subject: subj || 'Umum',
        topic: topicStr || 'Umum',
        type: qType,
        text: qText,
        options: optLines.length ? optLines : undefined,
        correctAnswer: correct,
        explanation: expl,
        difficulty: diff,
      });
    }
    return results;
  };

  const handleParseText = () => {
    if (!importTextContent.trim()) {
      alert('Tempelkan isi salinan teks terlebih dahulu.');
      return;
    }
    const parsed = parseTextToQuestions(importTextContent, importTextSubject, importTextTopic);
    if (parsed.length === 0) {
      alert('Tidak ditemukan format soal kuis yang valid. Gunakan format seperti 1. Pertanyaan ...');
      return;
    }
    setParsedDrafts(parsed);
  };

  const handleSaveParsed = async () => {
    if (parsedDrafts.length === 0) return;
    setIsSaving(true);
    try {
      for (const q of parsedDrafts) {
        await dbSaveQuestion(q);
      }
      await refreshQuestions();
      setShowTextImport(false);
      setParsedDrafts([]);
      setImportTextContent('');
      alert(`Berhasil mengimpor ${parsedDrafts.length} soal kuis ke bank soal.`);
    } catch (err: unknown) {
      alert('Gagal mengimpor soal: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.text.toLowerCase().includes(search.toLowerCase()) || 
                        q.topic.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectFilter === '' || q.subject === subjectFilter;
    const matchDiff = difficultyFilter === '' || q.difficulty === difficultyFilter;
    return matchSearch && matchSubject && matchDiff;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Bank Soal Kuis</h2>
          <p className="text-slate-400 text-sm mt-1">
            Kelola koleksi soal kuis, tambahkan manual, atau unggah secara massal.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <label className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} disabled={isUploading} />
          </label>
          <button
            onClick={() => setShowAIGenerator(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-sm font-semibold flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate AI
          </button>
          <button
            onClick={() => setShowTextImport(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 btn-press"
          >
            <Upload className="h-4 w-4" />
            Tempel Teks Soal
          </button>
          <button
            onClick={() => setShowCSVUpload(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 btn-press"
          >
            <Upload className="h-4 w-4" />
            Unggah Masal CSV
          </button>
          
          <button
            onClick={handleOpenNewForm}
            className="px-4 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-uir-green-dark/25 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Tambah Soal Baru
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveMainTab('soal')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all ${activeMainTab === 'soal' ? 'bg-slate-800 text-uir-green-muted border-b-2 border-uir-green-medium' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Daftar Soal
        </button>
        <button
          onClick={() => setActiveMainTab('paket')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all ${activeMainTab === 'paket' ? 'bg-slate-800 text-uir-green-muted border-b-2 border-uir-green-medium' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Paket Soal
        </button>
      </div>

      {activeMainTab === 'soal' && (
        <>
          {/* Filter and Search Panel */}
          <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-3 border border-slate-800">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari soal berdasarkan isi teks atau topik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
          />
        </div>
        
        <div className="flex gap-2 min-w-[280px]">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl glass-input text-sm"
          >
            <option value="">Semua Mata Kuliah</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl glass-input text-sm"
          >
            <option value="">Semua Kesulitan</option>
            <option value="easy">Mudah</option>
            <option value="medium">Sedang</option>
            <option value="hard">Sulit</option>
          </select>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-slate-800/80">
            <HelpCircle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-300">Tidak ada soal ditemukan</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              Cobalah sesuaikan kata kunci pencarian Anda atau tambahkan soal kuis baru ke bank soal.
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div
              key={q.id}
              className="glass-card rounded-2xl p-5 border border-slate-800/60 hover:border-slate-700/80 transition-all flex flex-col md:flex-row gap-4 justify-between"
            >
              <div className="space-y-3 flex-1">
                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-medium border border-slate-700/50">
                    {q.subject}
                  </span>
                  <span className="bg-uir-green-darker/40 text-uir-green-muted px-2.5 py-1 rounded-full font-medium border border-uir-green-medium/10">
                    Topik: {q.topic}
                  </span>
                  
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    q.type === 'multiple_choice' ? 'bg-uir-yellow-gold/15 text-uir-yellow-gold border border-uir-yellow-gold/20' :
                    q.type === 'boolean' ? 'bg-uir-yellow-hover/15 text-uir-yellow-accent border border-uir-yellow-hover/20' :
                    q.type === 'matching' ? 'bg-uir-green-bright/15 text-uir-green-muted border border-uir-green-bright/20' :
                    'bg-uir-green-medium/15 text-uir-green-muted border border-uir-green-medium/20'
                  }`}>
                    {q.type === 'multiple_choice' ? 'Pilihan Ganda' :
                     q.type === 'boolean' ? 'Benar/Salah' :
                     q.type === 'matching' ? 'Menjodohkan' : 'Essay'}
                  </span>

                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    q.difficulty === 'easy' ? 'bg-emerald-900/40 text-emerald-300' :
                    q.difficulty === 'medium' ? 'bg-amber-900/40 text-amber-300' : 'bg-red-900/40 text-red-300'
                  }`}>
                    {q.difficulty === 'easy' ? 'Mudah' : q.difficulty === 'medium' ? 'Sedang' : 'Sulit'}
                  </span>
                </div>

                {/* Question Text */}
                <p className="text-slate-100 font-medium text-base leading-relaxed">
                  {q.text}
                </p>

                {/* Options if MC */}
                {q.type === 'multiple_choice' && q.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {q.options.map((opt, idx) => {
                      const optLabel = String.fromCharCode(65 + idx); // A, B, C, D...
                      const isCorrect = opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl text-sm flex items-center gap-2 border ${
                            isCorrect 
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                              : 'bg-slate-900/30 border-slate-800/80 text-slate-300'
                          }`}
                        >
                          <span className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-bold ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {optLabel}
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Options if Matching */}
                {q.type === 'matching' && q.options && (
                  <div className="mt-2 space-y-1.5">
                    {q.options.map((opt, idx) => {
                      const [left, right] = opt.split('|');
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="px-3 py-1.5 rounded-lg bg-uir-green-darker/30 border border-uir-green-medium/20 text-uir-green-muted flex-1">{left?.trim()}</span>
                          <Link2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-200 flex-1">{right?.trim()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Options if Boolean */}
                {q.type === 'boolean' && (
                  <div className="flex gap-2 mt-2">
                    {['true', 'false'].map((val) => {
                      const isCorrect = val === q.correctAnswer;
                      return (
                        <div
                          key={val}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border uppercase ${
                            isCorrect 
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                              : 'bg-slate-900/30 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          {val === 'true' ? 'Benar' : 'Salah'}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Answer and Explanation */}
                <div className="p-3.5 rounded-xl bg-slate-900/30 border border-slate-850 mt-3 text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-slate-200">
                    Kunci Jawaban:{' '}
                    <span className="text-emerald-400 font-bold">
                      {q.type === 'boolean' 
                        ? (q.correctAnswer === 'true' ? 'Benar' : 'Salah') 
                        : q.correctAnswer}
                    </span>
                  </div>
                  {q.explanation && (
                    <div className="text-slate-400 mt-1 leading-relaxed">
                      <span className="font-medium text-slate-350">Penjelasan:</span> {q.explanation}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex md:flex-col justify-end gap-2 shrink-0 self-end md:self-start">
                <button
                  onClick={() => handleOpenEditForm(q)}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-uir-green-medium/30 text-uir-yellow-gold hover:bg-slate-850 transition-colors"
                  title="Edit Soal"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/30 text-red-400 hover:bg-red-950/20 transition-colors"
                  title="Hapus Soal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      </>
      )}

      {/* PAKET SOAL TAB */}
      {activeMainTab === 'paket' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-uir-green-medium" />
              Daftar Paket Soal
            </h3>
            <button
              onClick={handleOpenNewPackageForm}
              className="px-4 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-uir-green-dark/25 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Buat Paket Baru
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.length === 0 ? (
              <div className="col-span-full glass rounded-2xl p-12 text-center border border-slate-800/80">
                <Package className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-300">Belum ada paket soal</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                  Buat paket soal untuk mengelompokkan soal kuis agar lebih mudah dipilih.
                </p>
              </div>
            ) : (
              packages.map(pkg => (
                <div key={pkg.id} className="glass-card rounded-2xl p-0 border border-slate-800/60 overflow-hidden hover:border-slate-700/80 transition-all flex flex-col group relative">
                  <div className="h-32 w-full bg-slate-900 relative">
                    {pkg.imageUrl ? (
                      <img src={pkg.imageUrl} alt={pkg.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <Package className="h-10 w-10 text-slate-700" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEditPackageForm(pkg)} className="p-1.5 bg-slate-900/80 backdrop-blur rounded-lg text-uir-yellow-gold hover:text-white hover:bg-slate-800">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeletePackage(pkg.id)} className="p-1.5 bg-red-950/80 backdrop-blur rounded-lg text-red-400 hover:text-white hover:bg-red-900">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h4 className="text-base font-bold text-white mb-1 line-clamp-1">{pkg.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 flex-1">{pkg.description || 'Tidak ada deskripsi'}</p>
                    <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">
                        <span className="text-white">{pkg.questions.length}</span> Soal
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-uir-green-darker/40 text-uir-green-muted border border-uir-green-medium/10">
                        Paket
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL FORM: Add / Edit Package */}
      {showPackageForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl w-full max-w-4xl border border-slate-800 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-900/35">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-uir-green-medium" />
                {editingPackageId ? 'Edit Paket Soal' : 'Buat Paket Soal Baru'}
              </h3>
              <button
                onClick={() => setShowPackageForm(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-6 space-y-4 flex-1 flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Judul Paket</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Paket UTS PBO"
                    value={packageTitle}
                    onChange={(e) => setPackageTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">URL Gambar (Opsional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={packageImageUrl}
                    onChange={(e) => setPackageImageUrl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Deskripsi (Opsional)</label>
                <textarea
                  placeholder="Keterangan mengenai paket ini..."
                  value={packageDesc}
                  onChange={(e) => setPackageDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm resize-none h-20"
                />
              </div>

              <div className="flex-1 border border-slate-800 rounded-xl overflow-hidden flex flex-col mt-2 min-h-[300px]">
                <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-white">Pilih Soal ({packageQuestions.length} terpilih)</h4>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Cari soal..." 
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg glass-input text-xs"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-64">
                  {questions
                    .filter(q => q.text.toLowerCase().includes(packageSearch.toLowerCase()) || q.topic.toLowerCase().includes(packageSearch.toLowerCase()))
                    .map(q => (
                    <label key={q.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${packageQuestions.includes(q.id) ? 'bg-uir-green-medium/10 border-uir-green-medium/30' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}>
                      <input 
                        type="checkbox" 
                        className="mt-1"
                        checked={packageQuestions.includes(q.id)}
                        onChange={(e) => {
                          if (e.target.checked) setPackageQuestions([...packageQuestions, q.id]);
                          else setPackageQuestions(packageQuestions.filter(id => id !== q.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{q.text}</p>
                        <p className="text-xs text-slate-400 truncate">{q.subject} - {q.topic}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPackageForm(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 text-sm font-semibold btn-press"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold transition-all active:scale-95 btn-press"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM: Add / Edit Question */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl w-full max-w-2xl border border-slate-800 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-900/35">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-uir-green-medium" />
                {editingId ? 'Edit Soal Ujian' : 'Tambah Soal Ujian Baru'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Mata Kuliah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pemrograman Web"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Topik Materi
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: React Hook"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Tipe Soal
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value as Question['type'];
                      setType(newType);
                      // Default answer initialization
                      if (newType === 'boolean') {
                        setCorrectAnswer('true');
                      } else if (newType === 'matching') {
                        setCorrectAnswer('');
                        setMatchingPairs([{ left: '', right: '' }, { left: '', right: '' }]);
                      } else {
                        setCorrectAnswer('');
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                  >
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="boolean">Benar / Salah</option>
                    <option value="essay">Essay / Isian Singkat</option>
                    <option value="matching">Menjodohkan (Matching)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Question['difficulty'])}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                  >
                    <option value="easy">Mudah</option>
                    <option value="medium">Sedang</option>
                    <option value="hard">Sulit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Pertanyaan
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ketikkan isi pertanyaan Anda di sini..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              {/* Multiple Choice Options Form */}
              {type === 'multiple_choice' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Opsi Jawaban & Kunci Jawaban
                  </label>
                  
                  <div className="space-y-2">
                    {options.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx);
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCorrectAnswer(opt)}
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm border transition-all ${
                              correctAnswer && opt && correctAnswer.trim().toLowerCase() === opt.trim().toLowerCase()
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                            title="Klik untuk jadikan ini Kunci Jawaban"
                          >
                            {label}
                          </button>
                          
                          <input
                            type="text"
                            required
                            placeholder={`Isi opsi jawaban ${label}...`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...options];
                              const oldVal = newOpts[idx];
                              newOpts[idx] = e.target.value;
                              setOptions(newOpts);
                              // If this was the correct answer, update the reference
                              if (correctAnswer === oldVal) {
                                setCorrectAnswer(e.target.value);
                              }
                            }}
                            className="flex-1 px-3 py-2 rounded-xl glass-input text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  <p className="text-[10px] text-slate-400">
                    *Tip: Ketikkan teks opsi jawaban di sebelah kanan, dan tekan tombol huruf (A, B, C, D) di kiri untuk menetapkannya sebagai kunci jawaban.
                  </p>
                </div>
              )}

              {/* Boolean Answer Form */}
              {type === 'boolean' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Kunci Jawaban Benar/Salah
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer('true')}
                      className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        correctAnswer === 'true'
                          ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400 font-bold'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      BENAR
                    </button>
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer('false')}
                      className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        correctAnswer === 'false'
                          ? 'bg-red-600/15 border-red-500 text-red-400 font-bold'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      SALAH
                    </button>
                  </div>
                </div>
              )}

              {/* Matching Pairs Form */}
              {type === 'matching' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Pasangan Jawaban (Kiri ↔ Kanan)
                    </label>
                    <button
                      type="button"
                      onClick={() => setMatchingPairs(p => [...p, { left: '', right: '' }])}
                      className="flex items-center gap-1 text-xs text-uir-yellow-gold hover:text-uir-yellow-accent font-semibold"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Tambah Pasangan
                    </button>
                  </div>
                  <div className="space-y-2">
                    {matchingPairs.map((pair, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Item A${idx + 1}`}
                          value={pair.left}
                          onChange={e => {
                            const np = [...matchingPairs];
                            np[idx] = { ...np[idx], left: e.target.value };
                            setMatchingPairs(np);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl glass-input text-sm"
                        />
                        <Link2 className="h-4 w-4 text-slate-500 shrink-0" />
                        <input
                          type="text"
                          placeholder={`Pasangan B${idx + 1}`}
                          value={pair.right}
                          onChange={e => {
                            const np = [...matchingPairs];
                            np[idx] = { ...np[idx], right: e.target.value };
                            setMatchingPairs(np);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl glass-input text-sm"
                        />
                        {matchingPairs.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setMatchingPairs(p => p.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    *Isi semua kolom kiri dan kanan. Mahasiswa akan memasangkan item kolom A ke kolom B.
                  </p>
                </div>
              )}

              {/* Essay Answer Form */}
              {type === 'essay' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Kunci Jawaban Singkat
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: grid-template-columns (tidak case-sensitive)"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Catatan: Jawaban essay diverifikasi dengan membandingkan teks jawaban mahasiswa (tidak sensitif terhadap huruf kapital/spasi).
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Penjelasan Pembahasan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ketikkan alasan kunci jawaban atau cara pengerjaan untuk pembahasan mahasiswa..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 text-sm font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM: CSV Bulk Upload */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl w-full max-w-xl border border-slate-800 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-900/35">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-uir-green-medium" />
                Unggah Soal Massal via CSV
              </h3>
              <button
                onClick={() => {
                  setShowCSVUpload(false);
                  setUploadResult(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCSVUpload} className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">
                  Unduh template CSV, isi soal di Excel/Text Editor, lalu tempelkan teksnya di bawah.
                </p>
                
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="shrink-0 text-xs text-uir-yellow-gold hover:text-uir-yellow-accent font-semibold flex items-center gap-1.5"
                >
                  <Download className="h-3 w-3" />
                  Template CSV
                </button>
              </div>

              {!uploadResult ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Tempel Data CSV (Termasuk Header)
                  </label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Subject,Topic,Type,Text,Options(semicolon separated),CorrectAnswer,Explanation,Difficulty&#10;Matematika,Aljabar,multiple_choice,1+1=?,1;2;3,2,Aljabar dasar,easy"
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-mono leading-normal"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-850 space-y-2">
                    <h4 className="text-sm font-semibold text-slate-200">Hasil Impor Data:</h4>
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <Check className="h-4 w-4" />
                      <span>Berhasil mengimpor <strong>{uploadResult.success}</strong> soal kuis.</span>
                    </div>

                    {uploadResult.errors.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Ditemukan {uploadResult.errors.length} masalah / baris dilewati:</span>
                        </div>
                        <ul className="pl-5 list-disc text-[11px] text-slate-400 max-h-32 overflow-y-auto space-y-1">
                          {uploadResult.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setUploadResult(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold hover:bg-slate-850"
                  >
                    Unggah Lagi
                  </button>
                </div>
              )}

              {!uploadResult && (
                <div className="flex gap-2 justify-end pt-3 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setShowCSVUpload(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 text-sm font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? 'Mengimpor...' : 'Impor Soal CSV'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {/* AI Generator Modal */}
      {showAIGenerator && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl w-full max-w-lg border border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" /> Generate Soal dengan AI
              </h3>
              <button onClick={() => setShowAIGenerator(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <input placeholder="Mata Kuliah" value={aiSubject} onChange={e => setAiSubject(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
            <input placeholder="Topik" value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min={1} max={10} value={aiCount} onChange={e => setAiCount(+e.target.value)} className="px-3 py-2.5 rounded-xl glass-input text-sm" />
              <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value as Question['difficulty'])} className="px-3 py-2.5 rounded-xl glass-input text-sm">
                <option value="easy">Mudah</option>
                <option value="medium">Sedang</option>
                <option value="hard">Sulit</option>
              </select>
            </div>
            <button onClick={handleAIGenerate} disabled={aiGenerating} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
              {aiGenerating ? 'Menghasilkan...' : 'Generate Draft'}
            </button>
            {aiPreview.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-2 text-xs text-slate-300">
                {aiPreview.map((q, i) => <p key={i}>• {q.text}</p>)}
              </div>
            )}
            {aiPreview.length > 0 && (
              <button onClick={handleSaveAIPreview} className="w-full py-2.5 rounded-xl bg-uir-green-medium text-white text-sm font-semibold">
                Simpan {aiPreview.length} Soal ke Bank
              </button>
            )}
          </div>
        </div>
      )}
      {/* Text Copy-Paste Auto-Parse Modal */}
      {showTextImport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl w-full max-w-2xl border border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-900/35">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-uir-green-medium animate-pulse" />
                Tempel Salinan Teks Soal
              </h3>
              <button
                onClick={() => {
                  setShowTextImport(false);
                  setParsedDrafts([]);
                  setImportTextContent('');
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-slate-400">
                Tempelkan kumpulan soal kuis Anda di bawah. Parser otomatis akan memisahkan pertanyaan, opsi, kunci jawaban, dan pembahasan.
              </p>

              {/* Subject & Topic Defaults */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mata Kuliah Default</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pemrograman Web"
                    value={importTextSubject}
                    onChange={e => setImportTextSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Topik Default</label>
                  <input
                    type="text"
                    placeholder="Contoh: JavaScript"
                    value={importTextTopic}
                    onChange={e => setImportTextTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              {parsedDrafts.length === 0 ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teks Soal</label>
                  <textarea
                    rows={10}
                    placeholder="Contoh format teks:&#10;1. Ibu kota Indonesia adalah...&#10;A. Jakarta&#10;B. Bandung&#10;C. Surabaya&#10;Jawaban: A&#10;Pembahasan: Jakarta adalah ibu kota negara.&#10;&#10;2. React dikembangkan oleh Facebook.&#10;a. Benar&#10;b. Salah&#10;Jawaban: A"
                    value={importTextContent}
                    onChange={e => setImportTextContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono leading-relaxed"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Preview Draft Hasil Parse ({parsedDrafts.length} Soal)
                    </h4>
                    <button
                      onClick={() => setParsedDrafts([])}
                      className="text-xs text-uir-yellow-gold hover:underline"
                    >
                      Edit Teks Mentah
                    </button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {parsedDrafts.map((q, idx) => {
                      const hasErr = q.type === 'multiple_choice' && (!q.options || q.options.length < 2);
                      return (
                        <div
                          key={idx}
                          className={`parsed-question-card ${hasErr ? 'has-error' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                              #{idx + 1} • {q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'boolean' ? 'Benar/Salah' : 'Essay'}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">{q.difficulty}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-200 mt-2">{q.text}</p>
                          {q.options && (
                            <ul className="mt-2 pl-4 list-disc text-xs text-slate-400 space-y-0.5">
                              {q.options.map((opt, oIdx) => (
                                <li key={oIdx} className={opt === q.correctAnswer ? 'text-emerald-400 font-bold' : ''}>
                                  {opt}
                                </li>
                              ))}
                            </ul>
                          )}
                          {!q.options && q.type !== 'essay' && (
                            <p className="text-xs text-emerald-400 font-bold mt-1">Kunci: {q.correctAnswer}</p>
                          )}
                          {q.explanation && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">💡 {q.explanation}</p>
                          )}
                          {hasErr && (
                            <p className="text-[10px] text-red-400 mt-2">⚠️ Error: Opsi jawaban kurang dari 2.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-850 bg-slate-900/20 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowTextImport(false);
                  setParsedDrafts([]);
                  setImportTextContent('');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 text-sm font-semibold btn-press"
              >
                Batal
              </button>
              {parsedDrafts.length === 0 ? (
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-5 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold transition-all active:scale-95 btn-press"
                >
                  Parse Teks Soal
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveParsed}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-uir-green-medium hover:bg-uir-green-dark text-white text-sm font-semibold transition-all active:scale-95 btn-press"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Semua Soal'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
