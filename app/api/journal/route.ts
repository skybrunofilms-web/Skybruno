import { put, list, del } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET() {
	try {
		const { blobs } = await list({ prefix: 'journal/' });

		const entries = await Promise.all(
			blobs
				.filter((b) => b.pathname.endsWith('.json'))
				.map(async (blob) => {
					try {
						const res = await fetch(blob.url);
						const data = await res.json();
						return { ...data, blobUrl: blob.url };
					} catch {
						return null;
					}
				})
		);

		const valid = entries.filter(Boolean);
		valid.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return NextResponse.json({ entries: valid });
	} catch (error) {
		console.error('Journal list error:', error);
		return NextResponse.json({ entries: [] });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { title, content, author } = body;

		if (!content || !content.trim()) {
			return NextResponse.json({ error: 'Content is required' }, { status: 400 });
		}

		const now = new Date();
		const id = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
		const entry = {
			id,
			title: title?.trim() || 'Untitled',
			content: content.trim(),
			author: author?.trim() || 'Sky',
			date: now.toISOString(),
		};

		const blob = await put(`journal/${id}.json`, JSON.stringify(entry), {
			access: 'public',
			contentType: 'application/json',
		});

		return NextResponse.json({ entry: { ...entry, blobUrl: blob.url } });
	} catch (error) {
		console.error('Journal create error:', error);
		return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { id, title, content, blobUrl } = body;

		if (!id || !content?.trim()) {
			return NextResponse.json({ error: 'ID and content are required' }, { status: 400 });
		}

		/* Delete the old blob */
		if (blobUrl) {
			try { await del(blobUrl); } catch { /* old blob may not exist */ }
		}

		/* Fetch existing entry to preserve date + author */
		const entry = {
			id,
			title: title?.trim() || 'Untitled',
			content: content.trim(),
			author: body.author?.trim() || 'Sky',
			date: body.date || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const blob = await put(`journal/${id}.json`, JSON.stringify(entry), {
			access: 'public',
			contentType: 'application/json',
		});

		return NextResponse.json({ entry: { ...entry, blobUrl: blob.url } });
	} catch (error) {
		console.error('Journal update error:', error);
		return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { blobUrl } = await request.json();

		if (!blobUrl) {
			return NextResponse.json({ error: 'blobUrl is required' }, { status: 400 });
		}

		await del(blobUrl);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Journal delete error:', error);
		return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
	}
}
