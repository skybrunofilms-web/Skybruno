'use client';

import type React from 'react';
import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GalleryTheme } from './GalleryOverlay';

// ─── Pixelation shader ──────────────────────────────────────────────────────
const pixelVertexShader = `
	varying vec2 vUv;
	uniform float time;
	uniform float scrollForce;
	uniform float isHovered;
	void main() {
		vUv = uv;
		vec3 pos = position;
		float curveIntensity = scrollForce * 0.06;
		float distFromCenter = length(pos.xy);
		pos.z -= distFromCenter * distFromCenter * curveIntensity;
		if (isHovered > 0.5) {
			pos.z -= sin(pos.x * 1.5 + time * 2.0) * 0.01;
		}
		gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
	}
`;

const pixelFragmentShader = `
	varying vec2 vUv;
	uniform sampler2D uTexture;
	uniform float pixelation;
	uniform float opacity;
	void main() {
		vec2 uv = vUv;
		if (pixelation > 0.01) {
			float cellSize = mix(0.002, 0.08, pixelation);
			uv = floor(uv / cellSize + 0.5) * cellSize;
		}
		vec4 color = texture2D(uTexture, uv);
		gl_FragColor = vec4(color.rgb, color.a * opacity);
	}
`;

// ─── Helpers ────────────────────────────────────────────────────────────────
function isVideoUrl(url: string): boolean {
	return /\.(mov|mp4|webm|ogg)$/i.test(url);
}

// ─── Texture loader (images + videos) ───────────────────────────────────────
function useMediaTextures(urls: string[]): (THREE.Texture | null)[] {
	const key = urls.join(',');
	const [textures, setTextures] = useState<(THREE.Texture | null)[]>(() =>
		urls.map(() => null)
	);
	const videosRef = useRef<HTMLVideoElement[]>([]);

	useEffect(() => {
		const loader = new THREE.TextureLoader();
		let cancelled = false;
		const videos: HTMLVideoElement[] = [];

		urls.forEach((url, i) => {
			if (isVideoUrl(url)) {
				const video = document.createElement('video');
				video.src = url;
				video.crossOrigin = 'anonymous';
				video.loop = true;
				video.muted = true;
				video.playsInline = true;
				video.autoplay = true;
				video.style.display = 'none';
				document.body.appendChild(video);
				videos.push(video);

				video.addEventListener('loadeddata', () => {
					if (!cancelled) {
						// Apply B&W via canvas for the 3D texture
						const canvas = document.createElement('canvas');
						canvas.width = video.videoWidth || 640;
						canvas.height = video.videoHeight || 360;
						const ctx = canvas.getContext('2d')!;
						ctx.filter = 'grayscale(1)';
						ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

						const texture = new THREE.VideoTexture(video);
						texture.colorSpace = THREE.SRGBColorSpace;
						texture.minFilter = THREE.LinearFilter;
						texture.magFilter = THREE.LinearFilter;
						setTextures((prev) => { const n = [...prev]; n[i] = texture; return n; });
						video.play().catch(() => {});
					}
				}, { once: true });

				// Loop only first 5 seconds
				video.addEventListener('timeupdate', () => {
					if (video.currentTime > 5) video.currentTime = 0;
				});
			} else {
				loader.load(url, (texture) => {
					if (!cancelled) {
						texture.colorSpace = THREE.SRGBColorSpace;
						setTextures((prev) => { const n = [...prev]; n[i] = texture; return n; });
					}
				}, undefined, () => {});
			}
		});

		videosRef.current = videos;
		return () => {
			cancelled = true;
			videos.forEach((v) => {
				v.pause();
				v.src = '';
				v.remove();
			});
		};
	}, [key]);

	return textures;
}

// ─── Cluster layout ─────────────────────────────────────────────────────────
interface ClusterData {
	theme: GalleryTheme;
	baseZ: number;
	center: THREE.Vector3;
	imageOffsets: {
		pos: THREE.Vector3;
		rot: THREE.Euler;
		baseWidth: number;
		baseHeight: number;
		driftSpeed: number;
		driftDir: number;
	}[];
}

