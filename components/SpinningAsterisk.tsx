'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// Renders the actual horse.png image (solid, not pixelated) with
// pixel particles swarming around it. On click, the horse gallops
// across the full screen width leaving a pixel trail.

interface SwarmParticle {
	x: number;
	y: number;
	homeX: number;
	homeY: number;
	size: number;
	alpha: number;
	speed: number;
	phase: number;
}

interface TrailParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	alpha: number;
	size: number;
	life: number;
}

export default function SpinningAsterisk({
	size = 72,
	onClick,
}: {
	size?: number;
	onClick?: () => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imgRef = useRef<HTMLImageElement | null>(null);
	const swarmRef = useRef<SwarmParticle[]>([]);
	const trailRef = useRef<TrailParticle[]>([]);
	const animRef = useRef(0);
	const runningRef = useRef(false);
	const runXRef = useRef(0);
	const hoverRef = useRef(false);
	const callbackFiredRef = useRef(false);
	const [ready, setReady] = useState(false);

	const canvasW = size * 2.5;
	const canvasH = size * 1.4;
	const horseW = size * 1.6;
	const horseH = size * 0.9;
	const horseHomeX = (canvasW - horseW) / 2;
	const horseHomeY = (canvasH - horseH) / 2;

	// Load image
	useEffect(() => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			imgRef.current = img;

			// Create swarm particles around the horse area
			const particles: SwarmParticle[] = [];
			for (let i = 0; i < 30; i++) {
				const angle = Math.random() * Math.PI * 2;
				const dist = 8 + Math.random() * 35;
				const cx = canvasW / 2;
				const cy = canvasH / 2;
				particles.push({
					x: cx + Math.cos(angle) * dist,
					y: cy + Math.sin(angle) * dist,
					homeX: cx + Math.cos(angle) * dist,
					homeY: cy + Math.sin(angle) * dist,
					size: 1 + Math.random() * 2.5,
					alpha: 0.1 + Math.random() * 0.25,
					speed: 0.3 + Math.random() * 0.7,
					phase: Math.random() * Math.PI * 2,
				});
			}
			swarmRef.current = particles;
			trailRef.current = [];
			runXRef.current = 0;
			runningRef.current = false;
			callbackFiredRef.current = false;
			setReady(true);
		};
		img.src = '/horse.png';
	}, [size, canvasW, canvasH]);

	// Click -- gallop across the entire screen
	const handleClick = useCallback(() => {
		if (runningRef.current) return;
		runningRef.current = true;
		runXRef.current = 0;
		callbackFiredRef.current = false;
		trailRef.current = [];
	}, []);

	// Render loop
	useEffect(() => {
		if (!ready) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = canvasW * dpr;
		canvas.height = canvasH * dpr;
		canvas.style.width = `${canvasW}px`;
		canvas.style.height = `${canvasH}px`;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.scale(dpr, dpr);

		// Calculate how far the horse needs to travel to exit the screen
		// The canvas is small, so the horse just needs to go off the right edge
		const totalRunDistance = canvasW + horseW;

		const loop = () => {
			ctx.clearRect(0, 0, canvasW, canvasH);
			const time = performance.now() * 0.001;

			let currentHorseX = horseHomeX;
			let currentHorseY = horseHomeY;
			let bobY = 0;

			// Running state
			if (runningRef.current) {
				runXRef.current += canvasW * 0.018; // ~1.8% of canvas per frame = full cross in ~55 frames
				currentHorseX = horseHomeX + runXRef.current;

				// Gallop bob
				bobY = Math.sin(time * 18) * 2.5;
				currentHorseY += bobY;

				// Shed trail particles from behind the horse
				if (Math.random() > 0.15) {
					const trailX = currentHorseX - 2;
					const trailCy = currentHorseY + horseH / 2;
					for (let i = 0; i < 3; i++) {
						trailRef.current.push({
							x: trailX + Math.random() * 6,
							y: trailCy + (Math.random() - 0.5) * horseH * 0.7,
							vx: -(2 + Math.random() * 3),
							vy: (Math.random() - 0.5) * 2,
							alpha: 0.3 + Math.random() * 0.5,
							size: 1 + Math.random() * 3,
							life: 1,
						});
					}
				}

				// Horse has exited canvas -- reset and fire callback
				if (runXRef.current > totalRunDistance && !callbackFiredRef.current) {
					callbackFiredRef.current = true;
					// Let trail linger briefly then reset
					setTimeout(() => {
						runningRef.current = false;
						runXRef.current = 0;
						trailRef.current = [];
						onClick?.();
					}, 600);
				}
			} else {
				// Subtle breathing
				currentHorseY += Math.sin(time * 1.5) * 0.6;
			}

			// Draw trail particles
			for (let i = trailRef.current.length - 1; i >= 0; i--) {
				const t = trailRef.current[i];
				t.x += t.vx;
				t.y += t.vy;
				t.life -= 0.015;
				t.alpha *= 0.97;

				if (t.life <= 0 || t.alpha < 0.01) {
					trailRef.current.splice(i, 1);
					continue;
				}

				ctx.fillStyle = `rgba(255,255,255,${t.alpha * t.life})`;
				ctx.fillRect(t.x, t.y, t.size, t.size);
			}

			// Draw swarm particles
			for (const s of swarmRef.current) {
				let sx = s.homeX + Math.sin(time * s.speed + s.phase) * 6;
				let sy = s.homeY + Math.cos(time * s.speed * 0.8 + s.phase) * 5;

				if (hoverRef.current && !runningRef.current) {
					sx += Math.sin(time * 3.5 + s.phase) * 5;
					sy += Math.cos(time * 3.5 + s.phase) * 5;
				}

				if (runningRef.current) {
					// Swarm follows horse loosely
					sx += runXRef.current * 0.6;
					const fadeAlpha = Math.max(0, s.alpha * (1 - runXRef.current / totalRunDistance));
					ctx.fillStyle = `rgba(255,255,255,${fadeAlpha})`;
				} else {
					ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
				}
				ctx.fillRect(sx, sy, s.size, s.size);
			}

			// Draw the actual horse image (solid, inverted to white on dark)
			if (imgRef.current) {
				// Only draw if on-screen
				if (currentHorseX < canvasW + 10 && currentHorseX > -horseW - 10) {
					ctx.save();
					// Draw the image
					ctx.drawImage(imgRef.current, currentHorseX, currentHorseY, horseW, horseH);

					// Invert: draw white over the dark pixels using composite modes
					// First draw image, then use it as a mask to fill white
					ctx.globalCompositeOperation = 'source-atop';
					ctx.fillStyle = 'white';
					ctx.fillRect(currentHorseX, currentHorseY, horseW, horseH);

					// Clear the light/white background areas of the original image
					// by redrawing with destination-in
					ctx.globalCompositeOperation = 'destination-in';
					ctx.drawImage(imgRef.current, currentHorseX, currentHorseY, horseW, horseH);

					ctx.restore();
				}
			}

			animRef.current = requestAnimationFrame(loop);
		};

		animRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(animRef.current);
	}, [ready, canvasW, canvasH, horseW, horseH, horseHomeX, horseHomeY, onClick]);

	return (
		<canvas
			ref={canvasRef}
			className="cursor-pointer"
			style={{ width: canvasW, height: canvasH }}
			onClick={handleClick}
			onMouseEnter={() => { hoverRef.current = true; }}
			onMouseLeave={() => { hoverRef.current = false; }}
		/>
	);
}
