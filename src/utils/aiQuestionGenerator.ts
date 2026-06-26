import type { Question } from '../dbService';

export interface AIGenerateParams {
  subject: string;
  topic: string;
  count: number;
  difficulty: Question['difficulty'];
}

/** Stub AI generator — ganti dengan API OpenAI/Edge Function nanti */
export const generateQuestionsWithAI = async (params: AIGenerateParams): Promise<Omit<Question, 'id'>[]> => {
  await new Promise(r => setTimeout(r, 800));

  const templates = [
    {
      text: `Apa definisi utama dari "${params.topic}" dalam ${params.subject}?`,
      options: ['Konsep dasar yang benar', 'Definisi alternatif A', 'Definisi alternatif B', 'Definisi alternatif C'],
      correctAnswer: 'Konsep dasar yang benar',
      explanation: `Soal ini menguji pemahaman konsep dasar ${params.topic}.`,
    },
    {
      text: `Manakah pernyataan berikut yang BENAR tentang ${params.topic}?`,
      options: ['Pernyataan benar', 'Pernyataan salah 1', 'Pernyataan salah 2', 'Pernyataan salah 3'],
      correctAnswer: 'Pernyataan benar',
      explanation: `Review materi ${params.topic} untuk memahami perbedaan konsep.`,
    },
    {
      text: `${params.topic} merupakan bagian penting dari ${params.subject}.`,
      options: undefined,
      correctAnswer: 'true',
      explanation: `Topik ${params.topic} memang termasuk materi inti ${params.subject}.`,
      type: 'boolean' as const,
    },
  ];

  return Array.from({ length: Math.min(params.count, 10) }, (_, i) => {
    const t = templates[i % templates.length];
    return {
      subject: params.subject,
      topic: params.topic,
      type: (t as { type?: Question['type'] }).type ?? 'multiple_choice',
      text: `[AI Draft ${i + 1}] ${t.text}`,
      options: t.options,
      correctAnswer: t.correctAnswer,
      explanation: t.explanation,
      difficulty: params.difficulty,
    };
  });
};
