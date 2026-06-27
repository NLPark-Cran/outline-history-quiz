import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  user?: {
    id: number;
    studentId: string;
  };
}

export async function getSession() {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error('SESSION_PASSWORD environment variable must be at least 32 characters long');
  }
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    password,
    cookieName: 'outline-session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}
