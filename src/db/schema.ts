import { sqliteTable, integer, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studentId: text('student_id').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$default(() => new Date()),
}, (table) => ({
  studentIdIdx: uniqueIndex('users_student_id_idx').on(table.studentId),
}));

export const answers = sqliteTable('answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chapter: text('chapter').notNull(),
  questionIndex: integer('question_index').notNull(),
  selected: text('selected').notNull(),
  correct: text('correct').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  answeredAt: integer('answered_at', { mode: 'timestamp' }).notNull().$default(() => new Date()),
}, (table) => ({
  userChapterIdx: index('answers_user_chapter_idx').on(table.userId, table.chapter),
  userAnsweredAtIdx: index('answers_user_answered_at_idx').on(table.userId, table.answeredAt),
  questionIdx: index('answers_question_idx').on(table.chapter, table.questionIndex),
  uniqueAnswer: uniqueIndex('answers_unique_idx').on(table.userId, table.chapter, table.questionIndex),
}));

export const questionTags = sqliteTable('question_tags', {
  chapter: text('chapter').notNull(),
  questionIndex: integer('question_index').notNull(),
  tag: text('tag').notNull(),
}, (table) => ({
  pk: uniqueIndex('question_tags_pk').on(table.chapter, table.questionIndex, table.tag),
  tagIdx: index('question_tags_tag_idx').on(table.tag),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;
export type QuestionTag = typeof questionTags.$inferSelect;
