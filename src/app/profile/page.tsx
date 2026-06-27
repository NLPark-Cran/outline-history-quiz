import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserStats, getWeakTopics, getMostWrongQuestions, StatsResult, WrongTopicStat } from '@/lib/data';
import { CHAPTER_KEYS, getChapterName } from '@/lib/questions';
import ProfileClient from './ProfileClient';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    returnMode?: string;
    returnChapter?: string;
    returnPosition?: string;
    returnQuestionChapter?: string;
    returnQuestionIndex?: string;
    returnCount?: string;
    returnShuffle?: string;
  }>;
}) {
  const session = await getSession();
  if (!session.user) {
    redirect('/');
  }

  let stats: StatsResult;
  let weakTopics: WrongTopicStat[];
  let mostWrong: Awaited<ReturnType<typeof getMostWrongQuestions>>;
  try {
    [stats, weakTopics, mostWrong] = await Promise.all([
      getUserStats(session.user.id),
      getWeakTopics(session.user.id),
      getMostWrongQuestions(session.user.id, 10),
    ]);
  } catch (error) {
    console.error('Failed to load profile data:', error);
    stats = { totalAnswered: 0, totalCorrect: 0, totalWrong: 0, accuracy: 0, chapterStats: {} };
    weakTopics = [];
    mostWrong = [];
  }

  const wrongKeys = mostWrong.map((m) => `${m.chapter}-${m.questionIndex}`);
  const params = await searchParams;

  return (
    <ProfileClient
      user={session.user}
      stats={stats}
      weakTopics={weakTopics}
      mostWrong={mostWrong}
      chapterKeys={CHAPTER_KEYS}
      chapterNames={Object.fromEntries(CHAPTER_KEYS.map((k) => [k, getChapterName(k)]))}
      wrongKeys={wrongKeys}
      returnMode={params.returnMode}
      returnChapter={params.returnChapter}
      returnPosition={params.returnPosition}
      returnQuestionChapter={params.returnQuestionChapter}
      returnQuestionIndex={params.returnQuestionIndex}
      returnCount={params.returnCount}
      returnShuffle={params.returnShuffle}
    />
  );
}
