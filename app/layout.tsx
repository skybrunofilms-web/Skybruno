import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono, Noto_Serif_SC } from 'next/font/google';
import '@fontsource/aileron/300.css';
import '@fontsource/aileron/400.css';
import '@fontsource/aileron/600.css';
import './globals.css';
import SpotifyRadio from '@/components/SpotifyRadio';


const spaceGrotesk = Space_Grotesk({
	variable: '--font-space',
	subsets: ['latin'],
	weight: ['300', '400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
	variable: '--font-jetbrains',
	subsets: ['latin'],
	weight: ['300', '400', '500'],
});

const notoSerifSC = Noto_Serif_SC({
	variable: '--font-noto-serif-sc',
	subsets: ['latin'],
	weight: ['400', '700', '900'],
});

export const metadata: Metadata = {
	title: 'INTHEMAKING - Sky Bruno',
	description: 'Film photography portfolio by Sky Bruno',
	generator: 'v0.app',
};

export const viewport: Viewport = {
	themeColor: '#ffffff',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${notoSerifSC.variable} antialiased`}>
				{children}
				<SpotifyRadio />
			</body>
		</html>
	);
}
