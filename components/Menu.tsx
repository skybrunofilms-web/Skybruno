'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Mail } from 'lucide-react';
import type { GalleryTheme } from './GalleryOverlay';

interface MenuProps {
	themes: GalleryTheme[];
	onSelectTheme: (theme: GalleryTheme) => void;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

// Interactive pixel text with animated gradient light sweep
function PixelText({
	text,
	baseOpacity,
	fontSize: targetFontSize,
	onClick,
	italic = false,
	lightPhase,
}: {
	text: string;
	baseOpacity: number;
	fontSize: number;
	onClick?: () => void;
	italic?: boolean;
	lightPhase: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const pixelsRef = useRef<
		{
			bx: number;
			by: number;
			ox: number;
			oy: number;
			vx: number;
			vy: number;
			size: number;
			baseAlpha: number;
			normX: number;
		}[]
	>([]);
	const basePixelsRef = useRef<
		{ x: number; y: number; w: number; h: number; baseAlpha: number; normX: number }[]
	>([]);
	const mouseRef = useRef({ x: -1000, y: -1000 });
	const rafRef = useRef(0);
	const [ready, setReady] = useState(false);
	const [dims, setDims] = useState({ w: 400, h: 80 });
	const lightPhaseRef = useRef(lightPhase);
	lightPhaseRef.current = lightPhase;

	useEffect(() => {
		const measure = () => {
			if (containerRef.current) {
				const w = containerRef.current.clientWidth;
				const h = Math.max(40, targetFontSize * 1.4);
				setDims({ w, h });
			}
		};
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, [targetFontSize]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const dpr = window.devicePixelRatio || 1;
		const { w, h } = dims;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, w, h);

		const fs = targetFontSize;
		const family = '"Ailerons", "Space Grotesk", sans-serif';
			ctx.font = `${italic ? 'italic ' : ''}400 ${fs}px ${family}`;
		ctx.textBaseline = 'middle';
		ctx.fillStyle = 'rgba(0,0,0,1)';

		const spacing = fs * 0.04;
		/* Reverse the string so text reads right-to-left (mirrored) */
		const reversed = text.split('').reverse().join('');
		const chars = reversed.split('');
		const charWidths = chars.map((c) => ctx.measureText(c).width);

		/* Render from right edge, reversed characters */
		let cursorX = w - 4;
		for (let i = 0; i < chars.length; i++) {
			cursorX -= charWidths[i];
			ctx.fillText(chars[i], cursorX, h * 0.48);
			cursorX -= spacing;
		}

		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const px = imgData.data;
		const cw = canvas.width;
		const ch = canvas.height;
		const block = Math.max(2, Math.round(dpr * 2.5));
		const dStart = Math.floor(ch * 0.52);
		const dEnd = Math.floor(ch * 0.85);
		const dRange = dEnd - dStart;
		const fragments: typeof pixelsRef.current = [];
		const solidPixels: typeof basePixelsRef.current = [];

		const rand = (x: number, y: number) => {
			const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
			return n - Math.floor(n);
		};

		for (let y = 0; y < dStart; y += block) {
			for (let x = 0; x < cw; x += block) {
				const ci = (y * cw + x) * 4;
				if (px[ci + 3] > 20) {
					solidPixels.push({
						x: x / dpr, y: y / dpr, w: block / dpr, h: block / dpr,
						baseAlpha: px[ci + 3] / 255, normX: x / cw,
					});
				}
			}
		}

		for (let y = dStart; y < ch; y += block) {
			for (let x = 0; x < cw; x += block) {
				const progress = Math.min(1, (y - dStart) / dRange);
				const removeChance = Math.pow(progress, 1.2);
				const r = rand(Math.floor(x / block), Math.floor(y / block));
				if (r < removeChance) {
					const ci = (y * cw + x) * 4;
					if (px[ci + 3] > 20) {
						fragments.push({
							bx: x / dpr, by: y / dpr, ox: 0, oy: 0, vx: 0, vy: 0,
							size: block / dpr, baseAlpha: px[ci + 3] / 255, normX: x / cw,
						});
					}
					for (let by = 0; by < block && y + by < ch; by++) {
						for (let bx = 0; bx < block && x + bx < cw; bx++) {
							const i2 = ((y + by) * cw + (x + bx)) * 4;
							px[i2 + 3] = 0;
						}
					}
				} else {
					const ci = (y * cw + x) * 4;
					if (px[ci + 3] > 20) {
						solidPixels.push({
							x: x / dpr, y: y / dpr, w: block / dpr, h: block / dpr,
							baseAlpha: px[ci + 3] / 255, normX: x / cw,
						});
					}
				}
			}
		}

		for (let y = dEnd; y < ch - block; y += block) {
			for (let x = 0; x < cw; x += block) {
				const r = rand(x + 500, y + 300);
				const lookY = Math.max(0, dStart - block);
				const lookI = (lookY * cw + Math.min(x, cw - 1)) * 4;
				if (px[lookI + 3] < 5) continue;
				if (r > 0.88) {
					const depth = (y - dEnd) / (ch - dEnd);
					fragments.push({
						bx: x / dpr, by: y / dpr, ox: 0, oy: 0, vx: 0, vy: 0,
						size: block / dpr, baseAlpha: Math.max(0.1, 1 - depth * 0.7), normX: x / cw,
					});
				}
			}
		}

		basePixelsRef.current = solidPixels;
		pixelsRef.current = fragments;
		setReady(true);
	}, [dims, text, targetFontSize, italic]);

	const handleMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const rect = canvasRef.current?.getBoundingClientRect();
			if (rect)
				mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		},
		[]
	);

	const handleLeave = useCallback(() => {
		mouseRef.current = { x: -1000, y: -1000 };
	}, []);

	const getGradientAlpha = (normX: number, phase: number, _base: number): number => {
		const lightCenter = phase;
		const lightWidth = 0.35;
		const dist = Math.abs(normX - lightCenter);
		const brightness = Math.exp(-(dist * dist) / (2 * lightWidth * lightWidth));
		const minAlpha = baseOpacity * 0.15;
		const maxAlpha = Math.min(1, baseOpacity * 0.4 + brightness * 0.9);
		return minAlpha + (maxAlpha - minAlpha) * brightness;
	};

	useEffect(() => {
		if (!ready) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const loop = () => {
			const ctx = canvas.getContext('2d');
			if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

			const { w, h } = dims;
			ctx.clearRect(0, 0, w, h);

			const phase = lightPhaseRef.current;
			const mx = mouseRef.current.x;
			const my = mouseRef.current.y;
			const radius = 80;

			for (const p of basePixelsRef.current) {
				const alpha = getGradientAlpha(p.normX, phase, p.baseAlpha);
				ctx.fillStyle = `rgba(0,0,0,${alpha})`;
				ctx.fillRect(p.x, p.y, p.w, p.h);
			}

			for (const p of pixelsRef.current) {
				const dx = p.bx + p.ox - mx;
				const dy = p.by + p.oy - my;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < radius && mx > 0) {
					const force = (1 - dist / radius) * 6;
					const angle = Math.atan2(dy, dx);
					p.vx += Math.cos(angle) * force;
					p.vy += Math.sin(angle) * force;
				}

				p.vx += -p.ox * 0.04;
				p.vy += -p.oy * 0.04;
				p.vx *= 0.85;
				p.vy *= 0.85;
				p.ox += p.vx;
				p.oy += p.vy;

				const alpha = getGradientAlpha(p.normX, phase, p.baseAlpha);
				ctx.fillStyle = `rgba(0,0,0,${alpha})`;
				ctx.fillRect(p.bx + p.ox, p.by + p.oy, p.size, p.size);
			}

			rafRef.current = requestAnimationFrame(loop);
		};

		rafRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafRef.current);
	}, [ready, baseOpacity, dims]);

	return (
		<div ref={containerRef} className="w-full cursor-interactive" data-menu onClick={onClick}>
			<canvas
				ref={canvasRef}
				className="w-full cursor-interactive"
				style={{ height: `${dims.h}px` }}
				onMouseMove={handleMove}
				onMouseLeave={handleLeave}
			/>
		</div>
	);
}

