'use server';

import { z } from 'zod';
import { requireAuth } from '@/lib/session';
import { submitAnswer as saveAnswer, toggleMistake as saveMistake } from '@/lib/data';
import { getQuestion } from '@/lib/questions';

const answerSchema = z.object({
  chapter: z.string(),
  questionIndex: z.coerce.number(),
  selected: z.enum(['A', 'B', 'C', 'D']),
});

export type SubmitAnswerResult =
  | { success: true; isCorrect: boolean }
  | { success: false; error: string };

export async function submitAnswer(formData: FormData): Promise<SubmitAnswerResult> {
  const user = await requireAuth();
  const data = answerSchema.safeParse({
    chapter: formData.get('chapter'),
    questionIndex: formData.get('questionIndex'),
    selected: formData.get('selected'),
  });

  if (!data.success) {
    return { success: false, error: 'Invalid answer data' };
  }

  const { chapter, questionIndex, selected } = data.data;
  const question = getQuestion(chapter, questionIndex);
  if (!question) {
    return { success: false, error: 'Question not found' };
  }

  const result = await saveAnswer(user.id, chapter, questionIndex, selected, question.a);
  return { success: true, isCorrect: result.isCorrect };
}

const mistakeSchema = z.object({
  chapter: z.string(),
  questionIndex: z.coerce.number(),
  markAsWrong: z.enum(['true', 'false']),
});

export type ToggleMistakeResult =
  | { success: true; markAsWrong: boolean }
  | { success: false; error: string };

export async function toggleMistake(formData: FormData): Promise<ToggleMistakeResult> {
  const user = await requireAuth();
  const data = mistakeSchema.safeParse({
    chapter: formData.get('chapter'),
    questionIndex: formData.get('questionIndex'),
    markAsWrong: formData.get('markAsWrong'),
  });

  if (!data.success) {
    return { success: false, error: 'Invalid mistake data' };
  }

  const { chapter, questionIndex, markAsWrong } = data.data;
  const question = getQuestion(chapter, questionIndex);
  if (!question) {
    return { success: false, error: 'Question not found' };
  }

  const result = await saveMistake(user.id, chapter, questionIndex, markAsWrong === 'true', question.a);
  return { success: true, markAsWrong: result.markAsWrong };
}
