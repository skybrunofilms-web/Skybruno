'use client';

import { motion } from 'framer-motion';
import type { GalleryTheme } from './GalleryOverlay';

interface ProjectGridProps {
	themes: GalleryTheme[];
	onSelectTheme: (theme: GalleryTheme) => void;
}

export default function ProjectGrid({ themes, onSelectTheme }: ProjectGridProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
			{themes.map((theme, i) => (
				<motion.button
					key={theme.id}
					onClick={() => onSelectTheme(theme)}
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: '-60px' }}
					transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 0.1, 0, 1] }}
					className="group relative overflow-hidden cursor-pointer text-left aspect-[4/3] md:aspect-[3/2]"
				>
					{/* Image */}
					<div className="absolute inset-0 overflow-hidden">
						<img
							src={theme.coverImage}
							alt={theme.title}
							className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-70 group-hover:opacity-90"
							loading="lazy"
						/>
					</div>

					{/* Dark gradient overlay */}
					<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-opacity duration-500" />

					{/* Content overlay */}
					<div className="absolute inset-0 flex flex-col justify-end p-5 md:p-7">
						{/* Index number */}
						<span className="font-mono text-[10px] text-white/30 tracking-[0.2em] mb-2 transition-colors duration-300 group-hover:text-white/50">
							{String(i + 1).padStart(2, '0')}
						</span>

						{/* Title */}
						<h3 className="font-sans text-2xl md:text-3xl lg:text-4xl text-white/80 tracking-wide font-light transition-all duration-500 group-hover:text-white">
							{theme.title}
						</h3>

						{/* Description */}
						{theme.description && (
							<p className="font-mono text-[10px] md:text-[11px] uppercase text-white/0 tracking-[0.1em] mt-2 transition-all duration-500 translate-y-2 group-hover:text-white/50 group-hover:translate-y-0">
								{theme.description}
							</p>
						)}

						{/* View indicator */}
						<div className="flex items-center gap-2 mt-3 transition-all duration-500 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
							<div className="w-6 h-px bg-white/50" />
							<span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
								View project
							</span>
						</div>
					</div>

					{/* Subtle border on hover */}
					<div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors duration-500 pointer-events-none" />
				</motion.button>
			))}
		</div>
	);
}