function generateClusters(themes: GalleryTheme[]): ClusterData[] {
	const zSpacing = 22;
		const spreadX = 12;
		const spreadY = 6;
	const seeded = (i: number, off: number) =>
		Math.sin(i * 127.1 + off * 311.7) * 0.5 + 0.5;

	return themes.map((theme, i) => {
		const angle = (i / themes.length) * Math.PI * 2;
		const z = -(i * zSpacing + 10);
		const x = Math.sin(angle) * spreadX * (0.5 + seeded(i, 0) * 0.7);
		const y = Math.cos(angle) * spreadY * (0.3 + seeded(i, 1) * 0.5) - 0.3;

		const imageCount = theme.images.length;
		const imageOffsets = theme.images.map((_, j) => {
			const jAngle = (j / imageCount) * Math.PI * 2 + seeded(i, j + 10) * 0.5;
				const radius = 4.5 + seeded(i, j + 20) * 4.0;
				const w = 2.8 + seeded(i, j + 70) * 1.2;
				const h = 2.0 + seeded(i, j + 80) * 1.0;
			return {
				pos: new THREE.Vector3(
						Math.cos(jAngle) * radius,
						Math.sin(jAngle) * radius * 0.65,
						(seeded(i, j + 30) - 0.5) * 2.5
					),
				rot: new THREE.Euler(
					(seeded(i, j + 40) - 0.5) * 0.08,
					(seeded(i, j + 50) - 0.5) * 0.1,
					(seeded(i, j + 60) - 0.5) * 0.04
				),
				baseWidth: w,
				baseHeight: h,
				driftSpeed: 0.08 + seeded(i, j + 90) * 0.12,
				driftDir: seeded(i, j + 100) > 0.5 ? 1 : -1,
			};
		});

		return { theme, baseZ: z, center: new THREE.Vector3(x, y, z), imageOffsets };
	});
}

