'use client';

import { useEffect, useRef, useCallback } from 'react';

/*
 * Dense block-character horse on black background -- white characters.
 * Inspired by the Enigmatriz reference: high-density ASCII rendering
 * that approaches photographic detail. Rearing/galloping pose with
 * fire particles rising from the mane.
 *
 * The horse is defined as a 2D density map (brightness per cell).
 * Each cell gets a block character chosen by its brightness value.
 * Characters shimmer and shift subtly over time for living texture.
 */

// Block characters ordered by visual density (darkest to brightest)
const DENSITY = ' .\'`,:;-~=+*!?/\\|(){}[]<>#%&@$WMBH8';
const FIRE_CHARS = '@#%W$&MBH8*+=~^';
const EMBER_CHARS = '.,:;\'`~-';

// Horse defined as a grid of brightness values (0 = empty, 1-9 = density)
// Rearing horse -- anatomical detail, flowing mane, powerful legs
// Each row is a string of digits, spaces = empty
const HORSE_MAP = [
	'                                              11              ',
	'                                             232    1         ',
	'                                            35531  21         ',
	'                                           356742 321         ',
	'                                          4688854332          ',
	'                                        1578997644            ',
	'                                 11    368999875              ',
	'                                232   4799998741              ',
	'                               3553  57899986                 ',
	'                              46764 5899997                   ',
	'                    1    1   578886689998741                   ',
	'                   232  22  6899978999986                     ',
	'                  24542 33 58999879999741                     ',
	'                  357643347999969999863                       ',
	'                  4688754689998799975                         ',
	'                  578986579998699864                          ',
	'                  6899975899976898531                         ',
	'                  79999869997579963211                        ',
	'                  89999979996489853211                        ',
	'                  99999989995399742111                        ',
	'                  99999999994399742111                        ',
	'                  99999999993388632111                        ',
	'                  999999999834876321                          ',
	'                  899999998745864211                          ',
	'                  799999997656853                             ',
	'                  689999986567742                             ',
	'                  578999875478631                             ',
	'                  467899764389521                             ',
	'                  356789653179421                             ',
	'                  24567854  68311                             ',
	'                  13456743  573                               ',
	'                   2345632  462                               ',
	'                    234521  351                               ',
	'                    12341   24                                ',
	'                     1231   13                                ',
	'                      12     2                                ',
	'                      11     1                                ',
	'                       1                                      ',
];

// Second frame -- slight leg shift for gallop
const HORSE_MAP_2 = [
	'                                              11              ',
	'                                             232    1         ',
	'                                            35531  21         ',
	'                                           356742 321         ',
	'                                          4688854332          ',
	'                                        1578997644            ',
	'                                 11    368999875              ',
	'                                232   4799998741              ',
	'                               3553  57899986                 ',
	'                              46764 5899997                   ',
	'                    1    1   578886689998741                   ',
	'                   232  22  6899978999986                     ',
	'                  24542 33 58999879999741                     ',
	'                  357643347999969999863                       ',
	'                  4688754689998799975                         ',
	'                  578986579998699864                          ',
	'                  6899975899976898531                         ',
	'                  79999869997579963211                        ',
	'                  89999979996489853211                        ',
	'                  99999989995399742111                        ',
	'                  99999999994399742111                        ',
	'                  99999999993388632111                        ',
	'                  999999999834876321                          ',
	'                  899999998745864211                          ',
	'                  799999997656853                             ',
	'                  689999986567742                             ',
	'                  578999875478631                             ',
	'                  467899764389521                             ',
	'                   35678965 279421                            ',
	'                    4567854 168311                            ',
	'                    3456743  573                              ',
	'                     34563   462                              ',
	'                      3452   351                              ',
	'                      2341   24                               ',
	'                       123    13                              ',
	'                        12     2                              ',
	'                         1     1                              ',
	'                                                              ',
];

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	intensity: number;
}

