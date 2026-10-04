'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function SplashScreen() {
  const [dismissed, setDismissed] = useState(false)
  const [complete, setComplete] = useState(false)

  if (complete) return null

  return (
    <motion.div
      aria-label="Enter gallery"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20"
      initial={{ opacity: 1 }}
      animate={{ opacity: dismissed ? 0 : 1 }}
      transition={{ duration: 0.48, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => {
        if (dismissed) setComplete(true)
      }}
      style={{ backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }}
    >
      <motion.button
        type="button"
        aria-label="Enter the gallery"
        className="relative cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black"
        initial={{ x: 0, scale: 1, rotate: 0 }}
        animate={dismissed ? { x: '125vw', scale: 1.35, rotate: 7 } : { x: 0, scale: 1, rotate: 0 }}
        transition={{ duration: 0.52, ease: [0.82, 0, 1, 0.42] }}
        onClick={() => setDismissed(true)}
      >
        <Image
          src="/logo.png"
          alt="Enter the gallery"
          width={380}
          height={380}
          priority
          className="size-[min(42vw,380px)] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
        />
      </motion.button>
    </motion.div>
  )
}
