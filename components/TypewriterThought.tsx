'use client';

import { useEffect, useState, useRef } from 'react';

export default function TypewriterThought() {
	const [text, setText] = useState('');
	const [displayed, setDisplayed] = useState('');
	const [done, setDone] = useState(false);
	const indexRef = useRef(0);

	// Fetch a random thought from Are.na channel
	useEffect(() => {
		fetch('/api/thoughts?t=' + Date.now())
			.then((r) => r.json())
			.then((data) => {
				if (data.text) setText(data.text);
			})
			.catch(() => {
				setText('every photograph is an act of remembering');
			});
	}, []);

	// Typewriter effect -- type out one character at a time, then stop
	useEffect(() => {
		if (!text) return;
		indexRef.current = 0;
		setDisplayed('');
		setDone(false);

		const interval = setInterval(() => {
			indexRef.current++;
			if (indexRef.current >= text.length) {
				setDisplayed(text);
				setDone(true);
				clearInterval(interval);
			} else {
				setDisplayed(text.slice(0, indexRef.current));
			}
		}, 55);

		return () => clearInterval(interval);
	}, [text]);

	return (
		<p className="font-mono text-[10px] md:text-[11px] tracking-[0.15em] text-muted/70 mt-6 max-w-md text-center lowercase">
			{displayed}
			{!done && (
				<span className="inline-block w-[1px] h-[0.9em] bg-muted/50 ml-0.5 animate-pulse" />
			)}
		</p>
	);
}
