'use server';

import { z } from 'zod';
import { requireAuth } from '@/lib/session';
import { submitAnswer as saveAnswer } from '@/lib/data';
import { getQuestion } from '@/lib/questions';

const answerSchema = z.object({
  chapter: z.string(),
  questionIndex: z.coerce.number(),
  selected: z.enum(['A', 'B', 'C', 'D']),
});

export async function submitAnswer(formData: FormData) {
  const user = await requireAuth();
  const data = answerSchema.safeParse({
    chapter: formData.get('chapter'),
    questionIndex: formData.get('questionIndex'),
    selected: formData.get('selected'),
  });

  if (!data.success) {
    return { error: 'Invalid answer data' };
  }

  const { chapter, questionIndex, selected } = data.data;
  const question = getQuestion(chapter, questionIndex);
  if (!question) {
    return { error: 'Question not found' };
  }

  const result = await saveAnswer(user.id, chapter, questionIndex, selected, question.a);
  return { success: true, isCorrect: result.isCorrect };
}
