import rawQuestions from '@/data/questions.json';
import rawChapters from '@/data/chapters.json';

export interface Question {
  q: string;
  o: string[];
  a: string;
}

export interface KnowledgeItem {
  h: string;
  p: string[];
}

export interface TimelineEvent {
  d: string;
  t: string;
  x: string;
}

export interface ChapterMeta {
  title: string;
  subtitle: string;
  knowledge: KnowledgeItem[];
  timeline: TimelineEvent[];
}

export const QUESTIONS = rawQuestions as Record<string, Question[]>;
export const CHAPTERS = rawChapters as Record<string, ChapterMeta>;
export const CHAPTER_KEYS = Object.keys(QUESTIONS).sort((a, b) => Number(a) - Number(b));
export const TOTAL_QUESTIONS = CHAPTER_KEYS.reduce((sum, k) => sum + QUESTIONS[k].length, 0);

export const CN_NUMBERS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export function getChapterName(key: string): string {
  return `第${CN_NUMBERS[Number(key)]}章 ${CHAPTERS[key].title}`;
}

export function getQuestion(chapter: string, index: number): Question | undefined {
  return QUESTIONS[chapter]?.[index];
}

export function getChapterQuestions(chapter: string): Question[] {
  return QUESTIONS[chapter] || [];
}

export function getAllQuestions(): { chapter: string; index: number; question: Question }[] {
  const result: { chapter: string; index: number; question: Question }[] = [];
  CHAPTER_KEYS.forEach((chapter) => {
    QUESTIONS[chapter].forEach((q, index) => {
      result.push({ chapter, index, question: q });
    });
  });
  return result;
}
