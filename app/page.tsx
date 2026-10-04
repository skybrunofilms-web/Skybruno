'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { AnimatePresence } from 'framer-motion';
import ShadowTitle from '@/components/ShadowTitle';
import ScrollingBanner from '@/components/ScrollingBanner';
import Menu from '@/components/Menu';
import type { GalleryTheme } from '@/components/GalleryOverlay';

const ConstellationScene = dynamic(() => import('@/components/ConstellationScene'), { ssr: false });
const GalleryOverlay = dynamic(() => import('@/components/GalleryOverlay'), { ssr: false });

export const galleryThemes: GalleryTheme[] = [
	{
		id: 'bloodline',
		title: 'Bloodline',
		description: 'All things Hawaii -- the land, the people, the spirit',
		coverImage: '/gallery/IMG_0259.jpeg',
		images: [
			{ src: '/sky-1.jpg', alt: 'Kapu sign in Hawaiian wilderness', caption: 'Kapu', meta: { location: 'Big Island, HI', date: '2024.06' } },
			{ src: '/sky-4.jpg', alt: 'Moss-covered tree in Hawaiian rainforest', caption: 'Old growth', meta: { location: 'Hilo, HI', date: '2024.06' } },
			{ src: '/gallery/IMG_0259.jpeg', alt: 'Pig grazing where asphalt meets volcanic rock', caption: 'Boundary', meta: { location: 'Puna, HI', date: '2024.07' } },
			{ src: '/gallery/IMG_0328.jpeg', alt: 'Volcanic rock formation in dark ocean water', caption: 'Pele\'s reach', meta: { location: 'Kalapana, HI', date: '2024.07' } },
			{ src: '/gallery/IMG_9681.jpeg', alt: 'Taro leaf draped over truck bed against stormy horizon', caption: 'Offering', meta: { location: 'Waipio, HI', date: '2024.05' } },
			{ src: '/gallery/IMG_0311.jpeg', alt: 'Dog at the shoreline with ocean and tropical trees', caption: 'Keeper', meta: { location: 'Hilo Bay, HI', date: '2024.06' } },
			{ src: '/gallery/IMG_0407.jpeg', alt: 'Ferns silhouetted against blazing sun through canopy', caption: 'Corona', meta: { location: 'Hamakua Coast, HI', date: '2024.08' } },
			{ src: '/gallery/IMG_0145.jpeg', alt: 'Moonlit tropical landscape with lone tree', caption: 'Vigil', meta: { location: 'Kohala, HI', date: '2024.04' } },
		],
	},
	{
		id: 'trees',
		title: 'Trees',
		description: 'Deep canopy, tangled light',
		coverImage: '/gallery/IMG_0407.jpeg',
		images: [
			{ src: '/gallery/IMG_0407.jpeg', alt: 'Ferns silhouetted against blazing sun through canopy', caption: 'Corona' },
			{ src: '/gallery/IMG_0145.jpeg', alt: 'Moonlit tropical landscape with lone tree', caption: 'Vigil' },
			{ src: '/gallery/DSCF1063.jpeg', alt: 'Dense undergrowth with fallen leaves and debris', caption: 'Floor' },
			{ src: '/sky-4.jpg', alt: 'Moss-covered tree in Hawaiian rainforest', caption: 'Canopy' },
		],
	},
	{
		id: 'trash',
		title: 'Trash',
		description: 'What we leave behind, what remains',
		coverImage: '/gallery/IMG_7970.jpeg',
		images: [
			{ src: '/gallery/IMG_7970.jpeg', alt: 'Dark crystalline fragments in harsh light', caption: 'Remnants' },
			{ src: '/gallery/DSCF1063.jpeg', alt: 'Dense undergrowth with fallen leaves and debris', caption: 'Floor' },
			{ src: '/gallery/IMG_9681.jpeg', alt: 'Taro leaf draped over truck bed against stormy horizon', caption: 'Offering' },
		],
	},
	{
		id: 'food',
		title: 'Food',
		description: 'Nourishment, ritual, gathering',
		coverImage: '/gallery/IMG_7970.jpeg',
		images: [
			{ src: '/gallery/IMG_7970.jpeg', alt: 'Dark crystalline fragments in harsh light', caption: 'Remnants' },
			{ src: '/gallery/IMG_0259.jpeg', alt: 'Pig grazing where asphalt meets volcanic rock', caption: 'Boundary' },
		],
	},
	{
		id: 'ny',
		title: 'NY',
		description: 'The city that never sleeps',
		coverImage: '/sky-3.jpg',
		images: [
			{ src: '/gallery/IMG_5928.mov', alt: 'SF street footage in monochrome', caption: 'Transit', type: 'video' },
			{ src: '/sky-3.jpg', alt: 'Street scene through window blinds', caption: 'Afternoon' },
			{ src: '/sky-2.jpg', alt: 'Tropical coastal landscape', caption: 'Windward' },
			{ src: '/gallery/IMG_0304.jpeg', alt: 'Self-portrait reflected in car window', caption: 'Mirror' },
			{ src: '/gallery/IMG_9625.jpeg', alt: 'Blurred figure raking in the dark yard', caption: 'Labor' },
		],
	},
];

