import { put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';

const VALID_CATEGORIES = ['bloodline', 'trees', 'trash', 'food', 'ny'];
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'inthemaking2025';

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const password = formData.get('password') as string;

		if (password !== UPLOAD_PASSWORD) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const category = (formData.get('category') as string)?.toLowerCase();
		if (!category || !VALID_CATEGORIES.includes(category)) {
			return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
		}

		const files = formData.getAll('files') as File[];
		if (!files.length) {
			return NextResponse.json({ error: 'No files provided' }, { status: 400 });
		}

		const results = [];
		for (const file of files) {
			const ext = file.name.split('.').pop()?.toLowerCase() || '';
			const isVideo = ['mov', 'mp4', 'webm', 'ogg'].includes(ext);
			const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext);

			if (!isVideo && !isImage) {
				results.push({ name: file.name, error: 'Unsupported file type' });
				continue;
			}

			const blob = await put(`gallery/${category}/${file.name}`, file, {
				access: 'public',
			});

			results.push({
				name: file.name,
				url: blob.url,
				type: isVideo ? 'video' : 'image',
				category,
			});
		}

		return NextResponse.json({ success: true, files: results });
	} catch (error) {
		console.error('Upload error:', error);
		return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
	}
}
