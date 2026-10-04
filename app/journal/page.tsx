'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, Send, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface JournalEntry {
	id: string;
	title: string;
	content: string;
	author: string;
	date: string;
	updatedAt?: string;
	blobUrl?: string;
}

function formatDate(iso: string) {
	const d = new Date(iso);
	return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function JournalPage() {
	const [entries, setEntries] = useState<JournalEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [composing, setComposing] = useState(false);
	const [editing, setEditing] = useState<JournalEntry | null>(null);
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState<string | null>(null);

	const fetchEntries = useCallback(async () => {
		try {
			const res = await fetch('/api/journal');
			const data = await res.json();
			setEntries(data.entries || []);
		} catch {
			setEntries([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { fetchEntries(); }, [fetchEntries]);

	const handleSubmit = async () => {
		if (!content.trim()) return;
		setSubmitting(true);
		try {
			const res = await fetch('/api/journal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content, author: 'Sky' }),
			});
			if (res.ok) {
				setTitle(''); setContent(''); setComposing(false);
				fetchEntries();
			}
		} finally { setSubmitting(false); }
	};

	const handleUpdate = async () => {
		if (!editing || !content.trim()) return;
		setSubmitting(true);
		try {
			const res = await fetch('/api/journal', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: editing.id,
					title,
					content,
					author: editing.author,
					date: editing.date,
					blobUrl: editing.blobUrl,
				}),
			});
			if (res.ok) {
				setTitle(''); setContent(''); setEditing(null);
				fetchEntries();
			}
		} finally { setSubmitting(false); }
	};

	const handleDelete = async (entry: JournalEntry) => {
		if (!entry.blobUrl) return;
		setDeleting(entry.id);
		try {
			const res = await fetch('/api/journal', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ blobUrl: entry.blobUrl }),
			});
			if (res.ok) { fetchEntries(); }
		} finally { setDeleting(null); }
	};

	const startEdit = (entry: JournalEntry) => {
		setTitle(entry.title);
		setContent(entry.content);
		setEditing(entry);
	};

	const closeComposer = () => {
		setComposing(false); setEditing(null);
		setTitle(''); setContent('');
	};

	const isComposerOpen = composing || !!editing;

	return (
		<main className="min-h-screen" style={{ backgroundColor: '#ffffff', color: '#111111' }}>
			<header className="flex items-center justify-between px-6 py-6" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
				<div className="flex items-center gap-4">
					<Link href="/" className="cursor-interactive" aria-label="Back to home">
						<ArrowLeft className="w-4 h-4" style={{ color: 'rgba(0,0,0,0.4)' }} />
					</Link>
					<div>
						<h1 className="font-sans text-lg tracking-tight font-light" style={{ color: 'rgba(0,0,0,0.85)' }}>Journal</h1>
						<p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.35)' }}>
							{entries.length} {entries.length === 1 ? 'entry' : 'entries'}
						</p>
					</div>
				</div>
				<button
					onClick={() => { setEditing(null); setTitle(''); setContent(''); setComposing(true); }}
					className="cursor-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all duration-200"
					style={{ backgroundColor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)' }}
				>
					<Plus className="w-3 h-3" />
					Write
				</button>
			</header>

			<div className="max-w-2xl mx-auto px-6 py-8">
				{loading ? (
					<div className="flex justify-center py-20">
						<div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.25)' }}>Loading...</div>
					</div>
				) : entries.length === 0 ? (
					<div className="flex flex-col items-center py-20 gap-3">
						<p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.25)' }}>No entries yet</p>
						<button
							onClick={() => setComposing(true)}
							className="cursor-interactive font-mono text-[10px] uppercase tracking-wider underline underline-offset-4"
							style={{ color: 'rgba(0,0,0,0.4)' }}
						>
							Write the first one
						</button>
					</div>
				) : (
					<div className="flex flex-col gap-0">
						{entries.map((entry, i) => {
							const isExpanded = expandedId === entry.id;
							return (
								<motion.article
									key={entry.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: i * 0.04, duration: 0.3 }}
									className="py-6 cursor-interactive"
									style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
									onClick={() => setExpandedId(isExpanded ? null : entry.id)}
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 min-w-0">
											<h2 className="font-sans text-sm font-light tracking-tight" style={{ color: 'rgba(0,0,0,0.8)' }}>
												{entry.title}
											</h2>
											<p className="font-mono text-[9px] mt-1 tracking-wider uppercase" style={{ color: 'rgba(0,0,0,0.3)' }}>
												{formatDate(entry.date)}
												{entry.updatedAt && ' (edited)'}
											</p>
										</div>
										{isExpanded && (
											<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
												<button
													onClick={() => startEdit(entry)}
													className="cursor-interactive p-1 rounded transition-colors"
													style={{ color: 'rgba(0,0,0,0.25)' }}
													title="Edit"
												>
													<Pencil className="w-3.5 h-3.5" />
												</button>
												<button
													onClick={() => handleDelete(entry)}
													disabled={deleting === entry.id}
													className="cursor-interactive p-1 rounded transition-colors disabled:opacity-30"
													style={{ color: 'rgba(180,40,40,0.4)' }}
													title="Delete"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										)}
									</div>

									<AnimatePresence>
										{isExpanded && (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: 'auto', opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												transition={{ duration: 0.3 }}
												className="overflow-hidden"
											>
												<p className="font-sans text-sm leading-relaxed mt-4 whitespace-pre-wrap" style={{ color: 'rgba(0,0,0,0.55)' }}>
													{entry.content}
												</p>
												<p className="font-mono text-[8px] mt-4 uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.2)' }}>
													{'-- '}{entry.author}
												</p>
											</motion.div>
										)}
									</AnimatePresence>

									{!isExpanded && (
										<p className="font-sans text-xs mt-2 line-clamp-2 leading-relaxed" style={{ color: 'rgba(0,0,0,0.35)' }}>
											{entry.content}
										</p>
									)}
								</motion.article>
							);
						})}
					</div>
				)}
			</div>

			{/* Compose / Edit overlay */}
			<AnimatePresence>
				{isComposerOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.25 }}
						className="fixed inset-0 z-[80] flex items-center justify-center"
						style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)' }}
						onClick={closeComposer}
					>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{ duration: 0.3 }}
							className="w-full max-w-lg mx-6"
							onClick={(e) => e.stopPropagation()}
						>
							<p className="font-mono text-[9px] uppercase tracking-widest mb-6" style={{ color: 'rgba(0,0,0,0.3)' }}>
								{editing ? 'Edit entry' : 'New entry'}
							</p>
							<input
								type="text"
								placeholder="Title (optional)"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="w-full font-sans text-lg bg-transparent border-b pb-3 mb-4 outline-none font-light tracking-tight"
								style={{ borderColor: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.8)' }}
							/>
							<textarea
								placeholder="Write something..."
								value={content}
								onChange={(e) => setContent(e.target.value)}
								rows={10}
								className="w-full font-sans text-sm bg-transparent border-b pb-4 mb-4 outline-none leading-relaxed resize-none"
								style={{ borderColor: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.6)' }}
								autoFocus
							/>
							<div className="flex items-center justify-between">
								<p className="font-mono text-[9px] uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.2)' }}>
									{content.length} characters
								</p>
								<button
									onClick={editing ? handleUpdate : handleSubmit}
									disabled={!content.trim() || submitting}
									className="cursor-interactive flex items-center gap-1.5 px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-200 disabled:opacity-30"
									style={{ backgroundColor: 'rgba(0,0,0,0.85)', color: 'rgba(255,255,255,0.9)' }}
								>
									<Send className="w-3 h-3" />
									{submitting ? 'Saving...' : editing ? 'Update' : 'Publish'}
								</button>
							</div>
						</motion.div>
						<button
							onClick={closeComposer}
							className="absolute top-6 right-6 cursor-interactive transition-colors"
							style={{ color: 'rgba(0,0,0,0.4)' }}
							aria-label="Close"
						>
							<X className="w-5 h-5" />
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</main>
	);
}