export default function Menu({ themes, onSelectTheme, isOpen, onOpenChange }: MenuProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const open = isOpen !== undefined ? isOpen : internalOpen;
	const setOpen = useCallback((v: boolean) => {
		setInternalOpen(v);
		onOpenChange?.(v);
	}, [onOpenChange]);
	const [fontSize, setFontSize] = useState(64);
	const [arenaImage, setArenaImage] = useState<{ url: string; title: string } | null>(null);
	const [showEasterEgg, setShowEasterEgg] = useState(false);
	const [lightPhase, setLightPhase] = useState(0);

	// Sync external isOpen to internal
	useEffect(() => {
		if (isOpen !== undefined && isOpen !== internalOpen) {
			setInternalOpen(isOpen);
		}
	}, [isOpen]);

	// Animate the light sweep
	useEffect(() => {
		if (!open) return;
		let raf: number;
		let start: number | null = null;
		const duration = 4000;

		const animate = (timestamp: number) => {
			if (!start) start = timestamp;
			const elapsed = timestamp - start;
			const cycle = (elapsed % (duration * 2)) / duration;
			const phase = cycle <= 1 ? cycle : 2 - cycle;
			setLightPhase(phase);
			raf = requestAnimationFrame(animate);
		};

		raf = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(raf);
	}, [open]);

	useEffect(() => {
		const update = () => {
			const w = window.innerWidth;
			if (w < 640) setFontSize(36);
			else if (w < 1024) setFontSize(52);
			else setFontSize(72);
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, []);

	const fetchArenaImage = useCallback(() => {
		fetch('/api/arena?t=' + Date.now())
			.then((r) => r.json())
			.then((data) => {
				if (data.url) {
					setArenaImage(data);
					setShowEasterEgg(true);
				}
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (!open) return;
		fetch('/api/arena?t=' + Date.now())
			.then((r) => r.json())
			.then((data) => {
				if (data.url) setArenaImage(data);
			})
			.catch(() => {});
	}, [open]);

	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
			setShowEasterEgg(false);
		}
		return () => { document.body.style.overflow = ''; };
	}, [open]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (showEasterEgg) setShowEasterEgg(false);
				else if (open) setOpen(false);
			}
		};
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [open, showEasterEgg]);

	const handleThemeClick = (theme: GalleryTheme) => {
		setOpen(false);
		onSelectTheme(theme);
	};

	const getItemOpacity = (index: number, total: number) => {
		if (total <= 1) return 1;
		const t = index / (total - 1);
		return 1 - t * 0.85;
	};

	return (
		<>
			{/* Rounded pill MENU button -- fixed on the left side */}
			<motion.button
				onClick={() => setOpen(!open)}
				className="fixed left-5 top-1/2 -translate-y-1/2 z-[70] cursor-pointer"
				aria-label={open ? 'Close menu' : 'Open menu'}
				whileHover="hover"
				initial={false}
			>
				<motion.div
					className="relative backdrop-blur-sm flex items-center justify-center overflow-hidden"
						style={{
							borderRadius: '100px',
							writingMode: 'vertical-rl',
							textOrientation: 'mixed',
							transform: 'rotate(180deg)',
							borderWidth: 1,
							borderStyle: 'solid',
						}}
					variants={{
						hover: { backgroundColor: 'rgba(0,0,0,0.08)', borderColor: 'rgba(0,0,0,0.15)' },
					}}
					animate={{
						paddingTop: open ? '16px' : '24px',
						paddingBottom: open ? '16px' : '24px',
						paddingLeft: '8px',
						paddingRight: '8px',
						backgroundColor: 'rgba(0,0,0,0.04)',
						borderColor: 'rgba(0,0,0,0.08)',
					}}
					transition={{ duration: 0.3 }}
				>
					<AnimatePresence mode="wait">
						{!open ? (
							<motion.span
								key="menu"
								initial={{ opacity: 0, y: -5 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 5 }}
								transition={{ duration: 0.2 }}
								className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50"
							>
								Menu
							</motion.span>
						) : (
							<motion.span
								key="close"
								initial={{ opacity: 0, y: -5 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 5 }}
								transition={{ duration: 0.2 }}
								className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/70"
							>
								Close
							</motion.span>
						)}
					</AnimatePresence>
				</motion.div>
			</motion.button>

			{/* Blur backdrop -- blurs the page content behind */}
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
						className="fixed inset-0 z-[64]"
						style={{
						backdropFilter: 'blur(40px) saturate(0.5)',
						WebkitBackdropFilter: 'blur(40px) saturate(0.5)',
						backgroundColor: 'rgba(255,255,255,0.7)',
						}}
						onClick={() => setOpen(false)}
					/>
				)}
			</AnimatePresence>

			{/* Menu content overlay */}
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.5, ease: [0.25, 0.1, 0, 1] }}
						className="fixed inset-0 z-[65] pointer-events-none"
					>
						<div className="h-full flex flex-col justify-center pl-20 md:pl-28 lg:pl-36 pr-6 md:pr-12 pointer-events-auto">
								<nav className="flex flex-col gap-1">
								{themes.map((theme, i) => (
									<motion.div
										key={theme.id}
										initial={{ opacity: 0, x: -30 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											delay: 0.25 + i * 0.08,
											duration: 0.5,
											ease: [0.25, 0.1, 0, 1],
										}}
									>
										<PixelText
											text={theme.title}
											baseOpacity={getItemOpacity(i, themes.length)}
											fontSize={fontSize}
											onClick={() => handleThemeClick(theme)}
											italic={i % 2 === 1}
											lightPhase={lightPhase}
										/>
									</motion.div>
								))}
							</nav>

							{/* Section pages */}
							<div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
								{[
									{ label: 'Journal', href: '/journal' },
									{ label: 'Books', href: '/books' },
									{ label: 'Wardrobe', href: '/wardrobe' },
								].map((page, pi) => (
									<motion.div
										key={page.href}
										initial={{ opacity: 0, x: -30 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											delay: 0.25 + (themes.length + pi) * 0.08,
											duration: 0.5,
											ease: [0.25, 0.1, 0, 1],
										}}
									>
										<PixelText
											text={page.label}
											baseOpacity={0.2}
											fontSize={Math.round(fontSize * 0.55)}
											onClick={() => { window.location.href = page.href; }}
											italic={pi % 2 === 0}
											lightPhase={lightPhase}
										/>
									</motion.div>
								))}
							</div>

							{/* Leave a Note */}
							<motion.div
								initial={{ opacity: 0, x: -30 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.25 + (themes.length + 3) * 0.08, duration: 0.5, ease: [0.25, 0.1, 0, 1] }}
								className="mt-4"
							>
								<PixelText
									text="Leave a note"
									baseOpacity={0.12}
									fontSize={Math.round(fontSize * 0.55)}
									onClick={() => { window.location.href = '/note'; }}
									italic
									lightPhase={lightPhase}
								/>
							</motion.div>

							{/* Footer asterisk -- same PixelText style */}
							<motion.div
								initial={{ opacity: 0, x: -30 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.3 + (themes.length + 4) * 0.08, duration: 0.5, ease: [0.25, 0.1, 0, 1] }}
								className="mt-2"
							>
								<PixelText
									text="*"
									baseOpacity={0.08}
									fontSize={Math.round(fontSize * 0.7)}
									onClick={fetchArenaImage}
									italic={false}
									lightPhase={lightPhase}
								/>
							</motion.div>
						</div>

						{/* Contact links */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.5, duration: 0.6 }}
							className="absolute bottom-8 left-20 md:left-28 lg:left-36 flex items-center gap-6 pointer-events-auto"
						>
							<a
								href="https://instagram.com/sky.bruno"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-black/25 hover:text-black/60 transition-colors tracking-wide"
							>
								<Instagram className="w-3 h-3" />
								@sky.bruno
							</a>
							<a
								href="mailto:skybrunofilms@gmail.com"
								className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-black/25 hover:text-black/60 transition-colors tracking-wide"
							>
								<Mail className="w-3 h-3" />
								skybrunofilms@gmail.com
							</a>
						</motion.div>

						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.6, duration: 0.5 }}
							className="absolute bottom-8 right-8 font-mono text-[9px] uppercase text-black/15 tracking-[0.15em] pointer-events-auto"
						>
							&copy; {new Date().getFullYear()}
						</motion.p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Easter egg fullscreen */}
			<AnimatePresence>
				{showEasterEgg && arenaImage && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.4 }}
						className="fixed inset-0 z-[80] bg-black flex items-center justify-center cursor-pointer"
						onClick={() => setShowEasterEgg(false)}
					>
						<a
							href="https://www.are.na/cinema-ciel/my-bdsm"
							target="_blank"
							rel="noopener noreferrer"
							className="max-w-[85vw] max-h-[85vh]"
							onClick={(e) => e.stopPropagation()}
						>
							<img
								src={arenaImage.url}
								alt={arenaImage.title || 'From Are.na'}
								className="max-w-full max-h-[85vh] object-contain"
								crossOrigin="anonymous"
							/>
						</a>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
