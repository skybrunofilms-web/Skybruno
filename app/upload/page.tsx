'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['bloodline', 'trees', 'trash', 'food', 'ny'] as const;

interface UploadResult {
	name: string;
	url?: string;
	error?: string;
	type?: string;
	category?: string;
}

export default function UploadPage() {
	const [authenticated, setAuthenticated] = useState(false);
	const [password, setPassword] = useState('');
	const [authError, setAuthError] = useState(false);
	const [category, setCategory] = useState<string>('bloodline');
	const [files, setFiles] = useState<File[]>([]);
	const [uploading, setUploading] = useState(false);
	const [results, setResults] = useState<UploadResult[]>([]);
	const [dragOver, setDragOver] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const storedPassword = useRef('');

	const handleAuth = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		storedPassword.current = password;
		setAuthenticated(true);
		setAuthError(false);
	}, [password]);

	const addFiles = useCallback((newFiles: FileList | File[]) => {
		const arr = Array.from(newFiles).filter((f) => {
			const ext = f.name.split('.').pop()?.toLowerCase() || '';
			return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'mov', 'mp4', 'webm', 'ogg'].includes(ext);
		});
		setFiles((prev) => [...prev, ...arr]);
	}, []);

	const removeFile = useCallback((idx: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== idx));
	}, []);

	const handleUpload = useCallback(async () => {
		if (!files.length) return;
		setUploading(true);
		setResults([]);

		const formData = new FormData();
		formData.set('password', storedPassword.current);
		formData.set('category', category);
		files.forEach((f) => formData.append('files', f));

		try {
			const res = await fetch('/api/upload', { method: 'POST', body: formData });
			const data = await res.json();

			if (!res.ok) {
				if (res.status === 401) {
					setAuthenticated(false);
					setAuthError(true);
				}
				setResults([{ name: 'Error', error: data.error || 'Upload failed' }]);
			} else {
				setResults(data.files || []);
				setFiles([]);
			}
		} catch {
			setResults([{ name: 'Error', error: 'Network error' }]);
		} finally {
			setUploading(false);
		}
	}, [files, category]);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
	}, [addFiles]);

	if (!authenticated) {
		return (
			<main className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
				<form onSubmit={handleAuth} className="flex flex-col items-center gap-6 px-6">
					<h1 className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: 'rgba(0,0,0,0.5)' }}>
						Upload Portal
					</h1>
					{authError && (
						<p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: '#cc2222' }}>
							Invalid password
						</p>
					)}
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Password"
						className="bg-transparent border-b font-mono text-sm tracking-wide text-center py-2 px-4 w-64 outline-none transition-colors"
						style={{ borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(0,0,0,0.8)' }}
						autoFocus
					/>
					<button
						type="submit"
						className="font-mono text-[10px] uppercase tracking-[0.25em] py-2 px-6 border transition-colors cursor-interactive"
						style={{ borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(0,0,0,0.5)' }}
					>
						Enter
					</button>
				</form>
			</main>
		);
	}

	return (
		<main className="fixed inset-0 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
			<div className="max-w-2xl mx-auto py-16 px-6">
				<div className="flex items-center gap-4 mb-12">
					<Link href="/" className="cursor-interactive" aria-label="Back to home">
						<ArrowLeft className="w-4 h-4" style={{ color: 'rgba(0,0,0,0.4)' }} />
					</Link>
					<h1 className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: 'rgba(0,0,0,0.5)' }}>
						Upload Media
					</h1>
				</div>

				{/* Category pills */}
				<div className="flex flex-wrap gap-2 mb-8">
					{CATEGORIES.map((cat) => (
						<button
							key={cat}
							onClick={() => setCategory(cat)}
							className="font-mono text-[10px] uppercase tracking-[0.2em] py-1.5 px-4 border transition-all cursor-interactive"
							style={{
								borderColor: category === cat ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
								color: category === cat ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.35)',
								backgroundColor: category === cat ? 'rgba(0,0,0,0.04)' : 'transparent',
							}}
						>
							{cat}
						</button>
					))}
				</div>

				{/* Drop zone */}
				<div
					onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
					onDragLeave={() => setDragOver(false)}
					onDrop={handleDrop}
					onClick={() => inputRef.current?.click()}
					className="border border-dashed py-16 flex flex-col items-center justify-center gap-3 cursor-interactive transition-colors mb-6"
					style={{
						borderColor: dragOver ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
						backgroundColor: dragOver ? 'rgba(0,0,0,0.02)' : 'transparent',
					}}
				>
					<p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(0,0,0,0.35)' }}>
						Drop files here or click to browse
					</p>
					<p className="font-mono text-[9px] uppercase tracking-wide" style={{ color: 'rgba(0,0,0,0.15)' }}>
						Images + Videos (jpg, png, mov, mp4)
					</p>
					<input
						ref={inputRef}
						type="file"
						multiple
						accept="image/*,video/*"
						className="hidden"
						onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
					/>
				</div>

				{/* File list */}
				<AnimatePresence>
					{files.length > 0 && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							className="mb-6 flex flex-col gap-1"
						>
							{files.map((f, i) => {
								const ext = f.name.split('.').pop()?.toLowerCase() || '';
								const isVid = ['mov', 'mp4', 'webm', 'ogg'].includes(ext);
								return (
									<div
										key={`${f.name}-${i}`}
										className="flex items-center justify-between py-1.5 px-3"
										style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
									>
										<div className="flex items-center gap-3">
											<span
												className="font-mono text-[9px] uppercase px-1.5 py-0.5"
												style={{
													color: isVid ? '#cc6600' : 'rgba(0,0,0,0.4)',
													border: `1px solid ${isVid ? 'rgba(204,102,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
												}}
											>
												{isVid ? 'vid' : 'img'}
											</span>
											<span className="font-mono text-[11px]" style={{ color: 'rgba(0,0,0,0.6)' }}>
												{f.name}
											</span>
										</div>
										<button
											onClick={() => removeFile(i)}
											className="font-mono text-[10px] cursor-interactive transition-colors"
											style={{ color: 'rgba(0,0,0,0.2)' }}
										>
											{'x'}
										</button>
									</div>
								);
							})}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Upload button */}
				{files.length > 0 && (
					<button
						onClick={handleUpload}
						disabled={uploading}
						className="font-mono text-[10px] uppercase tracking-[0.25em] py-2.5 px-8 border transition-colors cursor-interactive w-full mb-8"
						style={{
							borderColor: uploading ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.15)',
							color: uploading ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
						}}
					>
						{uploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''} to ${category}`}
					</button>
				)}

				{/* Results */}
				<AnimatePresence>
					{results.length > 0 && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="flex flex-col gap-1"
						>
							<p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>
								Results
							</p>
							{results.map((r, i) => (
								<div key={i} className="flex items-center gap-3 py-1">
									<span
										className="font-mono text-[9px] w-2 h-2 rounded-full inline-block"
										style={{ backgroundColor: r.error ? '#cc2222' : '#22aa44' }}
									/>
									<span className="font-mono text-[11px]" style={{ color: 'rgba(0,0,0,0.5)' }}>
										{r.name}
									</span>
									{r.error && (
										<span className="font-mono text-[9px]" style={{ color: '#cc2222' }}>
											{r.error}
										</span>
									)}
								</div>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</main>
	);
}
