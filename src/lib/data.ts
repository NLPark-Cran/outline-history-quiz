import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, answers, questionTags } from '@/db/schema';
import { getAllQuestions } from './questions';

export async function getOrCreateUser(studentId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.studentId, studentId),
  });
  if (existing) return existing;

  const result = await db.insert(users).values({ studentId }).returning();
  return result[0];
}

export async function getUserById(id: number) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function getUserAnswers(userId: number) {
  return db.query.answers.findMany({
    where: eq(answers.userId, userId),
    orderBy: [desc(answers.answeredAt)],
  });
}

export async function getUserAnswersMap(userId: number): Promise<Map<string, { selected: string; isCorrect: boolean; answeredAt: Date }>> {
  const rows = await getUserAnswers(userId);
  const map = new Map<string, { selected: string; isCorrect: boolean; answeredAt: Date }>();
  for (const row of rows) {
    const key = `${row.chapter}-${row.questionIndex}`;
    // Keep the latest answer per question
    if (!map.has(key)) {
      map.set(key, {
        selected: row.selected,
        isCorrect: row.isCorrect,
        answeredAt: row.answeredAt,
      });
    }
  }
  return map;
}

export async function submitAnswer(
  userId: number,
  chapter: string,
  questionIndex: number,
  selected: string,
  correct: string
) {
  const isCorrect = selected === correct;
  await db
    .insert(answers)
    .values({
      userId,
      chapter,
      questionIndex,
      selected,
      correct,
      isCorrect,
    })
    .onConflictDoUpdate({
      target: [answers.userId, answers.chapter, answers.questionIndex],
      set: {
        selected,
        correct,
        isCorrect,
        answeredAt: new Date(),
      },
    });
  return { isCorrect };
}

export interface StatsResult {
  totalAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  chapterStats: Record<
    string,
    {
      total: number;
      correct: number;
      wrong: number;
      accuracy: number;
    }
  >;
}

export async function getUserStats(userId: number): Promise<StatsResult> {
  const rows = await getUserAnswers(userId);
  const chapterStats: StatsResult['chapterStats'] = {};
  let totalCorrect = 0;
  let totalWrong = 0;

  // Use latest answer per question
  const latestMap = new Map<string, { isCorrect: boolean; chapter: string }>();
  for (const row of rows) {
    const key = `${row.chapter}-${row.questionIndex}`;
    latestMap.set(key, { isCorrect: row.isCorrect, chapter: row.chapter });
  }

  for (const { chapter, isCorrect } of latestMap.values()) {
    if (!chapterStats[chapter]) {
      chapterStats[chapter] = { total: 0, correct: 0, wrong: 0, accuracy: 0 };
    }
    chapterStats[chapter].total++;
    if (isCorrect) {
      chapterStats[chapter].correct++;
      totalCorrect++;
    } else {
      chapterStats[chapter].wrong++;
      totalWrong++;
    }
  }

  for (const chapter of Object.keys(chapterStats)) {
    const s = chapterStats[chapter];
    s.accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
  }

  const totalAnswered = latestMap.size;
  return {
    totalAnswered,
    totalCorrect,
    totalWrong,
    accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    chapterStats,
  };
}

export interface WrongTopicStat {
  tag: string;
  wrongCount: number;
  totalCount: number;
  accuracy: number;
}

export async function getWeakTopics(userId: number): Promise<WrongTopicStat[]> {
  const answerRows = await getUserAnswers(userId);
  const latestMap = new Map<string, { isCorrect: boolean; chapter: string; index: number }>();
  for (const row of answerRows) {
    const key = `${row.chapter}-${row.questionIndex}`;
    latestMap.set(key, {
      isCorrect: row.isCorrect,
      chapter: row.chapter,
      index: row.questionIndex,
    });
  }

  const tagCounts = new Map<string, { total: number; correct: number }>();
  for (const { chapter, index, isCorrect } of latestMap.values()) {
    const tags = await db.query.questionTags.findMany({
      where: and(eq(questionTags.chapter, chapter), eq(questionTags.questionIndex, index)),
    });
    for (const t of tags) {
      const cur = tagCounts.get(t.tag) || { total: 0, correct: 0 };
      cur.total++;
      if (isCorrect) cur.correct++;
      tagCounts.set(t.tag, cur);
    }
  }

  const result: WrongTopicStat[] = [];
  for (const [tag, { total, correct }] of tagCounts.entries()) {
    result.push({
      tag,
      wrongCount: total - correct,
      totalCount: total,
      accuracy: Math.round((correct / total) * 100),
    });
  }
  return result.sort((a, b) => b.wrongCount - a.wrongCount);
}

export async function getMostWrongQuestions(userId: number, limit = 10) {
  const rows = await db
    .select({
      chapter: answers.chapter,
      questionIndex: answers.questionIndex,
      wrongCount: sql<number>`count(*)`.as('wrong_count'),
    })
    .from(answers)
    .where(and(eq(answers.userId, userId), eq(answers.isCorrect, false)))
    .groupBy(answers.chapter, answers.questionIndex)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    question: getAllQuestions().find((q) => q.chapter === r.chapter && q.index === r.questionIndex)?.question,
  }));
}

export async function getWrongQuestionKeys(userId: number): Promise<string[]> {
  const rows = await db.query.answers.findMany({
    where: and(eq(answers.userId, userId), eq(answers.isCorrect, false)),
  });
  const latest = new Map<string, boolean>();
  for (const row of rows) {
    const key = `${row.chapter}-${row.questionIndex}`;
    latest.set(key, row.isCorrect);
  }
  return Array.from(latest.entries())
    .filter(([, isCorrect]) => !isCorrect)
    .map(([key]) => key);
}
