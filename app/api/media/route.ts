import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export async function GET() {
	try {
		const { blobs } = await list({ prefix: 'gallery/' });

		const media = blobs.map((blob) => {
			const parts = blob.pathname.split('/');
			// Expected: gallery/{category}/{filename}
			const category = parts[1] || 'uncategorized';
			const filename = parts.slice(2).join('/') || blob.pathname;
			const ext = filename.split('.').pop()?.toLowerCase() || '';
			const isVideo = ['mov', 'mp4', 'webm', 'ogg'].includes(ext);

			return {
				url: blob.url,
				pathname: blob.pathname,
				category,
				filename,
				type: isVideo ? 'video' : 'image',
				uploadedAt: blob.uploadedAt,
				size: blob.size,
			};
		});

		// Group by category
		const grouped: Record<string, typeof media> = {};
		for (const item of media) {
			if (!grouped[item.category]) grouped[item.category] = [];
			grouped[item.category].push(item);
		}

		return NextResponse.json({ media, grouped });
	} catch (error) {
		console.error('Error listing media:', error);
		return NextResponse.json({ media: [], grouped: {} });
	}
}
