import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  const session = await getSession();
  session.destroy();
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'outline.hub.tt2.li';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const url = new URL('/', `${proto}://${host}`);
  return NextResponse.redirect(url);
}
