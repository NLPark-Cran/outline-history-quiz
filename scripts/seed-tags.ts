import { db } from '@/db';
import { questionTags } from '@/db/schema';
import { CHAPTERS, QUESTIONS } from '@/lib/questions';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function scoreTag(questionText: string, tag: string, keywords: string[]): number {
  let score = 0;
  const text = questionText.toLowerCase();
  const words = tokenize(tag);
  for (const w of words) {
    if (text.includes(w)) score += 3;
  }
  for (const k of keywords) {
    if (text.includes(k.toLowerCase())) score += 1;
  }
  return score;
}

async function main() {
  // Clear existing tags
  await db.delete(questionTags);

  const inserts: { chapter: string; questionIndex: number; tag: string }[] = [];

  for (const [chapterKey, chapterMeta] of Object.entries(CHAPTERS)) {
    const questions = QUESTIONS[chapterKey];
    if (!questions) continue;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const fullText = `${q.q} ${q.o.join(' ')}`;

      let bestTag = chapterMeta.title;
      let bestScore = 0;

      for (const kp of chapterMeta.knowledge) {
        const keywords = kp.p.flatMap((p) => tokenize(p)).slice(0, 20);
        const s = scoreTag(fullText, kp.h, keywords);
        if (s > bestScore) {
          bestScore = s;
          bestTag = kp.h;
        }
      }

      inserts.push({ chapter: chapterKey, questionIndex: i, tag: bestTag });
    }
  }

  if (inserts.length > 0) {
    await db.insert(questionTags).values(inserts).onConflictDoNothing();
  }

  console.log(`Seeded ${inserts.length} question tags`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