// ─── Single image plane ─────────────────────────────────────────────────────
function ClusterImage({
	texture,
	position,
	rotation,
	baseWidth,
	baseHeight,
	driftSpeed,
	driftDir,
	onClick,
	onHoverChange,
}: {
	texture: THREE.Texture | null;
	position: THREE.Vector3;
	rotation: THREE.Euler;
	baseWidth: number;
	baseHeight: number;
	driftSpeed: number;
	driftDir: number;
	onClick: () => void;
	onHoverChange: (hovered: boolean) => void;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const matRef = useRef<THREE.ShaderMaterial>(null);
	const [hovered, setHovered] = useState(false);

	const actualScale = useMemo(() => {
		if (!texture || !texture.image) return new THREE.Vector3(baseWidth, baseHeight, 1);
		const image = texture.image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
		const imgW = image.width || image.naturalWidth || 1;
		const imgH = image.height || image.naturalHeight || 1;
		const aspect = imgW / imgH;
		if (aspect > 1) {
			return new THREE.Vector3(baseWidth, baseWidth / aspect, 1);
		} else {
			return new THREE.Vector3(baseHeight * aspect, baseHeight, 1);
		}
	}, [texture, baseWidth, baseHeight]);

	const targetScale = useRef(actualScale.clone());

	const uniforms = useMemo(
		() => ({
			uTexture: { value: texture },
			pixelation: { value: 0.0 },
			opacity: { value: 1.0 },
			time: { value: 0.0 },
			scrollForce: { value: 0.0 },
			isHovered: { value: 0.0 },
		}),
		[texture]
	);

	useEffect(() => {
		if (matRef.current && texture) matRef.current.uniforms.uTexture.value = texture;
	}, [texture]);

	useEffect(() => {
		targetScale.current = actualScale.clone();
	}, [actualScale]);

	useFrame(({ camera, clock }) => {
		if (!meshRef.current || !matRef.current) return;

		const t = clock.getElapsedTime();
		meshRef.current.position.x = position.x + Math.sin(t * driftSpeed) * 0.3 * driftDir;
		meshRef.current.position.y = position.y + Math.cos(t * driftSpeed * 0.7 + driftDir) * 0.15;

		const worldPos = new THREE.Vector3();
		meshRef.current.getWorldPosition(worldPos);
		const dist = camera.position.distanceTo(worldPos);

		const clearZone = 0.2;
		const maxRange = 40;
		const normalizedDist = dist / maxRange;
		const px = Math.pow(Math.max(0, (normalizedDist - clearZone) / (1 - clearZone)), 1.3);
		matRef.current.uniforms.pixelation.value = Math.min(1, px);

		const nearFade = THREE.MathUtils.smoothstep(dist, 0.5, 3);
		const farFade = 1 - THREE.MathUtils.smoothstep(dist, 30, 50);
		matRef.current.uniforms.opacity.value = nearFade * farFade * (hovered ? 1.0 : 0.85);
		matRef.current.uniforms.time.value = t;
		matRef.current.uniforms.isHovered.value = hovered ? 1.0 : 0.0;

		const s = hovered ? 1.08 : 1.0;
		targetScale.current.set(actualScale.x * s, actualScale.y * s, 1);
		meshRef.current.scale.lerp(targetScale.current, 0.1);
	});

	if (!texture) return null;

	return (
		<mesh
			ref={meshRef}
			position={[position.x, position.y, position.z]}
			rotation={[rotation.x, rotation.y, rotation.z]}
			onClick={(e) => { e.stopPropagation(); onClick(); }}
			onPointerEnter={(e) => {
				e.stopPropagation();
				setHovered(true);
				onHoverChange(true);
			}}
			onPointerLeave={() => {
				setHovered(false);
				onHoverChange(false);
			}}
		>
			<planeGeometry args={[1, 1, 12, 12]} />
			<shaderMaterial
				ref={matRef}
				vertexShader={pixelVertexShader}
				fragmentShader={pixelFragmentShader}
				uniforms={uniforms}
				transparent
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}

// ─── Dotted connecting lines (imperative THREE.Line with computeLineDistances) ─
function ConnectingLines({
	cluster,
	visible,
	lineColor,
}: {
	cluster: ClusterData;
	visible: boolean;
	lineColor: string;
}) {
	const groupRef = useRef<THREE.Group>(null);
	const linesRef = useRef<THREE.Line[]>([]);
	const opacityRef = useRef(0);

	useEffect(() => {
		if (!groupRef.current) return;
		// Clear previous
		linesRef.current.forEach(l => {
			l.geometry.dispose();
			(l.material as THREE.Material).dispose();
			groupRef.current?.remove(l);
		});
		linesRef.current = [];

		const offsets = cluster.imageOffsets;
		const color = new THREE.Color(lineColor);

		// Build a chain connecting each image to the next, plus loop-back
		const pairs: [number, number][] = [];
		for (let i = 0; i < offsets.length - 1; i++) pairs.push([i, i + 1]);
		if (offsets.length > 2) pairs.push([offsets.length - 1, 0]);
		// Add cross-connections for more density
		for (let i = 0; i < offsets.length; i++) {
			for (let j = i + 2; j < offsets.length; j++) {
				pairs.push([i, j]);
			}
		}

		pairs.forEach(([a, b]) => {
			const points = [offsets[a].pos.clone(), offsets[b].pos.clone()];
			const geo = new THREE.BufferGeometry().setFromPoints(points);
			const mat = new THREE.LineDashedMaterial({
				color,
				dashSize: 0.15,
				gapSize: 0.12,
				transparent: true,
				opacity: 0,
				depthWrite: false,
			});
			const line = new THREE.Line(geo, mat);
			line.computeLineDistances(); // CRITICAL for dashed lines to render
			groupRef.current!.add(line);
			linesRef.current.push(line);
		});
	}, [cluster, lineColor]);

	useFrame(() => {
		const target = visible ? 0.7 : 0;
		opacityRef.current += (target - opacityRef.current) * 0.05;
		linesRef.current.forEach((line) => {
			(line.material as THREE.LineDashedMaterial).opacity = opacityRef.current;
		});
	});

	return <group ref={groupRef} position={cluster.center} />;
}

// ─── Theme atmosphere config ────────────────────────────────────────────────
const ATMOSPHERE: Record<string, { color: string; count: number; speed: number; dir: [number, number, number]; lineColor: string }> = {
	bloodline: { color: '#ff9944', count: 40, speed: 0.15, dir: [0, -0.3, 0], lineColor: '#ff3333' },
	trees:     { color: '#88aa66', count: 35, speed: 0.08, dir: [0.1, -0.5, 0], lineColor: '#55aa44' },
	trash:     { color: '#333333', count: 50, speed: 0.4, dir: [0, 0, 0], lineColor: '#555555' },
	food:      { color: '#ffcc77', count: 30, speed: 0.12, dir: [0, 0.3, 0], lineColor: '#ffaa44' },
	ny:        { color: '#445566', count: 45, speed: 0.6, dir: [1.5, 0, 0], lineColor: '#336688' },
};

function AtmosphereParticles({ themeId, radius = 6 }: { themeId: string; radius?: number }) {
	const ref = useRef<THREE.Points>(null);
	const config = ATMOSPHERE[themeId] || ATMOSPHERE.bloodline;

	const { positions, velocities } = useMemo(() => {
		const pos = new Float32Array(config.count * 3);
		const vel = new Float32Array(config.count * 3);
		for (let i = 0; i < config.count; i++) {
			pos[i * 3] = (Math.random() - 0.5) * radius * 2;
			pos[i * 3 + 1] = (Math.random() - 0.5) * radius;
			pos[i * 3 + 2] = (Math.random() - 0.5) * radius;
			vel[i * 3] = config.dir[0] + (Math.random() - 0.5) * 0.1;
			vel[i * 3 + 1] = config.dir[1] + (Math.random() - 0.5) * 0.1;
			vel[i * 3 + 2] = config.dir[2] + (Math.random() - 0.5) * 0.05;
		}
		return { positions: pos, velocities: vel };
	}, [config, radius]);

	useFrame((_, delta) => {
		if (!ref.current) return;
		const pos = ref.current.geometry.attributes.position;
		const arr = pos.array as Float32Array;
		for (let i = 0; i < config.count; i++) {
			arr[i * 3] += velocities[i * 3] * delta * config.speed;
			arr[i * 3 + 1] += velocities[i * 3 + 1] * delta * config.speed;
			arr[i * 3 + 2] += velocities[i * 3 + 2] * delta * config.speed;
			// Wrap around
			if (Math.abs(arr[i * 3]) > radius) arr[i * 3] *= -0.9;
			if (Math.abs(arr[i * 3 + 1]) > radius * 0.5) arr[i * 3 + 1] *= -0.9;
			if (Math.abs(arr[i * 3 + 2]) > radius * 0.5) arr[i * 3 + 2] *= -0.9;
		}
		pos.needsUpdate = true;
	});

	return (
		<points ref={ref}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[positions, 3]} />
			</bufferGeometry>
			<pointsMaterial
				color={config.color}
				size={themeId === 'trash' ? 0.015 : 0.03}
				transparent
				opacity={themeId === 'trash' ? 0.06 : 0.04}
				sizeAttenuation
			/>
		</points>
	);
}

// ─── Cluster group ──────────────────────────────────────────────────────────
function ImageCluster({
	cluster,
	textures,
	textureIndexMap,
	onSelect,
	isFocused,
	lineColor,
	onHoverChange,
}: {
	cluster: ClusterData;
	textures: (THREE.Texture | null)[];
	textureIndexMap: Map<string, number>;
	onSelect: () => void;
	isFocused: boolean;
	lineColor: string;
	onHoverChange: (hovered: boolean) => void;
}) {
	const themeLineColor = ATMOSPHERE[cluster.theme.id]?.lineColor || lineColor;

	return (
		<group position={cluster.center}>
			<AtmosphereParticles themeId={cluster.theme.id} />
			{cluster.theme.images.map((img, j) => {
				const offset = cluster.imageOffsets[j];
				const texIdx = textureIndexMap.get(img.src);
				const texture = texIdx !== undefined ? textures[texIdx] : null;
				return (
					<ClusterImage
						key={`${cluster.theme.id}-${j}`}
						texture={texture}
						position={offset.pos}
						rotation={offset.rot}
						baseWidth={offset.baseWidth}
						baseHeight={offset.baseHeight}
						driftSpeed={offset.driftSpeed}
						driftDir={offset.driftDir}
						onClick={onSelect}
						onHoverChange={onHoverChange}
					/>
				);
			})}
			<ConnectingLines cluster={cluster} visible={isFocused} lineColor={themeLineColor} />
		</group>
	);
}

// ─── Ambient particles ──────────────────────────────────────────────────────
function SpaceParticles({ count = 600, range = 100 }: { count?: number; range?: number }) {
	const ref = useRef<THREE.Points>(null);
	const positions = useMemo(() => {
		const arr = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			arr[i * 3] = (Math.random() - 0.5) * range;
			arr[i * 3 + 1] = (Math.random() - 0.5) * range * 0.5;
			arr[i * 3 + 2] = -Math.random() * range * 2;
		}
		return arr;
	}, [count, range]);

	useFrame(({ clock }) => {
		if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.001;
	});

	return (
		<points ref={ref}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[positions, 3]} />
			</bufferGeometry>
			<pointsMaterial color="#000000" size={0.02} transparent opacity={0.08} sizeAttenuation />
		</points>
	);
}

