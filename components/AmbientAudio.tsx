'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* ── Pentatonic scale for hover tones ─────────────────────────────────────── */
const PENTATONIC = [220, 261.63, 293.66, 349.23, 392, 440, 523.25];

export default function AmbientAudio() {
	const [muted, setMuted] = useState(true);
	const ctxRef = useRef<AudioContext | null>(null);
	const masterGain = useRef<GainNode | null>(null);
	const droneOsc1 = useRef<OscillatorNode | null>(null);
	const droneOsc2 = useRef<OscillatorNode | null>(null);
	const initialized = useRef(false);

	const init = useCallback(() => {
		if (initialized.current) return;
		initialized.current = true;

		const ctx = new AudioContext();
		ctxRef.current = ctx;

		const master = ctx.createGain();
		master.gain.value = 0;
		master.connect(ctx.destination);
		masterGain.current = master;

		// Drone: two detuned sine oscillators creating a slow beat frequency
		const osc1 = ctx.createOscillator();
		const osc2 = ctx.createOscillator();
		const droneGain = ctx.createGain();
		droneGain.gain.value = 0.015;
		droneGain.connect(master);

		osc1.type = 'sine';
		osc1.frequency.value = 80;
		osc2.type = 'sine';
		osc2.frequency.value = 82; // 2Hz beat frequency

		// Add subtle filtering
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 200;
		filter.Q.value = 1;

		osc1.connect(filter);
		osc2.connect(filter);
		filter.connect(droneGain);

		osc1.start();
		osc2.start();
		droneOsc1.current = osc1;
		droneOsc2.current = osc2;
	}, []);

	// Activate on first user interaction
	const activate = useCallback(() => {
		init();
		if (masterGain.current && ctxRef.current) {
			ctxRef.current.resume();
			setMuted(false);
			masterGain.current.gain.linearRampToValueAtTime(1, ctxRef.current.currentTime + 0.5);
		}
	}, [init]);

	const toggle = useCallback(() => {
		if (muted) {
			activate();
		} else {
			if (masterGain.current && ctxRef.current) {
				masterGain.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.3);
				setMuted(true);
			}
		}
	}, [muted, activate]);

	// Hover tone: play a short pentatonic ping
	const playHoverTone = useCallback((index?: number) => {
		if (!ctxRef.current || muted) return;
		const ctx = ctxRef.current;
		const freq = PENTATONIC[(index || Math.floor(Math.random() * PENTATONIC.length)) % PENTATONIC.length];

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		gain.gain.value = 0;
		gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

		osc.connect(gain);
		gain.connect(masterGain.current!);
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 0.7);
	}, [muted]);

	// Keystroke click for the note page
	const playKeystroke = useCallback(() => {
		if (!ctxRef.current || muted) return;
		const ctx = ctxRef.current;

		const bufferSize = ctx.sampleRate * 0.003; // 3ms
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
		}

		const source = ctx.createBufferSource();
		source.buffer = buffer;
		const gain = ctx.createGain();
		gain.gain.value = 0.02;
		source.connect(gain);
		gain.connect(masterGain.current!);
		source.start();
	}, [muted]);

	// Expose methods globally for other components to use
	useEffect(() => {
		(window as unknown as Record<string, unknown>).__ambientAudio = {
			playHoverTone,
			playKeystroke,
		};
		return () => {
			delete (window as unknown as Record<string, unknown>).__ambientAudio;
		};
	}, [playHoverTone, playKeystroke]);

	return (
		<button
			onClick={toggle}
			className="fixed bottom-6 right-6 z-[70] font-mono text-[9px] uppercase tracking-[0.2em] py-1.5 px-3 border transition-all cursor-interactive"
			style={{
				borderColor: muted ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
				color: muted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
				backgroundColor: 'rgba(0,0,0,0.5)',
				backdropFilter: 'blur(4px)',
			}}
			aria-label={muted ? 'Enable sound' : 'Mute sound'}
		>
			{muted ? 'Sound off' : 'Sound on'}
		</button>
	);
}
