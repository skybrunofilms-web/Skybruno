'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PLAYLIST_ID = '5q4yA3qTqNvA4A5Wiiv8qH';

export default function SpotifyRadio() {
	const [open, setOpen] = useState(false);

	return (
		<div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.95 }}
						transition={{ duration: 0.25, ease: [0.25, 0.1, 0, 1] }}
						className="rounded-xl overflow-hidden shadow-lg"
						style={{
							border: '1px solid rgba(0,0,0,0.08)',
							width: 320,
							height: 400,
						}}
					>
						{/* The key trick: use &theme=0 for dark + full height embed (352px+) to get the play controls */}
						<iframe
							src={`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?utm_source=generator&theme=0`}
							width="320"
							height="400"
							frameBorder="0"
							allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
							loading="lazy"
							title="Spotify playlist"
							className="block"
							style={{ borderRadius: 12 }}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			<button
				onClick={() => setOpen(!open)}
				className="cursor-interactive flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest transition-all duration-200"
				style={{
					backgroundColor: open ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.03)',
					border: '1px solid rgba(0,0,0,0.08)',
					color: 'rgba(0,0,0,0.45)',
				}}
				aria-label={open ? 'Close radio' : 'Open radio'}
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M3.5 9.5C2.4 8.4 2.4 5.6 3.5 4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
					<path d="M10.5 4.5C11.6 5.6 11.6 8.4 10.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
					<path d="M5 8.2C4.5 7.7 4.5 6.3 5 5.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
					<path d="M9 5.8C9.5 6.3 9.5 7.7 9 8.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
					<circle cx="7" cy="7" r="1" fill="currentColor" />
				</svg>
				{open ? 'Close' : 'Radio'}
			</button>

			{/* Note about full playback */}
			{open && (
				<p className="font-mono text-[8px] text-right pr-1" style={{ color: 'rgba(0,0,0,0.2)', maxWidth: 200 }}>
					Log into Spotify in this browser for full tracks
				</p>
			)}
		</div>
	);
}
