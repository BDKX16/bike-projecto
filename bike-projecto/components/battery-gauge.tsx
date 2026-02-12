"use client"

import { useEffect, useRef, useState } from "react"

interface BatteryGaugeProps {
  percentage: number
  charging: boolean
  name: string
}

export function BatteryGauge({ percentage, charging, name }: BatteryGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const [mounted, setMounted] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    setMounted(true)
    const delay = setTimeout(() => {
      setAnimatedPercentage(percentage)
      const duration = 2000
      const start = performance.now()
      const animate = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(Math.round(eased * percentage * 10) / 10)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }, 500)
    return () => {
      clearTimeout(delay)
      cancelAnimationFrame(rafRef.current)
    }
  }, [percentage])

  const circumference = 2 * Math.PI * 90
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference

  const getColor = () => {
    // Batería cargando
    if (charging) {
      if (percentage >= 99.5) return "hsl(120, 70%, 50%)" // Verde cuando está completa
      return "hsl(160, 80%, 48%)" // Azul-verde cuando está cargando
    }
    
    // Batería en uso
    if (percentage >= 60) return "hsl(199, 89%, 48%)" // Azul - Buena
    if (percentage >= 40) return "hsl(45, 90%, 55%)" // Amarillo - Media
    if (percentage >= 15) return "hsl(25, 90%, 55%)" // Naranja - Baja
    return "hsl(0, 80%, 55%)" // Rojo - Crítica
  }

  const getLabel = () => {
    if (charging && percentage >= 99.5) return "Completa"
    if (charging) return "Cargando"
    if (percentage >= 80) return "Excelente"
    if (percentage >= 60) return "Buena"
    if (percentage >= 40) return "Media"
    if (percentage >= 15) return "Baja"
    return "¡Crítica!"
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-56 w-56 md:h-72 md:w-72" style={{ overflow: "visible" }}>
        <svg
          className="-rotate-90 h-full w-full"
          viewBox="0 0 200 200"
          overflow="visible"
          aria-label={`Nivel de bateria: ${percentage}%`}
        >
          {/* Track */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="hsl(215, 25%, 18%)"
            strokeWidth="8"
          />
          {/* Tick marks */}
          {Array.from({ length: 40 }).map((_, i) => {
            const angle = (i / 40) * 360
            const rad = (angle * Math.PI) / 180
            const innerR = 78
            const outerR = 83
            const cos = Math.round(Math.cos(rad) * 1e6) / 1e6
            const sin = Math.round(Math.sin(rad) * 1e6) / 1e6
            return (
              <line
                key={i}
                x1={100 + innerR * cos}
                y1={100 + innerR * sin}
                x2={100 + outerR * cos}
                y2={100 + outerR * sin}
                stroke="hsl(215, 25%, 22%)"
                strokeWidth={i % 10 === 0 ? "2" : "0.5"}
                opacity={0.5}
              />
            )
          })}
          {/* Progress arc */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={getColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? strokeDashoffset : circumference}
            className="transition-all duration-[2000ms] ease-out"
            style={{
              filter: `drop-shadow(0 0 12px ${getColor()})`,
            }}
          />
          {/* Glow layer */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={getColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? strokeDashoffset : circumference}
            className="transition-all duration-[2000ms] ease-out"
            style={{
              filter: `drop-shadow(0 0 24px ${getColor()})`,
              opacity: 0.4,
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            {displayValue.toFixed(1)}
            <span className="text-2xl text-muted-foreground md:text-3xl">%</span>
          </span>
          <span
            className="mt-1 text-sm font-medium uppercase tracking-widest"
            style={{ color: getColor() }}
          >
            {getLabel()}
          </span>
        </div>
      </div>
      {/* Battery name label */}
      <div className="liquid-glass-pill mt-4 flex items-center gap-2 rounded-full px-4 py-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: getColor(),
            boxShadow: `0 0 8px ${getColor()}`,
          }}
        />
        <span className="font-mono text-xs tracking-wider text-muted-foreground">
          {name}
        </span>
      </div>
    </div>
  )
}
