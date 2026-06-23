import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserStats, getWeakTopics, getMostWrongQuestions } from '@/lib/data';
import { CHAPTERS, CHAPTER_KEYS, getChapterName } from '@/lib/questions';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session.user) {
    redirect('/');
  }

  const [stats, weakTopics, mostWrong] = await Promise.all([
    getUserStats(session.user.id),
    getWeakTopics(session.user.id),
    getMostWrongQuestions(session.user.id, 10),
  ]);

  const wrongKeys = mostWrong.map((m) => `${m.chapter}-${m.questionIndex}`);

  return (
    <ProfileClient
      user={session.user}
      stats={stats}
      weakTopics={weakTopics}
      mostWrong={mostWrong}
      chapters={CHAPTERS}
      chapterKeys={CHAPTER_KEYS}
      chapterNames={Object.fromEntries(CHAPTER_KEYS.map((k) => [k, getChapterName(k)]))}
      wrongKeys={wrongKeys}
    />
  );
}
