'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function ShadowTitle() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const pixelsRef = useRef<
		{ bx: number; by: number; ox: number; oy: number; vx: number; vy: number; size: number; baseAlpha: number; normX: number }[]
	>([]);
	const basePixelsRef = useRef<
		{ x: number; y: number; w: number; h: number; baseAlpha: number; normX: number }[]
	>([]);
	const mouseRef = useRef({ x: -1000, y: -1000 });
	const rafRef = useRef(0);
	const phaseRef = useRef(0);
	const [ready, setReady] = useState(false);
	const [dims, setDims] = useState({ w: 800, h: 200 });

	useEffect(() => {
		const measure = () => {
			if (containerRef.current) {
				const w = containerRef.current.clientWidth;
				const fs = Math.min(w * 0.14, 140);
				const h = Math.max(80, fs * 1.6);
				setDims({ w, h });
			}
		};
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, []);

	/* Sample pixels from rendered text -- identical to Menu PixelText */
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

		const fs = Math.min(w * 0.14, 140);
		const family = '"Ailerons", "Space Grotesk", sans-serif';
		ctx.font = `400 ${fs}px ${family}`;
		ctx.textBaseline = 'middle';
		ctx.fillStyle = 'rgba(0,0,0,1)';

		const text = 'INTHEMAKING';
		const spacing = fs * 0.04;

		/* Reverse then draw right-to-left (same as Menu) */
		const reversed = text.split('').reverse().join('');
		const chars = reversed.split('');
		const charWidths = chars.map((c) => ctx.measureText(c).width);

		let cursorX = w - 4;
		for (let i = 0; i < chars.length; i++) {
			cursorX -= charWidths[i];
			ctx.fillText(chars[i], cursorX, h * 0.44);
			cursorX -= spacing;
		}

		/* Sample image data and build solid + fragment pixel arrays */
		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const px = imgData.data;
		const cw = canvas.width;
		const ch = canvas.height;
		const block = Math.max(2, Math.round(dpr * 2.5));
		const dStart = Math.floor(ch * 0.55);
		const dEnd = Math.floor(ch * 0.85);
		const dRange = dEnd - dStart;
		const fragments: typeof pixelsRef.current = [];
		const solidPixels: typeof basePixelsRef.current = [];

		const rand = (x: number, y: number) => {
			const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
			return n - Math.floor(n);
		};

		/* Solid region (top part of text) */
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

		/* Dissolve zone */
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

		/* Scattered fragments below the text */
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
	}, [dims]);

	const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (rect) mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}, []);

	const handleLeave = useCallback(() => {
		mouseRef.current = { x: -1000, y: -1000 };
	}, []);

	const getGradientAlpha = (normX: number, phase: number, _base: number): number => {
		const lightCenter = phase;
		const lightWidth = 0.35;
		const dist = Math.abs(normX - lightCenter);
		const brightness = Math.exp(-(dist * dist) / (2 * lightWidth * lightWidth));
		const minAlpha = 0.08;
		const maxAlpha = Math.min(1, 0.25 + brightness * 0.85);
		return minAlpha + (maxAlpha - minAlpha) * brightness;
	};

	/* Render loop */
	useEffect(() => {
		if (!ready) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const loop = () => {
			const ctx = canvas.getContext('2d');
			if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

			const { w, h } = dims;
			ctx.clearRect(0, 0, w, h);

			/* Advance sweep phase */
			phaseRef.current += 0.003;
			if (phaseRef.current > 1.4) phaseRef.current = -0.4;
			const phase = phaseRef.current;

			const mx = mouseRef.current.x;
			const my = mouseRef.current.y;
			const radius = 100;

			/* Draw solid pixels */
			for (const p of basePixelsRef.current) {
				const alpha = getGradientAlpha(p.normX, phase, p.baseAlpha);
				ctx.fillStyle = `rgba(0,0,0,${alpha})`;
				ctx.fillRect(p.x, p.y, p.w, p.h);
			}

			/* Draw & animate fragments */
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
	}, [ready, dims]);

	return (
		<div ref={containerRef} className="w-full cursor-interactive" data-menu>
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
