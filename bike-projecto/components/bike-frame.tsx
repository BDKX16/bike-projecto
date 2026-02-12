"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export function BikeFrame() {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      // Progress from 0 to 1 over the first screen of scroll
      const progress = Math.min(scrollY / (windowHeight * 0.8), 1)
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Start zoomed in (scale ~3.5) showing only the frame triangle
  // End at scale 1 showing the full bike
  const scale = 3.5 - scrollProgress * 2.5
  // Start centered on the frame triangle, shift up as we zoom out
  // The frame center is roughly at 55% from the top and 45% from the left
  const translateY = scrollProgress * -35
  const opacity = 0.12 + scrollProgress * 0.25

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: `scale(${scale}) translateY(${translateY}%)`,
          transition: "transform 0.05s linear",
          willChange: "transform",
        }}
      >
        <Image
          src="/images/bike-frame-silhouette.jpg"
          alt=""
          fill
          className="object-contain"
          style={{
            opacity,
            transition: "opacity 0.1s linear",
            filter: `brightness(0.6) sepia(1) saturate(3) hue-rotate(170deg) drop-shadow(0 0 30px hsl(199 89% 48% / 0.15))`,
          }}
          priority
          sizes="100vw"
        />
      </div>
    </div>
  )
}