// ─── Camera controller ──────────────────────────────────────────────────────
function CameraController({
	totalDepth,
	totalWidth,
	onDepthChange,
	onAnyHover,
	flyTarget,
	onFlyComplete,
}: {
	totalDepth: number;
	totalWidth: number;
	onDepthChange?: (z: number) => void;
	onAnyHover: boolean;
	flyTarget?: THREE.Vector3 | null;
	onFlyComplete?: () => void;
}) {
	const flyingRef = useRef(false);
	const flyCompleteRef = useRef(onFlyComplete);
	flyCompleteRef.current = onFlyComplete;
	const { camera, gl } = useThree();
	const isDragging = useRef(false);
	const prevMouse = useRef({ x: 0, y: 0 });
	const velocity = useRef({ x: 0, y: 0, z: 0 });
	const targetPos = useRef({ x: 0, y: 0, z: 0 });

	useEffect(() => {
		const canvas = gl.domElement;

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			// Vertical scroll = move through depth, horizontal = pan sideways (inverted to surround viewer)
			velocity.current.z -= e.deltaY * 0.008;
			velocity.current.x -= e.deltaX * 0.008;
		};

		const onPointerDown = (e: PointerEvent) => {
			isDragging.current = true;
			prevMouse.current = { x: e.clientX, y: e.clientY };
		};

		const onPointerMove = (e: PointerEvent) => {
			if (!isDragging.current) return;
			const dx = e.clientX - prevMouse.current.x;
			const dy = e.clientY - prevMouse.current.y;
			// Drag direction matches hand movement -- grab world and move it
			velocity.current.x = dx * 0.015;
			velocity.current.y = -dy * 0.01;
			prevMouse.current = { x: e.clientX, y: e.clientY };
		};

		const onPointerUp = () => { isDragging.current = false; };

		canvas.addEventListener('wheel', onWheel, { passive: false });
		canvas.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		return () => {
			canvas.removeEventListener('wheel', onWheel);
			canvas.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};
	}, [gl]);

	useFrame(() => {
		targetPos.current.x += velocity.current.x;
		targetPos.current.y += velocity.current.y;
		targetPos.current.z += velocity.current.z;

		const damp = isDragging.current ? 0.85 : 0.93;
		velocity.current.x *= damp;
		velocity.current.y *= damp;
		velocity.current.z *= damp;

		// Soft drift back on Y only
		if (!isDragging.current && Math.abs(velocity.current.y) < 0.003) {
			targetPos.current.y *= 0.998;
		}

		// Endless depth: wrap Z
		if (targetPos.current.z < -totalDepth) {
			targetPos.current.z += totalDepth;
			camera.position.z += totalDepth;
		} else if (targetPos.current.z > totalDepth) {
			targetPos.current.z -= totalDepth;
			camera.position.z -= totalDepth;
		}

		// Endless horizontal: wrap X
		const halfW = totalWidth / 2;
		if (targetPos.current.x < -halfW) {
			targetPos.current.x += totalWidth;
			camera.position.x += totalWidth;
		} else if (targetPos.current.x > halfW) {
			targetPos.current.x -= totalWidth;
			camera.position.x -= totalWidth;
		}

		// Fly-to animation
		if (flyTarget && !flyingRef.current) {
			flyingRef.current = true;
			// Override target to fly toward the cluster
			targetPos.current.x = flyTarget.x;
			targetPos.current.y = flyTarget.y;
			targetPos.current.z = flyTarget.z + 8; // stop slightly in front
			velocity.current = { x: 0, y: 0, z: 0 };
		}
		if (!flyTarget && flyingRef.current) {
			flyingRef.current = false;
		}

		const lerpSpeed = flyingRef.current ? 0.04 : 0.07;
		camera.position.x += (targetPos.current.x - camera.position.x) * lerpSpeed;
		camera.position.y += (targetPos.current.y - camera.position.y) * lerpSpeed;
		camera.position.z += (targetPos.current.z - camera.position.z) * lerpSpeed;

		// Check if fly complete
		if (flyingRef.current && flyTarget) {
			const dx = camera.position.x - targetPos.current.x;
			const dy = camera.position.y - targetPos.current.y;
			const dz = camera.position.z - targetPos.current.z;
			if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.5) {
				flyCompleteRef.current?.();
			}
		}

		// Always look straight ahead from camera position
		camera.lookAt(
			camera.position.x,
			camera.position.y,
			camera.position.z - 12
		);

		if (onDepthChange) onDepthChange(camera.position.z);
	});

	// Programmatic cursor override
	const asteriskCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Cline x1='9' y1='1' x2='9' y2='17' stroke='%23111' stroke-width='1'/%3E%3Cline x1='1' y1='9' x2='17' y2='9' stroke='%23111' stroke-width='1'/%3E%3Cline x1='3.3' y1='3.3' x2='14.7' y2='14.7' stroke='%23111' stroke-width='1'/%3E%3Cline x1='14.7' y1='3.3' x2='3.3' y2='14.7' stroke='%23111' stroke-width='1'/%3E%3C/svg%3E") 9 9, pointer`;

	useEffect(() => {
		const canvas = gl.domElement;
		canvas.style.cursor = onAnyHover ? asteriskCursor : '';
	}, [onAnyHover, gl, asteriskCursor]);

	return null;
}

