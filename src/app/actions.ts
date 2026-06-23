'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getOrCreateUser } from '@/lib/data';
import { z } from 'zod';

const studentIdSchema = z.string().regex(/^\d{8}$/, '请输入 8 位学号');

export async function login(prevState: unknown, formData: FormData) {
  const studentId = formData.get('studentId') as string;
  const result = studentIdSchema.safeParse(studentId);

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const user = await getOrCreateUser(studentId);
  const session = await getSession();
  session.user = { id: user.id, studentId: user.studentId };
  await session.save();

  redirect('/quiz');
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/');
}
