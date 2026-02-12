"use client"

import { useEffect, useState } from "react"

export function ScrollDarkener() {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      // Start darkening later, after the bike frame starts zooming out
      const start = windowHeight * 0.3
      const end = windowHeight * 0.8
      const progress = Math.max(0, Math.min((scrollY - start) / (end - start), 1))
      setOpacity(progress * 0.65)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 bg-background transition-opacity duration-100"
      style={{ opacity }}
      aria-hidden="true"
    />
  )
}
