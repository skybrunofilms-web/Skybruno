'use client';

import { useRef, useEffect, useCallback } from 'react';

// Draw the mandala symbol onto an offscreen canvas to sample its pixels
function drawMandala(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
	ctx.save();
	ctx.translate(cx, cy);

	// Outer circle
	ctx.beginPath();
	ctx.arc(0, 0, r, 0, Math.PI * 2);
	ctx.fillStyle = '#ffffff';
	ctx.fill();

	// Central void
	ctx.beginPath();
	ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
	ctx.fillStyle = '#000000';
	ctx.fill();

	// Cut out teardrop petals (6 pairs radiating from center)
	const petalCount = 6;
	for (let i = 0; i < petalCount; i++) {
		const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
		ctx.save();
		ctx.rotate(angle);

		// Inner petal cutout
		ctx.beginPath();
		ctx.moveTo(0, -r * 0.28);
		ctx.bezierCurveTo(
			r * 0.18, -r * 0.32,
			r * 0.28, -r * 0.5,
			r * 0.15, -r * 0.62
		);
		ctx.bezierCurveTo(
			r * 0.02, -r * 0.72,
			-r * 0.02, -r * 0.72,
			-r * 0.15, -r * 0.62
		);
		ctx.bezierCurveTo(
			-r * 0.28, -r * 0.5,
			-r * 0.18, -r * 0.32,
			0, -r * 0.28
		);
		ctx.fillStyle = '#000000';
		ctx.fill();

		// Outer crescent cutout between petals
		const midAngle = ((i + 0.5) / petalCount) * Math.PI * 2 - Math.PI / 2;
		ctx.restore();
		ctx.save();
		ctx.rotate(midAngle);

		ctx.beginPath();
		ctx.moveTo(-r * 0.12, -r * 0.82);
		ctx.bezierCurveTo(
			-r * 0.06, -r * 0.92,
			r * 0.06, -r * 0.92,
			r * 0.12, -r * 0.82
		);
		ctx.bezierCurveTo(
			r * 0.08, -r * 0.88,
			-r * 0.08, -r * 0.88,
			-r * 0.12, -r * 0.82
		);
		ctx.fillStyle = '#000000';
		ctx.fill();

		ctx.restore();
		ctx.save();
		ctx.rotate(angle);
		ctx.restore();
	}

	ctx.restore();
}

interface Particle {
	// Home position (relative to shape center)
	hx: number;
	hy: number;
	// Current position
	x: number;
	y: number;
	// Velocity
	vx: number;
	vy: number;
	// Size
	size: number;
	alpha: number;
}

