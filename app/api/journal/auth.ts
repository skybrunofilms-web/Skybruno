import { timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';

const TOKEN_HEADER = 'x-journal-token';

function tokensMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function requireJournalAuth(request: NextRequest) {
  const expected = process.env.JOURNAL_ADMIN_TOKEN?.trim();
  const provided = request.headers.get(TOKEN_HEADER)?.trim() || request.headers.get('authorization')?.replace(/^Bearer\\s+/i, '').trim();

  if (!expected) {
    return NextResponse.json({ error: 'Journal authentication is not configured' }, { status: 503 });
  }

  if (!provided || !tokensMatch(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function isJournalId(value: unknown): value is string {
  return typeof value === 'string' && /^\\d{10,}-[a-z0-9]{6}$/.test(value);
}

export function journalPath(id: string) {
  return `journal/${id}.json`;
}

export function isJournalBlobUrl(value: unknown) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname.includes('/journal/');
  } catch {
    return false;
  }
}

export const JOURNAL_LIMITS = {
  title: 160,
  content: 100_000,
  author: 120,
};
