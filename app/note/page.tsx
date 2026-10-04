'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/* ── Typewriter echo canvas ─────────────────────────────────────────────── */
function TypewriterEcho({ text }: { text: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number>(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d')!;

		const resize = () => {
			canvas.width = canvas.offsetWidth * window.devicePixelRatio;
			canvas.height = canvas.offsetHeight * window.devicePixelRatio;
			ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		};
		resize();

		const draw = () => {
			const w = canvas.offsetWidth;
			const h = canvas.offsetHeight;
			ctx.clearRect(0, 0, w, h);

			if (!text) { rafRef.current = requestAnimationFrame(draw); return; }

			// Measure and truncate to visible portion
			const fontSize = Math.min(48, Math.max(24, w / (text.length * 0.6)));
			ctx.font = `300 ${fontSize}px 'Space Grotesk', sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			// Multi-line wrapping
			const maxWidth = w * 0.85;
			const words = text.split(' ');
			const lines: string[] = [];
			let currentLine = '';
			for (const word of words) {
				const test = currentLine ? `${currentLine} ${word}` : word;
				if (ctx.measureText(test).width > maxWidth && currentLine) {
					lines.push(currentLine);
					currentLine = word;
				} else {
					currentLine = test;
				}
			}
			if (currentLine) lines.push(currentLine);

			const lineHeight = fontSize * 1.4;
			const startY = h / 2 - (lines.length * lineHeight) / 2;

			lines.forEach((line, i) => {
				ctx.fillStyle = 'rgba(255,255,255,0.04)';
				ctx.fillText(line, w / 2, startY + i * lineHeight + lineHeight / 2);
			});

			rafRef.current = requestAnimationFrame(draw);
		};

		rafRef.current = requestAnimationFrame(draw);
		window.addEventListener('resize', resize);
		return () => {
			cancelAnimationFrame(rafRef.current);
			window.removeEventListener('resize', resize);
		};
	}, [text]);

	return (
		<canvas
			ref={canvasRef}
			className="absolute inset-0 w-full h-full pointer-events-none"
			aria-hidden="true"
		/>
	);
}

/* ── Particle dissolution overlay ────────────────────────────────────────── */
function DissolutionEffect({ text, onComplete }: { text: string; onComplete: () => void }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d')!;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = canvas.offsetWidth * dpr;
		canvas.height = canvas.offsetHeight * dpr;
		ctx.scale(dpr, dpr);
		const w = canvas.offsetWidth;
		const h = canvas.offsetHeight;

		// Render text to sample pixels
		const fontSize = Math.min(32, Math.max(16, w / (text.length * 0.5)));
		ctx.font = `400 ${fontSize}px 'JetBrains Mono', monospace`;
		ctx.fillStyle = 'white';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		const maxWidth = w * 0.8;
		const words = text.split(' ');
		const lines: string[] = [];
		let cur = '';
		for (const word of words) {
			const test = cur ? `${cur} ${word}` : word;
			if (ctx.measureText(test).width > maxWidth && cur) {
				lines.push(cur); cur = word;
			} else cur = test;
		}
		if (cur) lines.push(cur);

		const lh = fontSize * 1.5;
		const sy = h / 2 - (lines.length * lh) / 2;
		lines.forEach((line, i) => {
			ctx.fillText(line, w / 2, sy + i * lh + lh / 2);
		});

		// Sample pixels
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const particles: { x: number; y: number; ox: number; oy: number; vx: number; vy: number; alpha: number }[] = [];
		const step = 3;
		for (let y = 0; y < canvas.height; y += step) {
			for (let x = 0; x < canvas.width; x += step) {
				const idx = (y * canvas.width + x) * 4;
				if (imageData.data[idx + 3] > 100) {
					particles.push({
						x: x / dpr, y: y / dpr,
						ox: x / dpr, oy: y / dpr,
						vx: (Math.random() - 0.5) * 2,
						vy: -Math.random() * 3 - 1,
						alpha: 1,
					});
				}
			}
		}

		let startTime = performance.now();
		const duration = 1800;

		const animate = () => {
			const elapsed = performance.now() - startTime;
			const progress = Math.min(1, elapsed / duration);

			ctx.clearRect(0, 0, w, h);

			for (const p of particles) {
				p.x += p.vx * 0.5;
				p.y += p.vy * 0.5;
				p.vy -= 0.02;
				p.alpha = 1 - progress;

				ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.7})`;
				ctx.fillRect(p.x, p.y, 1.5, 1.5);
			}

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				onComplete();
			}
		};

		// Clear and start
		ctx.clearRect(0, 0, w, h);
		requestAnimationFrame(animate);
	}, [text, onComplete]);

	return (
		<canvas
			ref={canvasRef}
			className="absolute inset-0 w-full h-full z-20"
			aria-hidden="true"
		/>
	);
}

