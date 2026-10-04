'use client';

import { useEffect, useRef } from 'react';

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	birth: number;
	life: number;
	size: number;
}

export default function CursorTrail() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const particles = useRef<Particle[]>([]);
	const mouse = useRef({ x: -100, y: -100 });
	const rafRef = useRef<number>(0);
	const isTouch = useRef(false);

	useEffect(() => {
		// Disable on touch devices
		if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) {
			isTouch.current = true;
			return;
		}

		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d')!;

		const resize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		resize();
		window.addEventListener('resize', resize);

		const onMove = (e: MouseEvent) => {
			const prev = mouse.current;
			const dx = e.clientX - prev.x;
			const dy = e.clientY - prev.y;
			const speed = Math.sqrt(dx * dx + dy * dy);
			mouse.current = { x: e.clientX, y: e.clientY };

			// Spawn particles based on movement speed
			const count = Math.min(3, Math.floor(speed / 8));
			for (let i = 0; i < count; i++) {
				particles.current.push({
					x: e.clientX + (Math.random() - 0.5) * 4,
					y: e.clientY + (Math.random() - 0.5) * 4,
					vx: (Math.random() - 0.5) * 0.5,
					vy: Math.random() * 0.3 + 0.1,
					birth: performance.now(),
					life: 400 + Math.random() * 300,
					size: 1 + Math.random() * 1.5,
				});
			}

			// Cap particles
			if (particles.current.length > 60) {
				particles.current = particles.current.slice(-60);
			}
		};

		const onClick = (e: MouseEvent) => {
			// Burst on click
			for (let i = 0; i < 10; i++) {
				const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
				const speed = 1 + Math.random() * 2;
				particles.current.push({
					x: e.clientX,
					y: e.clientY,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed,
					birth: performance.now(),
					life: 500 + Math.random() * 400,
					size: 1.5 + Math.random() * 1.5,
				});
			}
		};

		window.addEventListener('mousemove', onMove);
		window.addEventListener('click', onClick);

		const animate = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			const now = performance.now();

			particles.current = particles.current.filter((p) => {
				const age = now - p.birth;
				if (age > p.life) return false;

				const progress = age / p.life;
				const alpha = (1 - progress) * 0.35;

				p.x += p.vx;
				p.y += p.vy;
				p.vy += 0.02; // gravity

				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
				ctx.fillStyle = `rgba(255,255,255,${alpha})`;
				ctx.fill();

				return true;
			});

			rafRef.current = requestAnimationFrame(animate);
		};

		rafRef.current = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(rafRef.current);
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('click', onClick);
			window.removeEventListener('resize', resize);
		};
	}, []);

	if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return null;

	return (
		<canvas
			ref={canvasRef}
			className="fixed inset-0 z-[55] pointer-events-none"
			aria-hidden="true"
		/>
	);
}