export default function Footer() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const particles = useRef<Particle[]>([]);
	const mouse = useRef({ x: 0, y: 0, down: false, prevX: 0, prevY: 0 });
	const shapeCenter = useRef({ x: 0, y: 0 });
	const shapeScale = useRef(1);
	const dragOffset = useRef({ x: 0, y: 0 });
	const isDraggingShape = useRef(false);
	const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
	const frameId = useRef(0);
	const initialized = useRef(false);

	const sampleParticles = useCallback((width: number, height: number) => {
		// Draw mandala to offscreen canvas and sample white pixels
		const size = Math.min(width, height) * 0.4;
		const offscreen = document.createElement('canvas');
		offscreen.width = Math.ceil(size * 2);
		offscreen.height = Math.ceil(size * 2);
		const offCtx = offscreen.getContext('2d')!;
		offCtx.fillStyle = '#000000';
		offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
		drawMandala(offCtx, size, size, size * 0.9);

		const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
		const data = imageData.data;
		const step = 3; // sample every 3rd pixel for density
		const pts: Particle[] = [];

		for (let y = 0; y < offscreen.height; y += step) {
			for (let x = 0; x < offscreen.width; x += step) {
				const i = (y * offscreen.width + x) * 4;
				if (data[i] > 128) {
					// This pixel is part of the shape
					const hx = x - size;
					const hy = y - size;
					pts.push({
						hx, hy,
						x: shapeCenter.current.x + hx,
						y: shapeCenter.current.y + hy,
						vx: 0, vy: 0,
						size: 2 + Math.random() * 1.5,
						alpha: 0.6 + Math.random() * 0.4,
					});
				}
			}
		}

		particles.current = pts;
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d')!;

		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			const rect = canvas.getBoundingClientRect();
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			if (!initialized.current) {
				shapeCenter.current = { x: rect.width / 2, y: rect.height / 2 };
				shapeScale.current = 1;
				sampleParticles(rect.width, rect.height);
				initialized.current = true;
			}
		};

		resize();
		window.addEventListener('resize', resize);

		// Mouse / touch handlers
		const getPos = (e: MouseEvent | Touch) => {
			const rect = canvas.getBoundingClientRect();
			return { x: e.clientX - rect.left, y: e.clientY - rect.top };
		};

		const onMouseDown = (e: MouseEvent) => {
			const pos = getPos(e);
			mouse.current = { ...mouse.current, x: pos.x, y: pos.y, down: true, prevX: pos.x, prevY: pos.y };

			// Check if clicking near the shape center to drag
			const dx = pos.x - shapeCenter.current.x;
			const dy = pos.y - shapeCenter.current.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const rect = canvas.getBoundingClientRect();
			const shapeRadius = Math.min(rect.width, rect.height) * 0.4 * shapeScale.current;

			if (dist < shapeRadius * 1.2) {
				isDraggingShape.current = true;
				dragOffset.current = { x: dx, y: dy };
			}
		};

		const onMouseMove = (e: MouseEvent) => {
			const pos = getPos(e);
			mouse.current.prevX = mouse.current.x;
			mouse.current.prevY = mouse.current.y;
			mouse.current.x = pos.x;
			mouse.current.y = pos.y;

			if (isDraggingShape.current) {
				shapeCenter.current.x = pos.x - dragOffset.current.x;
				shapeCenter.current.y = pos.y - dragOffset.current.y;
			}
		};

		const onMouseUp = () => {
			mouse.current.down = false;
			isDraggingShape.current = false;
		};

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const delta = e.deltaY * -0.001;
			shapeScale.current = Math.max(0.05, Math.min(4, shapeScale.current + delta));
		};

		// Touch support
		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length === 2) {
				const dx = e.touches[0].clientX - e.touches[1].clientX;
				const dy = e.touches[0].clientY - e.touches[1].clientY;
				pinchStart.current = { dist: Math.sqrt(dx * dx + dy * dy), scale: shapeScale.current };
			} else if (e.touches.length === 1) {
				const pos = getPos(e.touches[0]);
				mouse.current = { ...mouse.current, x: pos.x, y: pos.y, down: true, prevX: pos.x, prevY: pos.y };
				const dx = pos.x - shapeCenter.current.x;
				const dy = pos.y - shapeCenter.current.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const rect = canvas.getBoundingClientRect();
				const shapeRadius = Math.min(rect.width, rect.height) * 0.4 * shapeScale.current;
				if (dist < shapeRadius * 1.2) {
					isDraggingShape.current = true;
					dragOffset.current = { x: dx, y: dy };
				}
			}
		};

		const onTouchMove = (e: TouchEvent) => {
			e.preventDefault();
			if (e.touches.length === 2 && pinchStart.current) {
				const dx = e.touches[0].clientX - e.touches[1].clientX;
				const dy = e.touches[0].clientY - e.touches[1].clientY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				shapeScale.current = Math.max(0.05, Math.min(4, pinchStart.current.scale * (dist / pinchStart.current.dist)));
			} else if (e.touches.length === 1) {
				const pos = getPos(e.touches[0]);
				mouse.current.prevX = mouse.current.x;
				mouse.current.prevY = mouse.current.y;
				mouse.current.x = pos.x;
				mouse.current.y = pos.y;
				if (isDraggingShape.current) {
					shapeCenter.current.x = pos.x - dragOffset.current.x;
					shapeCenter.current.y = pos.y - dragOffset.current.y;
				}
			}
		};

		const onTouchEnd = () => {
			mouse.current.down = false;
			isDraggingShape.current = false;
			pinchStart.current = null;
		};

		canvas.addEventListener('mousedown', onMouseDown);
		canvas.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		canvas.addEventListener('touchstart', onTouchStart, { passive: false });
		canvas.addEventListener('touchmove', onTouchMove, { passive: false });
		canvas.addEventListener('touchend', onTouchEnd);

		// Animation loop
		const animate = () => {
			const rect = canvas.getBoundingClientRect();
			ctx.clearRect(0, 0, rect.width, rect.height);

			const sc = shapeScale.current;
			const cx = shapeCenter.current.x;
			const cy = shapeCenter.current.y;
			const dissolveThreshold = 0.15;
			const isDissolving = sc < dissolveThreshold;

			const mx = mouse.current.x;
			const my = mouse.current.y;
			const isDown = mouse.current.down;
			const mouseVx = mouse.current.x - mouse.current.prevX;
			const mouseVy = mouse.current.y - mouse.current.prevY;

			for (const p of particles.current) {
				// Target position based on current center and scale
				const tx = cx + p.hx * sc;
				const ty = cy + p.hy * sc;

				// Mouse interaction: push particles away when cursor is near and moving
				const dx = p.x - mx;
				const dy = p.y - my;
				const distSq = dx * dx + dy * dy;
				const interactRadius = isDown && !isDraggingShape.current ? 120 : 60;

				if (distSq < interactRadius * interactRadius && distSq > 0) {
					const dist = Math.sqrt(distSq);
					const force = (1 - dist / interactRadius) * (isDown ? 8 : 2);
					p.vx += (dx / dist) * force + mouseVx * 0.3;
					p.vy += (dy / dist) * force + mouseVy * 0.3;
				}

				if (isDissolving) {
					// Dissolve: particles scatter randomly
					const dissolveForce = (dissolveThreshold - sc) / dissolveThreshold;
					p.vx += (Math.random() - 0.5) * dissolveForce * 4;
					p.vy += (Math.random() - 0.5) * dissolveForce * 4;
					p.alpha = Math.max(0, p.alpha - 0.005);
				} else {
					// Spring back toward home position
					const springForce = 0.04;
					p.vx += (tx - p.x) * springForce;
					p.vy += (ty - p.y) * springForce;
					// Restore alpha
					p.alpha += (0.6 + Math.random() * 0.4 - p.alpha) * 0.02;
				}

				// Damping
				p.vx *= 0.88;
				p.vy *= 0.88;

				p.x += p.vx;
				p.y += p.vy;

				// Draw particle
				const pSize = p.size * Math.max(0.3, sc);
				if (p.alpha > 0.01) {
					ctx.globalAlpha = p.alpha;
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(p.x - pSize / 2, p.y - pSize / 2, pSize, pSize);
				}
			}

			ctx.globalAlpha = 1;

			// If dissolved and scale goes back up, restore alpha
			if (!isDissolving) {
				for (const p of particles.current) {
					if (p.alpha < 0.3) p.alpha += 0.01;
				}
			}

			frameId.current = requestAnimationFrame(animate);
		};

		frameId.current = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(frameId.current);
			window.removeEventListener('resize', resize);
			canvas.removeEventListener('mousedown', onMouseDown);
			canvas.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			canvas.removeEventListener('wheel', onWheel);
			canvas.removeEventListener('touchstart', onTouchStart);
			canvas.removeEventListener('touchmove', onTouchMove);
			canvas.removeEventListener('touchend', onTouchEnd);
		};
	}, [sampleParticles]);

	return (
		<footer className="relative w-full" style={{ height: '80vh', minHeight: 500 }}>
			<canvas
				ref={canvasRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
				style={{ display: 'block' }}
			/>
			<p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/15 pointer-events-none select-none">
				drag &middot; scroll to resize &middot; hover to disturb
			</p>
		</footer>
	);
}
