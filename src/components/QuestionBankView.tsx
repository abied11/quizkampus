import React, { useState } from 'react';
import { dbSaveQuestion, dbDeleteQuestion, dbBulkUploadQuestions } from '../dbService';
import type { Question } from '../dbService';
import { Search, Plus, Trash2, Edit2, Upload, Download, Check, AlertCircle, X, HelpCircle, GraduationCap, Link2, PlusCircle, MinusCircle } from 'lucide-react';
import { useAppContext } from '../AppContext';

export const QuestionBankView: React.FC = () => {
  const { questions, refreshQuestions } = useAppContext();
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

  // CSV Bulk upload states
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
          <button
            onClick={() => setShowCSVUpload(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
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
    </div>
  );
};