export default function AsciiFireHorse() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number>(0);
	const particlesRef = useRef<Particle[]>([]);
	const timeRef = useRef(0);

	const spawnFireParticle = useCallback((x: number, y: number): Particle => ({
		x: x + (Math.random() - 0.5) * 20,
		y: y + (Math.random() - 0.8) * 10,
		vx: (Math.random() - 0.5) * 40 + 5,
		vy: -Math.random() * 80 - 30,
		life: 1,
		maxLife: 0.5 + Math.random() * 1.5,
		intensity: 0.6 + Math.random() * 0.4,
	}), []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let cancelled = false;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			canvas.width = window.innerWidth * dpr;
			canvas.height = window.innerHeight * dpr;
			canvas.style.width = `${window.innerWidth}px`;
			canvas.style.height = `${window.innerHeight}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();

		let lastTime = performance.now();

		const animate = (now: number) => {
			if (cancelled) return;
			const dt = Math.min((now - lastTime) / 1000, 0.05);
			lastTime = now;
			timeRef.current += dt;
			const t = timeRef.current;

			const W = window.innerWidth;
			const H = window.innerHeight;

			ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
			ctx.fillStyle = '#000000';
			ctx.fillRect(0, 0, W, H);

			// Responsive font sizing
			const baseFontSize = Math.max(7, Math.min(16, W * 0.0095));
			const charW = baseFontSize * 0.6;
			const charH = baseFontSize * 1.05;

			ctx.font = `${baseFontSize}px "JetBrains Mono", "Courier New", monospace`;
			ctx.textBaseline = 'top';

			// Alternate between horse frames for gallop
			const frame = Math.floor(t * 3) % 2 === 0 ? HORSE_MAP : HORSE_MAP_2;
			const mapRows = frame.length;
			const mapCols = frame[0].length;

			// Center the horse on screen
			const horseW = mapCols * charW;
			const horseH = mapRows * charH;
			const offsetX = (W - horseW) / 2;
			const offsetY = (H - horseH) / 2 - H * 0.02;

			// Draw horse -- dense white characters on black
			for (let row = 0; row < mapRows; row++) {
				const line = frame[row];
				for (let col = 0; col < line.length; col++) {
					const ch = line[col];
					if (ch === ' ' || ch === '0') continue;

					const density = parseInt(ch);
					if (isNaN(density) || density <= 0) continue;

					const x = offsetX + col * charW;
					const y = offsetY + row * charH;

					// Heat distortion -- subtle shimmer
					const distX = Math.sin(t * 2.5 + row * 0.4 + col * 0.3) * 0.6;
					const distY = Math.cos(t * 2.0 + col * 0.5 + row * 0.2) * 0.4;

					// Map density to character
					const normDensity = density / 9;
					// Shimmer: character shifts over time
					const charOffset = Math.floor(Math.sin(t * 1.5 + row * 0.7 + col * 0.5) * 2);
					const charIndex = Math.floor(normDensity * (DENSITY.length - 1)) + charOffset;
					const safeIndex = Math.max(5, Math.min(DENSITY.length - 1, charIndex));
					const displayChar = DENSITY[safeIndex];

					// Alpha based on density + subtle breathing
					const breathe = Math.sin(t * 1.8 + row * 0.15 + col * 0.1) * 0.08;
					const alpha = Math.min(1, normDensity * 0.85 + 0.15 + breathe);

					ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
					ctx.fillText(displayChar, x + distX, y + distY);
				}
			}

			// Spawn fire particles from the horse mane area (upper-right quadrant of the horse)
			const maneX = offsetX + mapCols * charW * 0.7;
			const maneY = offsetY + mapRows * charH * 0.08;
			for (let i = 0; i < 2; i++) {
				if (Math.random() < 0.7) {
					particlesRef.current.push(spawnFireParticle(maneX, maneY));
				}
			}

			// Spawn from the horse back area too
			if (Math.random() < 0.4) {
				const backX = offsetX + mapCols * charW * 0.5;
				const backY = offsetY + mapRows * charH * 0.15;
				particlesRef.current.push(spawnFireParticle(backX, backY));
			}

			// Hooves dust
			if (Math.random() < 0.3) {
				const hoofX = offsetX + mapCols * charW * (0.3 + Math.random() * 0.2);
				const hoofY = offsetY + mapRows * charH * 0.95;
				particlesRef.current.push({
					x: hoofX,
					y: hoofY,
					vx: (Math.random() - 0.5) * 30,
					vy: Math.random() * 20 + 5,
					life: 1,
					maxLife: 0.3 + Math.random() * 0.5,
					intensity: 0.3 + Math.random() * 0.2,
				});
			}

			// Update and draw particles
			const alive: Particle[] = [];
			for (const p of particlesRef.current) {
				p.life -= dt / p.maxLife;
				if (p.life <= 0) continue;

				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.vy -= 60 * dt; // gravity inverted -- fire rises
				p.vx += 8 * dt; // slight wind

				// Choose character based on life remaining
				let ch: string;
				if (p.life > 0.6) {
					ch = FIRE_CHARS[Math.floor(Math.random() * 6)];
				} else if (p.life > 0.3) {
					ch = FIRE_CHARS[6 + Math.floor(Math.random() * 5)];
				} else {
					ch = EMBER_CHARS[Math.floor(Math.random() * EMBER_CHARS.length)];
				}

				const alpha = p.life * p.intensity;
				ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha).toFixed(3)})`;
				ctx.fillText(ch, p.x, p.y);

				alive.push(p);
			}
			particlesRef.current = alive;

			// Background star field -- very sparse scattered characters
			const starCount = 60;
			for (let i = 0; i < starCount; i++) {
				const seed = i * 7919;
				const sx = ((seed * 13 + 4967) % 10000) / 10000 * W;
				const sy = ((seed * 17 + 7727) % 10000) / 10000 * H;
				const twinkle = Math.sin(t * 0.8 + i * 2.3) * 0.5 + 0.5;
				const starAlpha = 0.03 + twinkle * 0.06;
				const starChar = EMBER_CHARS[i % EMBER_CHARS.length];
				ctx.fillStyle = `rgba(255,255,255,${starAlpha.toFixed(3)})`;
				ctx.fillText(starChar, sx, sy);
			}

			rafRef.current = requestAnimationFrame(animate);
		};

		rafRef.current = requestAnimationFrame(animate);
		window.addEventListener('resize', resize);

		return () => {
			cancelled = true;
			cancelAnimationFrame(rafRef.current);
			window.removeEventListener('resize', resize);
		};
	}, [spawnFireParticle]);

	return (
		<canvas
			ref={canvasRef}
			className="fixed inset-0 w-full h-full"
			style={{ zIndex: 0 }}
			aria-label="ASCII art animation of a fire horse in motion"
			role="img"
		/>
	);
}
