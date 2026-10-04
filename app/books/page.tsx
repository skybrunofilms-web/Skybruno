'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';

interface Book {
	title: string;
	author: string;
	cover: string;
	status: 'reading' | 'finished' | 'want';
	note?: string;
}

const books: Book[] = [
	{
		title: 'Conflict Is Not Abuse',
		author: 'Sarah Schulman',
		cover: 'https://covers.openlibrary.org/b/isbn/9781551526430-L.jpg',
		status: 'reading',
		note: 'Redefining how we understand harm, responsibility, and the escalation of conflict.',
	},
	{
		title: 'Real to Reel',
		author: 'bell hooks',
		cover: 'https://covers.openlibrary.org/b/isbn/9780415966368-L.jpg',
		status: 'finished',
		note: 'Race, sex, and class at the movies.',
	},
	{
		title: 'The Spirit of Hope',
		author: 'Byung-Chul Han',
		cover: 'https://covers.openlibrary.org/b/isbn/9781509565214-L.jpg',
		status: 'reading',
		note: 'A philosophical meditation on hope in an age of burnout.',
	},
	{
		title: 'Kingdom of Fear',
		author: 'Hunter S. Thompson',
		cover: 'https://covers.openlibrary.org/b/isbn/9780684873237-L.jpg',
		status: 'finished',
		note: 'Gonzo at its most unhinged. America through the lens of a madman.',
	},
	{
		title: 'Living Alterities',
		author: 'Lee',
		cover: 'https://covers.openlibrary.org/b/isbn/9780226822587-L.jpg',
		status: 'reading',
	},
	{
		title: 'Throat Sprockets',
		author: 'Tim Lucas',
		cover: 'https://covers.openlibrary.org/b/isbn/9780440221364-L.jpg',
		status: 'want',
		note: 'Cult fiction about obsession with underground cinema.',
	},
	{
		title: 'Menage a Trois with the 21st Century',
		author: 'Eileen R. Tabios',
		cover: 'https://covers.openlibrary.org/b/isbn/9781891190278-L.jpg',
		status: 'reading',
		note: 'Poetry navigating intimacy and identity in the modern age.',
	},
	{
		title: 'Magical States of Consciousness',
		author: 'Melita Denning & Osborne Phillips',
		cover: 'https://covers.openlibrary.org/b/isbn/9780875421940-L.jpg',
		status: 'want',
		note: 'Llewellyn\'s inner guide to the paths of the Tree of Life.',
	},
	{
		title: 'Mysticism',
		author: 'Simon Critchley',
		cover: 'https://covers.openlibrary.org/b/isbn/9780241513880-L.jpg',
		status: 'reading',
		note: 'A short guide to the transformation of consciousness.',
	},
];

const statusLabel: Record<string, string> = {
	reading: 'Currently reading',
	finished: 'Finished',
	want: 'Want to read',
};

const statusDot: Record<string, string> = {
	reading: 'rgba(180,80,20,0.7)',
	finished: 'rgba(0,0,0,0.3)',
	want: 'rgba(60,100,140,0.5)',
};

function FloatingBook({
	book, index, total, containerW, containerH, onSelect,
}: {
	book: Book; index: number; total: number;
	containerW: number; containerH: number;
	onSelect: (b: Book) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const raf = useRef<number>(0);
	const seed = useMemo(() => Math.sin(index * 127.1 + 311.7) * 0.5 + 0.5, [index]);

	const basePos = useMemo(() => {
		const cols = Math.min(total <= 6 ? 3 : 4, total);
		const row = Math.floor(index / cols);
		const col = index % cols;
		const cellW = containerW / cols;
		const rows = Math.ceil(total / cols);
		const cellH = (containerH - 80) / rows;
		const x = cellW * col + cellW * 0.1 + seed * cellW * 0.35;
		const y = cellH * row + cellH * 0.08 + seed * cellH * 0.25 + 10;
		return { x: Math.min(x, containerW - 170), y: Math.min(y, containerH - 280) };
	}, [index, total, containerW, containerH, seed]);

	const phase = seed * Math.PI * 2;
	const speedX = 0.12 + seed * 0.15;
	const speedY = 0.15 + (1 - seed) * 0.12;
	const ampX = 6 + seed * 10;
	const ampY = 5 + (1 - seed) * 8;
	const rotAmp = 1 + seed * 1.5;

	useEffect(() => {
		let t = 0;
		const tick = () => {
			t += 0.016;
			if (ref.current) {
				const dx = Math.sin(t * speedX + phase) * ampX;
				const dy = Math.cos(t * speedY + phase * 0.7) * ampY;
				const rot = Math.sin(t * 0.3 + phase) * rotAmp;
				ref.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
			}
			raf.current = requestAnimationFrame(tick);
		};
		raf.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf.current);
	}, [speedX, speedY, ampX, ampY, rotAmp, phase]);

	const bookW = containerW < 600 ? 90 : 130;
	const bookH = bookW * 1.45;

	return (
		<div
			ref={ref}
			className="absolute cursor-interactive group"
			style={{ left: basePos.x, top: basePos.y, width: bookW, willChange: 'transform' }}
			onClick={() => onSelect(book)}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.85 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay: index * 0.08 + 0.15, duration: 0.6, ease: [0.25, 0.1, 0, 1] }}
			>
				<div
					className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full blur-lg transition-all duration-300 group-hover:blur-xl group-hover:opacity-20"
					style={{ width: bookW * 0.7, height: 10, backgroundColor: 'rgba(0,0,0,0.1)' }}
				/>
				<div
					className="relative overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:scale-105"
					style={{ width: bookW, height: bookH, boxShadow: '3px 3px 14px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.08)' }}
				>
					<img
						src={book.cover}
						alt={`${book.title} by ${book.author}`}
						className="w-full h-full object-cover"
						crossOrigin="anonymous"
						onError={(e) => {
							(e.target as HTMLImageElement).src = `/placeholder.svg?height=${Math.round(bookH)}&width=${bookW}`;
						}}
					/>
					<div
						className="absolute top-2 right-2 w-2 h-2 rounded-full"
						style={{ backgroundColor: statusDot[book.status] }}
						title={statusLabel[book.status]}
					/>
				</div>
				<div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
					<p className="font-sans text-[10px] font-light leading-tight" style={{ color: 'rgba(0,0,0,0.65)' }}>{book.title}</p>
					<p className="font-mono text-[8px] mt-0.5" style={{ color: 'rgba(0,0,0,0.3)' }}>{book.author}</p>
				</div>
			</motion.div>
		</div>
	);
}

