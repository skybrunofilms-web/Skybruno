import { put, list, del } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { isJournalId, journalPath, JOURNAL_LIMITS, requireJournalAuth } from './auth';

function textField(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'journal/' });
    const entries = await Promise.all(
      blobs
        .filter((blob) => blob.pathname.startsWith('journal/') && blob.pathname.endsWith('.json'))
        .map(async (blob) => {
          try {
            const response = await fetch(blob.url, { cache: 'no-store' });
            if (!response.ok) return null;
            const data = await response.json();
            return { ...data, blobUrl: blob.url };
          } catch {
            return null;
          }
        }),
    );

    const valid = entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    valid.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json({ entries: valid });
  } catch (error) {
    console.error('Journal list error:', error);
    return NextResponse.json({ error: 'Failed to load entries' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireJournalAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const content = textField(body.content, JOURNAL_LIMITS.content);
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const now = new Date();
    const id = `${now.getTime()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 6)}`;
    const entry = {
      id,
      title: textField(body.title, JOURNAL_LIMITS.title) || 'Untitled',
      content,
      author: textField(body.author, JOURNAL_LIMITS.author) || 'Sky',
      date: now.toISOString(),
    };

    const blob = await put(journalPath(id), JSON.stringify(entry), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return NextResponse.json({ entry: { ...entry, blobUrl: blob.url } }, { status: 201 });
  } catch (error) {
    console.error('Journal create error:', error);
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireJournalAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!isJournalId(body.id)) return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });

    const content = textField(body.content, JOURNAL_LIMITS.content);
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const path = journalPath(body.id);
    const existingBlob = (await list({ prefix: path })).blobs.find((blob) => blob.pathname === path);
    if (!existingBlob) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    const existingResponse = await fetch(existingBlob.url, { cache: 'no-store' });
    if (!existingResponse.ok) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    const existing = await existingResponse.json();
    const entry = {
      id: body.id,
      title: textField(body.title, JOURNAL_LIMITS.title) || 'Untitled',
      content,
      author: textField(existing.author, JOURNAL_LIMITS.author) || 'Sky',
      date: typeof existing.date === 'string' ? existing.date : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const blob = await put(path, JSON.stringify(entry), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({ entry: { ...entry, blobUrl: blob.url } });
  } catch (error) {
    console.error('Journal update error:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireJournalAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!isJournalId(body.id)) return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });

    const path = journalPath(body.id);
    const existingBlob = (await list({ prefix: path })).blobs.find((blob) => blob.pathname === path);
    if (!existingBlob) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    await del(existingBlob.url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Journal delete error:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
