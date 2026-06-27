import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserAnswersMap } from '@/lib/data';
import { CHAPTERS, CHAPTER_KEYS, getChapterName } from '@/lib/questions';
import QuizClient from './QuizClient';

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ mode?: string; chapter?: string; position?: string; returnQuestionChapter?: string; returnQuestionIndex?: string; returnCount?: string; returnShuffle?: string }> }) {
  const session = await getSession();
  if (!session.user) {
    redirect('/');
  }

  const params = await searchParams;
  const initialMode = params.mode === 'wrong' ? 'wrong' : params.mode === 'full' ? 'full' : 'unit';
  const initialChapter = params.chapter && CHAPTER_KEYS.includes(params.chapter) ? params.chapter : CHAPTER_KEYS[0];
  const initialPosition = Math.max(0, parseInt(params.position || '0', 10) || 0);

  const answersMap = await getUserAnswersMap(session.user.id);

  return (
    <QuizClient
      user={session.user}
      initialAnswers={Object.fromEntries(
        Array.from(answersMap.entries()).map(([key, value]) => [
          key,
          { selected: value.selected, isCorrect: value.isCorrect },
        ])
      )}
      chapters={CHAPTERS}
      chapterKeys={CHAPTER_KEYS}
      chapterNames={Object.fromEntries(CHAPTER_KEYS.map((k) => [k, getChapterName(k)]))}
      initialMode={initialMode}
      initialChapter={initialChapter}
      initialPosition={initialPosition}
      initialQuestionChapter={params.returnQuestionChapter}
      initialQuestionIndex={params.returnQuestionIndex ? parseInt(params.returnQuestionIndex, 10) : undefined}
      initialCount={['10', '20', '50', 'all'].includes(params.returnCount || '') ? params.returnCount : 'all'}
      initialShuffle={params.returnShuffle === 'true'}
    />
  );
}
