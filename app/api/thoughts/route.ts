import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const fallbacks = [
	'to exist is to resist',
	'the archive is a living thing',
	'memory is not passive',
	'what do you carry that was not given to you',
	'the future is already written in the land',
	'there is no separation between the observer and the observed',
	'every photograph is an act of remembering',
	'time moves in circles not lines',
];

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const all = searchParams.get('all');

	try {
		const res = await fetch(
			'https://api.are.na/v2/channels/a-thought-a-day/contents?per=100',
			{
				headers: { 'Content-Type': 'application/json' },
				cache: 'no-store',
			}
		);

		if (res.ok) {
			const data = await res.json();
			const texts: string[] = [];

			if (data.contents && Array.isArray(data.contents)) {
				for (const block of data.contents) {
					if (block.class === 'Text' && block.content) {
						const clean = block.content.replace(/<[^>]*>/g, '').trim();
						if (clean.length > 0 && clean.length < 200) texts.push(clean);
					} else if (block.title && block.title.trim().length > 0) {
						texts.push(block.title.trim());
					}
				}
			}

			if (texts.length > 0) {
				if (all === '1') {
					return NextResponse.json({ texts });
				}
				const picked = texts[Math.floor(Math.random() * texts.length)];
				return NextResponse.json({ text: picked });
			}
		}
	} catch {
		// fall through
	}

	if (all === '1') {
		return NextResponse.json({ texts: fallbacks });
	}
	const text = fallbacks[Math.floor(Math.random() * fallbacks.length)];
	return NextResponse.json({ text });
}
