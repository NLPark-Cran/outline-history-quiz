import rawQuestions from '@/data/questions.json';
import rawChapters from '@/data/chapters.json';
import rawOverview from '@/data/overview.json';
import rawPlaces from '@/data/places.json';
import rawEssays from '@/data/essays.json';

export interface Question {
  id: string;
  q: string;
  o: string[];
  a: string;
  correctText: string;
  answerSource: string;
  explanation: string;
}

export interface KnowledgeItem {
  title: string;
  summary: string;
  detail: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  summary: string;
  detail: string;
  place?: string;
}

export interface ChapterMeta {
  title: string;
  subtitle: string;
  period: string;
  theme: string;
  keywords: string[];
  knowledge: KnowledgeItem[];
  timeline: TimelineEvent[];
}

export interface OverviewKnowledgeItem {
  h: string;
  p: string[];
}

export interface OverviewTimelineEvent {
  d: string;
  t: string;
  x: string;
  place?: string;
}

export interface OverviewMeta {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  knowledge: OverviewKnowledgeItem[];
  timeline: OverviewTimelineEvent[];
}

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

export const QUESTIONS = rawQuestions as Record<string, Question[]>;
export const CHAPTERS = rawChapters as Record<string, ChapterMeta>;
export const OVERVIEW = rawOverview as OverviewMeta;
export const PLACES = rawPlaces as Record<string, Place>;

export interface EssayPoint {
  title: string;
  content: string;
  pages: string;
}

export interface Essay {
  q: string;
  frame: string;
  pts: EssayPoint[];
  ai: string[] | null;
  org: string[] | null;
}

export const ESSAYS = rawEssays as Record<string, Essay[]>;
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