// ─── Main scene ─────────────────────────────────────────────────────────────
function Scene({
	themes,
	onSelectTheme,
	focusedTheme,
	onDepthChange,
	lineColor,
	onAnyHoverChange,
	flyTarget,
	onFlyComplete,
}: {
	themes: GalleryTheme[];
	onSelectTheme: (theme: GalleryTheme) => void;
	focusedTheme?: GalleryTheme | null;
	onDepthChange?: (z: number) => void;
	lineColor: string;
	onAnyHoverChange: (h: boolean) => void;
	flyTarget?: THREE.Vector3 | null;
	onFlyComplete?: () => void;
}) {
	const baseClusters = useMemo(() => generateClusters(themes), [themes]);
	const [anyHover, setAnyHover] = useState(false);
	const hoverCount = useRef(0);

	const handleHover = useCallback((hovered: boolean) => {
		hoverCount.current += hovered ? 1 : -1;
		const isHovering = hoverCount.current > 0;
		setAnyHover(isHovering);
		onAnyHoverChange(isHovering);
	}, [onAnyHoverChange]);

	// Calculate total world extents
	const totalDepth = useMemo(() => {
		const minZ = Math.min(...baseClusters.map((c) => c.baseZ));
		return Math.abs(minZ) + 20;
	}, [baseClusters]);

	const totalWidth = useMemo(() => {
		const maxAbsX = Math.max(...baseClusters.map((c) => Math.abs(c.center.x)));
		return (maxAbsX + 8) * 2; // padding on each side
	}, [baseClusters]);

	// 5x3 grid of copies: 5 depth copies x 3 horizontal copies = endless in both directions
	const clusters = useMemo(() => {
		const copies: ClusterData[] = [];
		for (let zCopy = -2; zCopy <= 2; zCopy++) {
			for (let xCopy = -1; xCopy <= 1; xCopy++) {
				baseClusters.forEach((c) => {
					copies.push({
						...c,
						baseZ: c.baseZ + zCopy * totalDepth,
						center: new THREE.Vector3(
							c.center.x + xCopy * totalWidth,
							c.center.y,
							c.center.z + zCopy * totalDepth,
						),
					});
				});
			}
		}
		return copies;
	}, [baseClusters, totalDepth, totalWidth]);

	const allImageUrls = useMemo(() => {
		const set = new Set<string>();
		themes.forEach((t) => t.images.forEach((img) => set.add(img.src)));
		return Array.from(set);
	}, [themes]);

	const textures = useMediaTextures(allImageUrls);

	const textureIndexMap = useMemo(() => {
		const map = new Map<string, number>();
		allImageUrls.forEach((url, i) => map.set(url, i));
		return map;
	}, [allImageUrls]);

	return (
		<>
			<CameraController
				totalDepth={totalDepth}
				totalWidth={totalWidth}
				onDepthChange={onDepthChange}
				onAnyHover={anyHover}
				flyTarget={flyTarget}
				onFlyComplete={onFlyComplete}
			/>
			<ambientLight intensity={0.5} />
			<SpaceParticles />

			{clusters.map((cluster, i) => (
				<ImageCluster
					key={`${cluster.theme.id}-copy${i}`}
					cluster={cluster}
					textures={textures}
					textureIndexMap={textureIndexMap}
					onSelect={() => onSelectTheme(cluster.theme)}
					isFocused={focusedTheme?.id === cluster.theme.id}
					lineColor={lineColor}
					onHoverChange={handleHover}
				/>
			))}
		</>
	);
}

