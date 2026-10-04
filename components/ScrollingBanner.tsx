'use client';

import { useMemo, useState, useEffect } from 'react';

const socials = [
	{ label: '@sky.bruno', href: 'https://instagram.com/sky.bruno', external: true },
	{ label: 'skybrunofilms@gmail.com', href: '/note', external: false },
	{ label: 'are.na/cinema-ciel', href: 'https://www.are.na/cinema-ciel', external: true },
];

const poeticPhrases = [
	'to exist is to resist',
	'the archive is a living thing',
	'memory is not passive',
	'every photograph is an act of remembering',
	'time moves in circles not lines',
	'the poor see the rich but the rich do not see the poor',
	'if light is information darkness is not empty',
	'god knows all futures and ends',
	"there's oceans on the mountains",
	'what the eye sees is not what the heart knows',
	'the island remembers what the sea forgets',
	'we were not born to be spectators',
	'the lens is an extension of breath',
	'all borders are imaginary',
	'the darkroom is where light confesses',
	'home is a verb not a noun',
	'the negative holds more truth than the print',
	'we carry our ancestors in our faces',
	'stillness is a kind of motion',
	'the camera does not lie but it chooses what to reveal',
	'every exile carries a map that no longer exists',
	'the horizon is a promise not a boundary',
	'water has memory and so do we',
	'you cannot photograph what you refuse to see',
	'the wound is where the light enters',
	'what is unseen is not unsaid',
	'to frame is to exclude',
	'language breaks where the image begins',
];

const manifestoPhrases = [
	'an artist must make new worlds',
	'doubt is the beginning of all art',
	'we reject the comfort of repetition',
	'the future is handmade',
	'art is the last form of resistance',
	'I have nothing to say and I am saying it',
	'there is no such thing as empty space',
	'the revolution will be intimate',
	'destroy the museums and libraries',
	'everything is sculpture',
	'imagination is the only weapon in the war against reality',
	'art must be dangerous',
	'the body is the first instrument',
	'we are all immigrants in time',
	'do not look at the finger pointing at the moon',
	'make something for no reason',
	'the manifesto is dead long live the manifesto',
	'silence is a form of violence',
	'every surface is a canvas',
	'architecture should wear well',
	'the personal is political',
	'beauty will save the world if we let it',
	'form follows feeling',
	'the museum is a graveyard unless you bring it to life',
	'we do not make art we are made by it',
	'the street is the only gallery that matters',
	'all representation is misrepresentation',
	'the artist is present and the artist is absent',
	'time is the ultimate medium',
	'there are no masterpieces only processes',
	'the edge of the frame is where the story begins',
	'to create is to destroy something else',
	'the viewer completes the work',
	'nothing is original everything is a remix',
	'art should be as surprising as a slap',
	'the most radical act is tenderness',
	'chaos is a form of order we do not yet understand',
	'an image is a bridge between two silences',
	'the white cube is a lie',
	'we are the archive',
	'refuse the binary',
	'a photograph is a secret about a secret',
	'to look is an act of choice',
	'every collection is a self-portrait',
	'the margin is the center',
	'what cannot be said can be shown',
	'the unfinished work is the only honest one',
	'all art is collaboration with the dead',
	'the body remembers what the mind forgets',
	'slowness is a radical act',
];

function shuffleAndPick(arr: string[], count: number, seed: number): string[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.abs((seed * (i + 1) * 9301 + 49297) % 233280) % (i + 1);
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy.slice(0, count);
}

function BannerTrack({ segments, direction = 'left', socialOffset = 0 }: { segments: string[]; direction?: 'left' | 'right'; socialOffset?: number }) {
	const content = useMemo(() => {
		const pieces: (string | { label: string; href: string; external: boolean })[] = [];
		let socialIdx = socialOffset;
		segments.forEach((seg, i) => {
			pieces.push(seg);
			if ((i + 1) % 2 === 0) {
				pieces.push(socials[socialIdx % socials.length]);
				socialIdx++;
			}
		});
		return pieces;
	}, [segments, socialOffset]);

	const renderContent = (key: string) => (
		<span key={key} className="inline-flex items-center whitespace-nowrap">
			{content.map((piece, i) => {
				if (typeof piece === 'string') {
					return (
						<span key={`${key}-t-${i}`} style={{ color: 'rgba(0,0,0,0.55)' }}>
							{' '}{piece}{' '}
							<span className="asterisk-glow mx-2" style={{ color: 'rgba(0,0,0,0.4)' }}>{'*'}</span>
						</span>
					);
				}
				return (
					<a
						key={`${key}-l-${i}`}
						href={piece.href}
						target={piece.external ? '_blank' : undefined}
						rel={piece.external ? 'noopener noreferrer' : undefined}
						className="opacity-40 hover:opacity-90 transition-opacity pointer-events-auto cursor-interactive"
					>
						{piece.label}
						<span className="asterisk-glow mx-2" style={{ color: 'rgba(0,0,0,0.4)' }}>{'*'}</span>
					</a>
				);
			})}
		</span>
	);

	const animClass = direction === 'left' ? 'animate-scroll-banner' : 'animate-scroll-banner-reverse';

	return (
		<div className="w-full overflow-hidden select-none">
			<div className={`flex whitespace-nowrap ${animClass}`}>
				{renderContent('a')}
				{renderContent('b')}
			</div>
		</div>
	);
}

interface ScrollingBannerProps {
	position: 'top' | 'bottom';
	hidden?: boolean;
}

export default function ScrollingBanner({ position, hidden = false }: ScrollingBannerProps) {
	const [seed, setSeed] = useState(position === 'top' ? 42 : 137);
	useEffect(() => {
		setSeed(Date.now() + (position === 'top' ? 0 : 7919));
	}, [position]);

	const segments = useMemo(() => {
		const allPhrases = [...poeticPhrases, ...manifestoPhrases];
		const count = 10;
		return shuffleAndPick(allPhrases, count, seed);
	}, [seed]);

	if (segments.length === 0) return null;

	return (
		<div
			className="font-mono text-[10px] md:text-xs tracking-[0.15em] uppercase transition-opacity duration-500"
			style={{
				opacity: hidden ? 0 : 1,
				pointerEvents: hidden ? 'none' : undefined,
				color: 'rgba(0,0,0,0.55)',
			}}
		>
			<BannerTrack
				segments={segments}
				direction={position === 'top' ? 'left' : 'right'}
				socialOffset={position === 'top' ? 0 : 1}
			/>
		</div>
	);
}