export default function BooksPage() {
	const [selected, setSelected] = useState<Book | null>(null);
	const [filter, setFilter] = useState<string>('all');
	const containerRef = useRef<HTMLDivElement>(null);
	const [dims, setDims] = useState({ w: 0, h: 0 });

	useEffect(() => {
		const measure = () => {
			if (containerRef.current) {
				setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
			}
		};
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, []);

	const filtered = filter === 'all' ? books : books.filter((b) => b.status === filter);

	return (
		<main className="h-screen overflow-hidden relative" style={{ backgroundColor: '#ffffff', color: '#111111' }}>
			<header className="relative z-10 flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
				<div className="flex items-center gap-4">
					<Link href="/" className="cursor-interactive" aria-label="Back to home">
						<ArrowLeft className="w-4 h-4" style={{ color: 'rgba(0,0,0,0.4)' }} />
					</Link>
					<div>
						<h1 className="font-sans text-lg tracking-tight font-light" style={{ color: 'rgba(0,0,0,0.85)' }}>Bookshelf</h1>
						<p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.35)' }}>{'What I\'m reading'}</p>
					</div>
				</div>
				<div className="flex gap-2">
					{['all', 'reading', 'finished', 'want'].map((f) => (
						<button
							key={f}
							onClick={() => setFilter(f)}
							className="cursor-interactive font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full transition-all duration-200"
							style={{
								backgroundColor: filter === f ? 'rgba(0,0,0,0.08)' : 'transparent',
								color: filter === f ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)',
								border: `1px solid ${filter === f ? 'rgba(0,0,0,0.1)' : 'transparent'}`,
							}}
						>
							{f === 'all' ? 'All' : f === 'want' ? 'Want' : f}
						</button>
					))}
				</div>
			</header>

			<div ref={containerRef} className="absolute inset-0 top-[60px] overflow-hidden">
				{dims.w > 0 && filtered.map((book, i) => (
					<FloatingBook
						key={book.title}
						book={book}
						index={i}
						total={filtered.length}
						containerW={dims.w}
						containerH={dims.h}
						onSelect={setSelected}
					/>
				))}
			</div>

			<AnimatePresence>
				{selected && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.25 }}
						className="fixed inset-0 z-[80] flex items-center justify-center"
						style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' }}
						onClick={() => setSelected(null)}
					>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{ duration: 0.3 }}
							className="flex flex-col md:flex-row gap-8 max-w-lg mx-6"
							onClick={(e) => e.stopPropagation()}
						>
							<img
								src={selected.cover}
								alt={selected.title}
								className="w-40 h-56 object-cover shrink-0"
								crossOrigin="anonymous"
								style={{ boxShadow: '6px 6px 24px rgba(0,0,0,0.15)' }}
							/>
							<div className="flex flex-col justify-center">
								<p className="font-mono text-[9px] uppercase tracking-wider mb-2" style={{ color: statusDot[selected.status] }}>
									{statusLabel[selected.status]}
								</p>
								<h2 className="font-sans text-xl font-light tracking-tight" style={{ color: 'rgba(0,0,0,0.85)' }}>{selected.title}</h2>
								<p className="font-mono text-[11px] mt-1" style={{ color: 'rgba(0,0,0,0.4)' }}>{selected.author}</p>
								{selected.note && (
									<p className="font-sans text-sm mt-4 leading-relaxed" style={{ color: 'rgba(0,0,0,0.55)' }}>{selected.note}</p>
								)}
							</div>
						</motion.div>
						<button onClick={() => setSelected(null)} className="absolute top-6 right-6 cursor-interactive" style={{ color: 'rgba(0,0,0,0.4)' }} aria-label="Close">
							<X className="w-5 h-5" />
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</main>
	);
}