const LINE_COLOR = '#cc2222';

// Cluster center calculation (must match ConstellationScene's generateClusters)
function getClusterCenter(themes: GalleryTheme[], themeId: string): THREE.Vector3 {
	const zSpacing = 22;
	const spreadX = 12;
	const spreadY = 6;
	const seeded = (i: number, off: number) =>
		Math.sin(i * 127.1 + off * 311.7) * 0.5 + 0.5;
	const idx = themes.findIndex((t) => t.id === themeId);
	if (idx < 0) return new THREE.Vector3();
	const angle = (idx / themes.length) * Math.PI * 2;
	const z = -(idx * zSpacing + 10);
	const x = Math.sin(angle) * spreadX * (0.5 + seeded(idx, 0) * 0.7);
	const y = Math.cos(angle) * spreadY * (0.3 + seeded(idx, 1) * 0.5) - 0.3;
	return new THREE.Vector3(x, y, z);
}

export default function Home() {
	const [activeTheme, setActiveTheme] = useState<GalleryTheme | null>(null);
	const [showGallery, setShowGallery] = useState(false);
	const [flyTarget, setFlyTarget] = useState<THREE.Vector3 | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [showTitle, setShowTitle] = useState(true);
	const titleDismissed = useRef(false);
	const lineColor = LINE_COLOR;

	const handleSelectTheme = useCallback((theme: GalleryTheme) => {
		justSelectedRef.current = true;
		setActiveTheme(theme);
		setShowTitle(false);
		titleDismissed.current = true;
		// Start flying toward the cluster
		const center = getClusterCenter(galleryThemes, theme.id);
		setFlyTarget(center);
		setShowGallery(false);
	}, []);

	const handleFlyComplete = useCallback(() => {
		// Camera arrived -- show the gallery overlay
		setShowGallery(true);
		setFlyTarget(null);
	}, []);

	const handleDepthChange = useCallback(() => {
		if (!titleDismissed.current && showTitle) {
			titleDismissed.current = true;
			setShowTitle(false);
		}
	}, [showTitle]);

	const justSelectedRef = useRef(false);
	const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
		// Only close if clicking the main bg directly, not children
		if (e.target !== e.currentTarget) return;
		if (justSelectedRef.current) { justSelectedRef.current = false; return; }
		if (activeTheme) {
			setActiveTheme(null);
			setShowGallery(false);
			setFlyTarget(null);
			titleDismissed.current = false;
			setShowTitle(true);
		}
	}, [activeTheme]);

	const focusedId = useMemo(() => {
		if (activeTheme) return activeTheme;
		return null;
	}, [activeTheme]);

	return (
		<main
			className="fixed inset-0 overflow-hidden"
			style={{ backgroundColor: '#ffffff', color: '#111111' }}
			onClick={handleBackgroundClick}
		>
			{/* 3D constellation scene */}
			<ConstellationScene
				themes={galleryThemes}
				onSelectTheme={handleSelectTheme}
				focusedTheme={focusedId}
				onDepthChange={handleDepthChange}
				lineColor={lineColor}
				className="absolute inset-0 z-0"
				flyTarget={flyTarget}
				onFlyComplete={handleFlyComplete}
			/>

			{/* Top scrolling banner */}
			<div className="fixed top-0 left-0 right-0 z-[60] py-1.5 pointer-events-none">
				<ScrollingBanner position="top" hidden={!!activeTheme} />
			</div>

			{/* Bottom scrolling banner */}
			<div className="fixed bottom-0 left-0 right-0 z-[60] py-1.5 pointer-events-none">
				<ScrollingBanner position="bottom" hidden={!!activeTheme} />
			</div>

			{/* Centered INTHE(MAKING) title */}
			<div
				className="fixed inset-0 z-[10] flex items-center justify-center pointer-events-none px-6 transition-opacity duration-700"
				style={{ opacity: showTitle ? 1 : 0 }}
			>
				<div className="w-full max-w-5xl pointer-events-auto cursor-interactive">
					<ShadowTitle />
				</div>
			</div>

			{/* Menu */}
			<div onClick={(e) => e.stopPropagation()}>
				<Menu
					themes={galleryThemes}
					onSelectTheme={handleSelectTheme}
					isOpen={menuOpen}
					onOpenChange={(v) => {
						setMenuOpen(v);
						if (!v && !activeTheme) {
							titleDismissed.current = false;
							setShowTitle(true);
						}
					}}
				/>
			</div>

			{/* Gallery overlay */}
			<AnimatePresence>
				{activeTheme && showGallery && (
					<div onClick={(e) => e.stopPropagation()}>
						<GalleryOverlay
							theme={activeTheme}
							onClose={() => {
								setActiveTheme(null);
								setShowGallery(false);
								setFlyTarget(null);
								titleDismissed.current = false;
								setShowTitle(true);
							}}
							lineColor={lineColor}
						/>
					</div>
				)}
			</AnimatePresence>
		</main>
	);
}