type Mode = null | 'anon' | 'known';

interface Attachment {
	name: string;
	size: number;
	type: string;
	data: string; // base64
}

export default function NotePage() {
	const [mode, setMode] = useState<Mode>(null);
	const [text, setText] = useState('');
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const [sending, setSending] = useState(false);
	const [dissolving, setDissolving] = useState(false);
	const [dissolveText, setDissolveText] = useState('');
	const [sent, setSent] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (mode) {
			const t = setTimeout(() => textareaRef.current?.focus(), 350);
			return () => clearTimeout(t);
		}
	}, [mode]);

	const handleFiles = useCallback(async (files: FileList | null) => {
		if (!files) return;
		const newAttachments: Attachment[] = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (file.size > 10 * 1024 * 1024) continue; // skip files over 10MB
			const data = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.readAsDataURL(file);
			});
			newAttachments.push({
				name: file.name,
				size: file.size,
				type: file.type,
				data,
			});
		}
		setAttachments((prev) => [...prev, ...newAttachments]);
	}, []);

	const removeAttachment = useCallback((idx: number) => {
		setAttachments((prev) => prev.filter((_, i) => i !== idx));
	}, []);

	const handleSend = useCallback(async () => {
		if (!text.trim()) return;
		if (mode === 'known' && !name.trim()) return;
		setSending(true);

		try {
			const res = await fetch('/api/send-note', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					text: text.trim(),
					anonymous: mode === 'anon',
					name: mode === 'known' ? name.trim() : undefined,
					email: mode === 'known' ? email.trim() : undefined,
					phone: mode === 'known' ? phone.trim() : undefined,
					attachments: attachments.map((a) => ({
						name: a.name,
						type: a.type,
						data: a.data,
					})),
				}),
			});

			if (!res.ok) throw new Error('Failed');
			// Trigger dissolution instead of immediately showing sent
			setDissolveText(text.trim());
			setDissolving(true);
		} catch {
			setDissolveText(text.trim());
			setDissolving(true);
		} finally {
			setSending(false);
		}
	}, [text, mode, name, email, phone, attachments]);

	const handleDissolutionComplete = useCallback(() => {
		setDissolving(false);
		setSent(true);
	}, []);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend();
			if (e.key === 'Escape' && mode && !text && !sent) setMode(null);
		};
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [handleSend, mode, text, sent]);

	const pill =
		'font-mono text-[11px] uppercase tracking-[0.25em] border rounded-full transition-all px-6 py-2.5 cursor-interactive';
	const pillOff = `${pill} border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.3)]`;
	const pillOn = `${pill} border-[rgba(255,255,255,0.4)] text-[rgba(255,255,255,0.8)] bg-[rgba(255,255,255,0.04)]`;

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes}B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
	};

	return (
		<main className="fixed inset-0 bg-black flex flex-col">
			{/* Hidden file input */}
			<input
				ref={fileRef}
				type="file"
				multiple
				accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
				onChange={(e) => handleFiles(e.target.files)}
				className="hidden"
			/>

			{/* Back */}
			<div className="absolute top-6 left-6 z-10">
				<Link
					href="/"
					className={`${pill} border-white/10 text-white/20 hover:text-white/50`}
				>
					Back
				</Link>
			</div>

			<AnimatePresence mode="wait">
				{/* Sent confirmation */}
				{sent ? (
					<motion.div
						key="sent"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="flex-1 flex flex-col items-center justify-center gap-6"
					>
						<span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
							Received
						</span>
						<Link href="/" className={`${pill} border-white/10 text-white/20 hover:text-white/50`}>
							Return
						</Link>
					</motion.div>

				/* Mode selection */
				) : !mode ? (
					<motion.div
						key="select"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.5, ease: [0.25, 0.1, 0, 1] }}
						className="flex-1 flex flex-col items-center justify-center gap-8"
					>
						<div className="flex gap-4">
							<button onClick={() => setMode('anon')} className={pillOff}>
								Anon
							</button>
							<button onClick={() => setMode('known')} className={pillOff}>
								Be known
							</button>
						</div>
					</motion.div>

				/* Note form */
				) : (
					<motion.div
						key="form"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.5, ease: [0.25, 0.1, 0, 1] }}
						className="flex-1 flex flex-col p-8 pt-20 md:p-16 md:pt-24 overflow-auto"
					>
						{/* Mode pills at top */}
						<div className="flex gap-3 mb-8">
							<button onClick={() => setMode('anon')} className={mode === 'anon' ? pillOn : pillOff}>
								Anon
							</button>
							<button onClick={() => setMode('known')} className={mode === 'known' ? pillOn : pillOff}>
								Be known
							</button>
						</div>

						{/* Contact fields for "Be known" */}
						<AnimatePresence>
							{mode === 'known' && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.4, ease: [0.25, 0.1, 0, 1] }}
									style={{ overflow: 'hidden' }}
									className="flex flex-col gap-4 mb-8"
								>
									{[
										{ label: 'Name', required: true, value: name, set: setName, type: 'text', auto: 'name' },
										{ label: 'Email', required: false, value: email, set: setEmail, type: 'email', auto: 'email' },
										{ label: 'Phone', required: false, value: phone, set: setPhone, type: 'tel', auto: 'tel' },
									].map((field) => (
										<div key={field.label} className="flex flex-col gap-1">
											<label className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">
												{field.label} {field.required && <span className="text-white/40">*</span>}
											</label>
											<input
												type={field.type}
												value={field.value}
												onChange={(e) => field.set(e.target.value)}
												className="bg-transparent border-b border-white/10 focus:border-white/30 text-white/80 font-mono text-sm py-2 outline-none transition-colors caret-white"
												placeholder="..."
												autoComplete={field.auto}
											/>
										</div>
									))}
								</motion.div>
							)}
						</AnimatePresence>

						{/* Message textarea -- terminal/code style with blinking caret */}
						<div className="flex-1 relative">
							{/* Typewriter echo behind textarea */}
							<TypewriterEcho text={text} />
							{/* Dissolution overlay */}
							{dissolving && (
								<DissolutionEffect text={dissolveText} onComplete={handleDissolutionComplete} />
							)}
							<AnimatePresence>
								{text.length === 0 && (
									<motion.span
										initial={{ opacity: 0 }}
										animate={{ opacity: 0.25 }}
										exit={{ opacity: 0 }}
										className="absolute top-0 left-0 pointer-events-none font-mono text-sm text-white/20 flex items-center gap-1"
									>
										<span className="text-white/30 mr-1">{'>'}</span>
										{mode === 'anon' ? 'say anything...' : 'write your message...'}
									</motion.span>
								)}
							</AnimatePresence>
							<textarea
								ref={textareaRef}
								value={text}
								onChange={(e) => setText(e.target.value)}
								className="w-full min-h-[35vh] bg-transparent text-[rgba(255,255,255,0.8)] font-mono text-sm md:text-base leading-relaxed resize-none outline-none placeholder-transparent selection:bg-[rgba(255,255,255,0.1)]"
								style={{ caretColor: 'white' }}
								spellCheck={false}
								autoComplete="off"
								aria-label="Your note"
							/>
						</div>

						{/* Attachments display */}
						{attachments.length > 0 && (
							<div className="flex flex-wrap gap-2 py-3 border-t border-[rgba(255,255,255,0.04)]">
								{attachments.map((att, i) => (
									<div
										key={`${att.name}-${i}`}
										className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full font-mono text-[10px] text-white/40"
									>
										{att.type.startsWith('image/') && (
											<img
												src={att.data}
												alt={att.name}
												className="w-4 h-4 rounded-sm object-cover"
											/>
										)}
										<span className="max-w-24 truncate">{att.name}</span>
										<span className="text-white/20">{formatSize(att.size)}</span>
										<button
											onClick={() => removeAttachment(i)}
											className="text-white/20 hover:text-white/60 transition-colors cursor-interactive ml-1"
											aria-label={`Remove ${att.name}`}
										>
											x
										</button>
									</div>
								))}
							</div>
						)}

						{/* Bottom bar */}
						<div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.04)]">
							<div className="flex items-center gap-3">
								<button
									onClick={() => fileRef.current?.click()}
									className={`${pill} border-white/10 text-white/25 hover:text-white/50 hover:border-white/20`}
								>
									Attach
								</button>
								<span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/10">
									{text.length > 0 ? `${text.length} chars` : ''}
									{attachments.length > 0 ? ` / ${attachments.length} file${attachments.length > 1 ? 's' : ''}` : ''}
								</span>
							</div>
							<button
								onClick={handleSend}
								disabled={!text.trim() || (mode === 'known' && !name.trim()) || sending}
								className={`${pill} ${
									text.trim() && (mode === 'anon' || name.trim())
										? 'border-white/30 text-white/60 hover:text-white hover:border-white/50'
										: 'border-white/5 text-white/15'
								}`}
							>
								{sending ? '...' : 'Submit'}
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</main>
	);
}
