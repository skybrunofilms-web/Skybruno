import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
	try {
		const res = await fetch(
			'https://api.are.na/v2/channels/my-bdsm/contents?per=50',
			{
				headers: { 'Content-Type': 'application/json' },
				cache: 'no-store',
			}
		);

		if (!res.ok) {
			return NextResponse.json({ url: null }, { status: 200 });
		}

		const data = await res.json();
		const imageBlocks = (data.contents || []).filter(
			(block: { class: string; image?: { original?: { url: string } } }) =>
				block.class === 'Image' && block.image?.original?.url
		);

		if (imageBlocks.length === 0) {
			return NextResponse.json({ url: null }, { status: 200 });
		}

		const random = imageBlocks[Math.floor(Math.random() * imageBlocks.length)];

		return NextResponse.json({
			url: random.image.original.url,
			title: random.title || '',
		});
	} catch {
		return NextResponse.json({ url: null }, { status: 200 });
	}
}
