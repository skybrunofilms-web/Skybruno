'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';

/* ── Placeholder fits -- replace with your actual items ─────────────── */
const WARDROBE_ITEMS: {
	id: string;
	image: string;
	title: string;
	brand: string;
	category: string;
	buyUrl?: string;
	price?: string;
	description?: string;
}[] = [
	{
		id: '1',
		image: '/placeholder.svg?height=600&width=480',
		title: 'Oversized Linen Shirt',
		brand: 'COS',
		category: 'Tops',
		buyUrl: 'https://cos.com',
		price: '$89',
		description: 'Relaxed fit, breathable linen. Goes with everything.',
	},
	{
		id: '2',
		image: '/placeholder.svg?height=600&width=480',
		title: 'Wide Leg Trousers',
		brand: 'Lemaire',
		category: 'Bottoms',
		buyUrl: 'https://lemaire.fr',
		price: '$450',
		description: 'High waisted, cropped at ankle. Wool blend.',
	},
	{
		id: '3',
		image: '/placeholder.svg?height=600&width=480',
		title: 'Canvas Tote',
		brand: 'Aeta',
		category: 'Accessories',
		buyUrl: 'https://afrfrm.com',
		price: '$120',
	},
	{
		id: '4',
		image: '/placeholder.svg?height=600&width=480',
		title: 'Chunky Derby Shoes',
		brand: 'Our Legacy',
		category: 'Footwear',
		buyUrl: 'https://ourlegacy.com',
		price: '$380',
		description: 'Black leather. Vibram sole.',
	},
	{
		id: '5',
		image: '/placeholder.svg?height=600&width=480',
		title: 'Washed Denim Jacket',
		brand: 'Kapital',
		category: 'Outerwear',
		price: '$525',
		description: 'Sashiko stitching details. Vintage wash.',
	},
	{
		id: '6',
		image: '/placeholder.svg?height=600&width=480',
		title: 'Merino Wool Beanie',
		brand: 'Snow Peak',
		category: 'Accessories',
		buyUrl: 'https://snowpeak.com',
		price: '$45',
	},
];

const CATEGORIES = ['All', ...Array.from(new Set(WARDROBE_ITEMS.map((i) => i.category)))];

export default function WardrobePage() {
	const [activeCategory, setActiveCategory] = useState('All');
	const [selectedItem, setSelectedItem] = useState<(typeof WARDROBE_ITEMS)[0] | null>(null);

	const filtered =
		activeCategory === 'All'
			? WARDROBE_ITEMS
			: WARDROBE_ITEMS.filter((i) => i.category === activeCategory);

	return (
		<div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
			{/* Header */}
			<header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm">
				<div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
					<Link
						href="/"
						className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-black/40 hover:text-black/70 transition-colors cursor-interactive"
					>
						<ArrowLeft className="w-3 h-3" />
						Back
					</Link>
					<h1 className="font-sans text-sm tracking-[0.3em] uppercase text-black/80 font-light">
						Wardrobe
					</h1>
					<div className="w-12" />
				</div>

				{/* Category filter tabs */}
				<div className="flex gap-4 px-6 pb-3 max-w-6xl mx-auto overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
					{CATEGORIES.map((cat) => (
						<button
							key={cat}
							onClick={() => setActiveCategory(cat)}
							className={`font-mono text-[10px] uppercase tracking-widest whitespace-nowrap pb-1 transition-all cursor-interactive ${
								activeCategory === cat
									? 'text-black/90 border-b border-black/40'
									: 'text-black/30 hover:text-black/50'
							}`}
						>
							{cat}
						</button>
					))}
				</div>

				<div className="h-px bg-black/5" />
			</header>

			{/* IG-style 3-column grid */}
			<main className="max-w-6xl mx-auto px-1 py-1">
				<div className="grid grid-cols-3 gap-0.5">
					<AnimatePresence mode="popLayout">
						{filtered.map((item) => (
							<motion.button
								key={item.id}
								layout
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ duration: 0.25 }}
								onClick={() => setSelectedItem(item)}
								className="relative aspect-[4/5] overflow-hidden group cursor-interactive"
							>
								<img
									src={item.image}
									alt={item.title}
									className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
									crossOrigin="anonymous"
								/>
								{/* Hover overlay */}
								<div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end p-3 opacity-0 group-hover:opacity-100">
									<div className="text-left">
										<p className="font-mono text-[9px] uppercase text-white/90 tracking-wider">
											{item.brand}
										</p>
										<p className="font-sans text-xs text-white/70 mt-0.5">
											{item.title}
										</p>
										{item.price && (
											<p className="font-mono text-[10px] text-white/50 mt-1">
												{item.price}
											</p>
										)}
									</div>
								</div>
							</motion.button>
						))}
					</AnimatePresence>
				</div>

				{filtered.length === 0 && (
					<div className="flex flex-col items-center justify-center py-32">
						<p className="font-mono text-[11px] text-black/30 uppercase tracking-widest">
							No items in this category
						</p>
					</div>
				)}
			</main>

			{/* Item detail overlay */}
			<AnimatePresence>
				{selectedItem && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-6"
						style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
						onClick={() => setSelectedItem(null)}
					>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{ duration: 0.3 }}
							className="flex flex-col md:flex-row gap-8 max-w-4xl w-full max-h-[85vh]"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Image */}
							<div className="flex-1 min-w-0">
								<img
									src={selectedItem.image}
									alt={selectedItem.title}
									className="w-full h-auto max-h-[70vh] object-contain"
									crossOrigin="anonymous"
								/>
							</div>

							{/* Details */}
							<div className="flex flex-col justify-center gap-4 md:w-64 shrink-0">
								<div>
									<p className="font-mono text-[9px] uppercase text-black/30 tracking-[0.2em]">
										{selectedItem.category}
									</p>
									<h2 className="font-sans text-lg text-black/90 font-light mt-1">
										{selectedItem.title}
									</h2>
									<p className="font-mono text-[11px] uppercase text-black/50 tracking-wider mt-0.5">
										{selectedItem.brand}
									</p>
								</div>

								{selectedItem.description && (
									<p className="font-sans text-sm text-black/50 leading-relaxed">
										{selectedItem.description}
									</p>
								)}

								{selectedItem.price && (
									<p className="font-mono text-sm text-black/70">
										{selectedItem.price}
									</p>
								)}

								{selectedItem.buyUrl && (
									<a
										href={selectedItem.buyUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-black/50 hover:text-black/80 transition-colors cursor-interactive mt-2 pb-0.5 border-b border-black/10 hover:border-black/30 self-start"
									>
										Shop
										<ExternalLink className="w-3 h-3" />
									</a>
								)}
							</div>
						</motion.div>

						{/* Close */}
						<button
							onClick={() => setSelectedItem(null)}
							className="absolute top-6 right-6 cursor-interactive text-black/40 hover:text-black transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