// ─── Exported component ─────────────────────────────────────────────────────
interface ConstellationSceneProps {
	themes: GalleryTheme[];
	onSelectTheme: (theme: GalleryTheme) => void;
	focusedTheme?: GalleryTheme | null;
	onDepthChange?: (z: number) => void;
	className?: string;
	lineColor: string;
	flyTarget?: THREE.Vector3 | null;
	onFlyComplete?: () => void;
}

export default function ConstellationScene({
	themes,
	onSelectTheme,
	focusedTheme,
	onDepthChange,
	className = '',
	lineColor,
	flyTarget,
	onFlyComplete,
}: ConstellationSceneProps) {
	const [isHovering, setIsHovering] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const canvas = containerRef.current.querySelector('canvas');
		if (canvas) {
			if (isHovering) {
				canvas.style.cursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Cline x1='9' y1='1' x2='9' y2='17' stroke='%23111' stroke-width='1'/%3E%3Cline x1='1' y1='9' x2='17' y2='9' stroke='%23111' stroke-width='1'/%3E%3Cline x1='3.3' y1='3.3' x2='14.7' y2='14.7' stroke='%23111' stroke-width='1'/%3E%3Cline x1='14.7' y1='3.3' x2='3.3' y2='14.7' stroke='%23111' stroke-width='1'/%3E%3C/svg%3E") 9 9, pointer`;
			} else {
				canvas.style.cursor = '';
			}
		}
	}, [isHovering]);

	return (
		<div ref={containerRef} className={`w-full h-full ${className}`}>
			<Canvas
				camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 200 }}
				gl={{ antialias: true, alpha: true }}
				style={{ background: 'transparent' }}
			>
				<Scene
					themes={themes}
					onSelectTheme={onSelectTheme}
					focusedTheme={focusedTheme}
					onDepthChange={onDepthChange}
					lineColor={lineColor}
					onAnyHoverChange={setIsHovering}
					flyTarget={flyTarget}
					onFlyComplete={onFlyComplete}
				/>
			</Canvas>
		</div>
	);
}
