import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserAnswersMap } from '@/lib/data';
import { CHAPTERS, CHAPTER_KEYS, getChapterName, CN_NUMBERS } from '@/lib/questions';
import QuizClient from './QuizClient';

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const session = await getSession();
  if (!session.user) {
    redirect('/');
  }

  const params = await searchParams;
  const initialMode = params.mode === 'wrong' ? 'wrong' : 'unit';

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
    />
  );
}
