'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface GalleryMediaItem {
	src: string;
	alt?: string;
	caption?: string;
	type?: 'image' | 'video';
	meta?: { camera?: string; location?: string; date?: string; film?: string };
}

export interface GalleryTheme {
	id: string;
	title: string;
	description?: string;
	coverImage: string;
	images: GalleryMediaItem[];
}

interface GalleryOverlayProps {
	theme: GalleryTheme;
	onClose: () => void;
	lineColor?: string;
}

/* Deterministic pseudo-random */
function sr(seed: number): number {
	const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

/* Positioning system: images and their caption labels scattered across a safe zone
   (inset from banners). Each image also gets a caption node offset from it,
   connected by a line, forming the web. */
interface NodePos {
	x: number; // percent
	y: number;
	w: number; // percent width (images only)
	type: 'image' | 'label';
	imageIndex: number;
}

function generateWeb(count: number): NodePos[] {
	const nodes: NodePos[] = [];

	/* Safe zone: x 5-90%, y 12-68%  --  generous breathing room */
	const safeX = 5, safeW = 85;
	const safeY = 12, safeH = 56;

	/* Images sized 14-22% width with good spacing */
	const imgWidths: number[] = [];
	for (let i = 0; i < count; i++) {
		imgWidths.push(14 + sr(i * 5 + 2) * 8);
	}

	/* Place images using a force-relaxed spiral to maximize spacing */
	const placed: { x: number; y: number; w: number }[] = [];
	const goldenAngle = 137.508 * (Math.PI / 180);

	for (let i = 0; i < count; i++) {
		const w = imgWidths[i];
		let bestX = 0, bestY = 0, bestDist = -1;

		/* Try multiple candidates, pick the one farthest from all existing */
		for (let attempt = 0; attempt < 40; attempt++) {
			let cx: number, cy: number;
			if (attempt < 20) {
				/* Spiral-based candidates */
				const angle = i * goldenAngle + attempt * 0.7;
				const radius = 0.25 + (attempt / 20) * 0.4;
				cx = 50 + Math.cos(angle) * radius * safeW - w / 2;
				cy = safeY + safeH / 2 + Math.sin(angle) * radius * safeH - 5;
			} else {
				/* Random candidates */
				cx = safeX + sr(i * 41 + attempt * 7) * (safeW - w);
				cy = safeY + sr(i * 67 + attempt * 13) * (safeH - 10);
			}
			cx = Math.max(safeX, Math.min(safeX + safeW - w, cx));
			cy = Math.max(safeY, Math.min(safeY + safeH - 10, cy));

			/* Find min distance to all placed images */
			let minDist = Infinity;
			for (const p of placed) {
				const dx = (cx + w / 2) - (p.x + p.w / 2);
				const dy = (cy + 5) - (p.y + 5);
				const dist = Math.sqrt(dx * dx + dy * dy);
				minDist = Math.min(minDist, dist);
			}
			if (placed.length === 0) minDist = 100;

			if (minDist > bestDist) {
				bestDist = minDist;
				bestX = cx;
				bestY = cy;
			}
		}

		placed.push({ x: bestX, y: bestY, w });
		nodes.push({ x: bestX, y: bestY, w, type: 'image', imageIndex: i });

		/* Caption label node: placed clearly offset from its image */
		const labelOffX = (sr(i * 11) - 0.5) * 16;
		const labelDir = sr(i * 13) > 0.5 ? 1 : -1;
		const labelOffY = labelDir * (8 + sr(i * 17) * 6);
		const lx = Math.max(2, Math.min(94, bestX + w / 2 + labelOffX));
		const ly = Math.max(6, Math.min(70, bestY + labelOffY));

		nodes.push({ x: lx, y: ly, w: 0, type: 'label', imageIndex: i });
	}
	return nodes;
}

/* Generate line pairs: image-to-label, image-to-next-image, cross-connections */
function generateLinePairs(imageCount: number, nodes: NodePos[]): [number, number][] {
	const pairs: [number, number][] = [];

	/* Each image node (even index) connects to its label node (odd index) */
	for (let i = 0; i < imageCount; i++) {
		pairs.push([i * 2, i * 2 + 1]); // image -> its label
	}

	/* Chain images together */
	for (let i = 0; i < imageCount - 1; i++) {
		pairs.push([i * 2, (i + 1) * 2]); // image -> next image
	}
	/* Close the loop */
	if (imageCount > 2) {
		pairs.push([(imageCount - 1) * 2, 0]);
	}

	/* A few cross-connections for web density */
	for (let i = 0; i < imageCount; i++) {
		const j = (i + 2) % imageCount;
		if (j !== i && imageCount > 3) {
			pairs.push([i * 2, j * 2]);
		}
	}

	return pairs;
}

export default function GalleryOverlay({ theme, onClose, lineColor = '#ff3333' }: GalleryOverlayProps) {
	const [selectedImage, setSelectedImage] = useState<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const nodes = useMemo(() => generateWeb(theme.images.length), [theme.images.length]);
	const linePairs = useMemo(() => generateLinePairs(theme.images.length, nodes), [theme.images.length, nodes]);

	/* Node centers in viewBox coords (0-100) */
	const nodeCenters = useMemo(() => {
		return nodes.map((n) => {
			if (n.type === 'image') {
				return { x: n.x + n.w / 2, y: n.y + 6 };
			}
			return { x: n.x, y: n.y };
		});
	}, [nodes]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (selectedImage !== null) setSelectedImage(null);
				else onClose();
			}
			if (selectedImage !== null) {
				if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
					setSelectedImage((prev) => prev !== null ? (prev + 1) % theme.images.length : 0);
				}
				if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
					setSelectedImage((prev) => prev !== null ? (prev - 1 + theme.images.length) % theme.images.length : 0);
				}
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose, selectedImage, theme.images.length]);

	useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = ''; };
	}, []);

	const goNext = useCallback(() => {
		setSelectedImage((prev) => prev !== null ? (prev + 1) % theme.images.length : 0);
	}, [theme.images.length]);

	const goPrev = useCallback(() => {
		setSelectedImage((prev) => prev !== null ? (prev - 1 + theme.images.length) % theme.images.length : 0);
	}, [theme.images.length]);

	return (
		<motion.div
			ref={containerRef}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.5 }}
			className="fixed inset-0 z-50"
			style={{ backgroundColor: '#ffffff' }}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			{/* Portfolio header -- pushed below top banner with adequate padding */}
			<header className="fixed top-8 left-0 right-0 z-[52] flex items-center justify-between px-6 pt-3 pb-2">
				<div>
				<h2 className="font-sans text-xl md:text-2xl text-black/90 tracking-tight font-light cursor-interactive">
					{theme.title}
				</h2>
				{theme.description && (
					<p className="font-mono text-[10px] uppercase text-black/40 mt-0.5 tracking-widest">
						{theme.description}
					</p>
				)}
				</div>
				<button
					onClick={onClose}
					className="cursor-interactive text-black/50 hover:text-black transition-colors p-2"
					aria-label="Close gallery"
				>
					<X className="w-5 h-5" />
				</button>
			</header>

			{/* SVG connecting lines -- the web */}
			<svg
				className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				style={{ opacity: 0.8 }}
			>
				{linePairs.map(([a, b], idx) => {
					const ca = nodeCenters[a];
					const cb = nodeCenters[b];
					if (!ca || !cb) return null;
					return (
						<line
							key={idx}
							x1={ca.x}
							y1={ca.y}
							x2={cb.x}
							y2={cb.y}
							stroke={lineColor}
							strokeWidth="0.2"
							strokeDasharray="0.8 0.6"
							strokeLinecap="round"
							opacity="0.7"
						/>
					);
				})}
			</svg>

			{/* Scattered floating images + label nodes */}
			<div className="absolute inset-0 z-[2]" style={{ padding: '0' }}>
				{nodes.map((node, i) => {
					if (node.type === 'image') {
						const image = theme.images[node.imageIndex];
						if (!image) return null;
						const floatDur = 5 + sr(node.imageIndex * 11) * 4;
						const floatDelay = sr(node.imageIndex * 13) * 3;
						const driftX = (sr(node.imageIndex * 19) - 0.5) * 6;

						return (
							<motion.button
								key={`img-${node.imageIndex}`}
								initial={{ opacity: 0, scale: 0.85 }}
								animate={{
									opacity: 1,
									scale: 1,
									y: [0, -10, 0, 8, 0],
									x: [0, driftX, 0, -driftX * 0.6, 0],
								}}
								transition={{
									opacity: { duration: 0.5, delay: node.imageIndex * 0.12 },
									scale: { duration: 0.5, delay: node.imageIndex * 0.12 },
									y: { duration: floatDur, delay: floatDelay, repeat: Infinity, ease: 'easeInOut' },
									x: { duration: floatDur * 1.3, delay: floatDelay, repeat: Infinity, ease: 'easeInOut' },
								}}
								onClick={(e) => { e.stopPropagation(); setSelectedImage(node.imageIndex); }}
								className="absolute cursor-interactive group hover:z-10"
								style={{
									left: `${node.x}%`,
									top: `${node.y}%`,
									width: `${node.w}%`,
								}}
							>
								{image.type === 'video' ? (
									<video
										src={image.src}
										className="w-full h-auto shadow-2xl transition-transform duration-300 group-hover:scale-105 group-hover:brightness-110"
										style={{ filter: 'grayscale(1)' }}
										autoPlay
										muted
										loop
										playsInline
										onTimeUpdate={(e) => {
											const v = e.currentTarget;
											if (v.currentTime > 5) v.currentTime = 0;
										}}
									/>
								) : (
									<img
										src={image.src}
										alt={image.alt || `${theme.title} photo ${node.imageIndex + 1}`}
										className="w-full h-auto shadow-2xl transition-transform duration-300 group-hover:scale-105 group-hover:brightness-110"
										crossOrigin="anonymous"
										loading="lazy"
									/>
								)}
							</motion.button>
						);
					}

					/* Label node -- caption text floating near its image */
					const image = theme.images[node.imageIndex];
					if (!image?.caption) return null;
					const floatDur = 6 + sr(node.imageIndex * 23) * 3;
					return (
						<motion.div
							key={`label-${node.imageIndex}`}
							initial={{ opacity: 0 }}
							animate={{
								opacity: 1,
								y: [0, -4, 0, 3, 0],
							}}
							transition={{
								opacity: { duration: 0.6, delay: 0.3 + node.imageIndex * 0.12 },
								y: { duration: floatDur, repeat: Infinity, ease: 'easeInOut' },
							}}
							className="absolute pointer-events-none z-[3]"
							style={{
								left: `${node.x}%`,
								top: `${node.y}%`,
							}}
						>
							<span className="font-mono text-[10px] md:text-[11px] uppercase text-black/60 tracking-widest whitespace-nowrap">
								{image.caption}
							</span>
						</motion.div>
					);
				})}
			</div>

			{/* Lightbox */}
			<AnimatePresence>
				{selectedImage !== null && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="fixed inset-0 z-[60] flex items-center justify-center"
						style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
						onClick={() => setSelectedImage(null)}
					>
						<button
							onClick={(e) => { e.stopPropagation(); goPrev(); }}
							className="absolute left-4 top-1/2 -translate-y-1/2 cursor-interactive text-black/40 hover:text-black transition-colors p-2 z-10"
							aria-label="Previous image"
						>
							<ChevronLeft className="w-6 h-6" />
						</button>

						{/* Main content area */}
						<div
							className="flex flex-col items-center justify-center max-w-[92vw] max-h-[78vh] relative"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Media */}
							{theme.images[selectedImage].type === 'video' ? (
								<video
									key={selectedImage}
									src={theme.images[selectedImage].src}
									className="max-w-full max-h-[65vh] object-contain"
									style={{ filter: 'grayscale(1)' }}
									autoPlay
									muted
									loop
									playsInline
									controls
								/>
							) : (
								<img
									src={theme.images[selectedImage].src}
									alt={theme.images[selectedImage].alt || `${theme.title} photo ${selectedImage + 1}`}
									className="max-w-full max-h-[65vh] object-contain"
									crossOrigin="anonymous"
								/>
							)}

							{/* Caption + metadata row */}
							<div className="flex items-start justify-between w-full mt-3 px-1 gap-6">
								<div className="flex flex-col gap-0.5">
									{theme.images[selectedImage].caption && (
										<p className="font-mono text-[10px] uppercase text-black/50 tracking-wide">
											{theme.images[selectedImage].caption}
										</p>
									)}
								</div>
								{theme.images[selectedImage].meta && (
									<div className="flex gap-6 shrink-0">
										{theme.images[selectedImage].meta?.location && (
											<div className="flex flex-col">
												<span className="font-mono text-[8px] uppercase text-black/25 tracking-wider">Location</span>
												<span className="font-mono text-[10px] text-black/50">{theme.images[selectedImage].meta.location}</span>
											</div>
										)}
										{theme.images[selectedImage].meta?.date && (
											<div className="flex flex-col">
												<span className="font-mono text-[8px] uppercase text-black/25 tracking-wider">Date</span>
												<span className="font-mono text-[10px] text-black/50">{theme.images[selectedImage].meta.date}</span>
											</div>
										)}
										{theme.images[selectedImage].meta?.camera && (
											<div className="flex flex-col">
												<span className="font-mono text-[8px] uppercase text-black/25 tracking-wider">Camera</span>
												<span className="font-mono text-[10px] text-black/50">{theme.images[selectedImage].meta.camera}</span>
											</div>
										)}
										{theme.images[selectedImage].meta?.film && (
											<div className="flex flex-col">
												<span className="font-mono text-[8px] uppercase text-black/25 tracking-wider">Film</span>
												<span className="font-mono text-[10px] text-black/50">{theme.images[selectedImage].meta.film}</span>
											</div>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Film strip thumbnails */}
						<div
							className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-4 py-2 max-w-[90vw] overflow-x-auto"
							onClick={(e) => e.stopPropagation()}
							style={{ scrollbarWidth: 'none' }}
						>
							{theme.images.map((img, idx) => (
								<button
									key={idx}
									onClick={() => setSelectedImage(idx)}
									className="shrink-0 cursor-interactive transition-all duration-200 overflow-hidden"
									style={{
										width: 36,
										height: 36,
										opacity: idx === selectedImage ? 1 : 0.3,
										border: idx === selectedImage ? '1px solid rgba(0,0,0,0.5)' : '1px solid rgba(0,0,0,0.1)',
									}}
								>
									{img.type === 'video' ? (
										<div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
											<span className="font-mono text-[7px] text-black/40">VID</span>
										</div>
									) : (
										<img
											src={img.src}
											alt=""
											className="w-full h-full object-cover"
											style={{ filter: idx === selectedImage ? 'none' : 'grayscale(1)' }}
											crossOrigin="anonymous"
										/>
									)}
								</button>
							))}
						</div>

						<button
							onClick={(e) => { e.stopPropagation(); goNext(); }}
							className="absolute right-4 top-1/2 -translate-y-1/2 cursor-interactive text-black/40 hover:text-black transition-colors p-2 z-10"
							aria-label="Next image"
						>
							<ChevronRight className="w-6 h-6" />
						</button>

						<button
							onClick={() => setSelectedImage(null)}
							className="absolute top-5 right-6 cursor-interactive text-black/60 hover:text-black transition-colors p-2"
							aria-label="Close lightbox"
						>
							<X className="w-5 h-5" />
						</button>

						<p className="absolute top-5 left-6 font-mono text-[10px] text-black/30 uppercase tracking-wider">
							{selectedImage + 1} / {theme.images.length}
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
