"use client"

import { ChevronDown, Zap, Clock, Timer } from "lucide-react"
import { BatteryGauge } from "./battery-gauge"
import { BatteryStats } from "./battery-stats"
import type { BikeData } from "@/lib/bike-data"

interface HeroSectionProps {
  data: BikeData
  isStale: boolean
  lastUpdate: Date | null
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Hace unos segundos"
  if (diffMins === 1) return "Hace 1 minuto"
  if (diffMins < 60) return `Hace ${diffMins} minutos`
  if (diffHours === 1) return "Hace 1 hora"
  if (diffHours < 24) return `Hace ${diffHours} horas`
  if (diffDays === 1) return "Hace 1 día"
  return `Hace ${diffDays} días`
}

function calculateChargingTime(data: BikeData): string | null {
  // Solo calcular si está cargando y tenemos los datos necesarios
  if (!data.charging || data.consumedAh === undefined || data.remainingAh === undefined) {
    return null
  }

  // Si ya está casi completa (>99.5%), mostrar que falta poco
  if (data.percent >= 99.5) {
    return "Casi completa"
  }

  const CHARGER_CURRENT = 1.0 // 1A
  const totalCapacityAh = data.remainingAh + data.consumedAh
  const ahToFull = totalCapacityAh - data.remainingAh
  
  // Tiempo en horas
  const hoursToFull = ahToFull / CHARGER_CURRENT
  
  // Convertir a horas y minutos
  const hours = Math.floor(hoursToFull)
  const minutes = Math.round((hoursToFull - hours) * 60)
  
  if (hours === 0 && minutes < 5) {
    return "Unos minutos"
  } else if (hours === 0) {
    return `~${minutes} min`
  } else if (hours === 1 && minutes === 0) {
    return "~1 hora"
  } else if (hours === 1) {
    return `~1h ${minutes}min`
  } else if (minutes === 0) {
    return `~${hours} horas`
  } else {
    return `~${hours}h ${minutes}min`
  }
}

export function HeroSection({ data, isStale, lastUpdate }: HeroSectionProps) {
  const estimatedTime = calculateChargingTime(data)
  
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-16">
      {/* Radial gradient behind content for readability */}
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, hsl(220 25% 6% / 0.75) 0%, hsl(220 25% 6% / 0.35) 55%, transparent 100%)",
        }}
      />
      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col items-center">
        <div className="mb-2 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {data.device}
          </span>
        </div>
        <h1 className="text-balance text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Estado de Batería
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Telemetría en tiempo real
        </p>
      </div>

      {/* Battery Gauge */}
      <div className="relative z-10 mb-10 animate-float">
        <BatteryGauge
          percentage={data.percent}
          charging={data.charging}
          name={data.name || data.device}
        />
      </div>

      {/* Stats grid */}
      <div className="relative z-10 w-full max-w-2xl">
        <BatteryStats data={data} />
      </div>

      {/* Charging / Status badge */}
      <div className="liquid-glass-pill relative z-10 mt-6 flex items-center gap-3 rounded-full px-5 py-2.5">
        <span
          className={`h-2 w-2 rounded-full ${data.charging ? "animate-pulse bg-green-400" : "bg-primary"}`}
          style={{
            boxShadow: data.charging
              ? "0 0 8px hsl(160, 80%, 48%)"
              : "0 0 8px hsl(199, 89%, 48%)",
          }}
        />
        <span className="font-mono text-xs tracking-wider text-muted-foreground">
          {data.charging ? "Cargando" : "En uso"}
        </span>
        {data.remainingAh !== undefined && data.consumedAh !== undefined && (
          <>
            <span className="h-3 w-px bg-border" />
            <span className="font-mono text-xs text-muted-foreground">
              {data.remainingAh.toFixed(2)} / {(data.remainingAh + data.consumedAh).toFixed(2)} Ah
            </span>
          </>
        )}
      </div>

      {/* Charging time estimate */}
      {estimatedTime && !isStale && (
        <div className="liquid-glass-pill relative z-10 mt-3 flex items-center gap-2 rounded-full border border-green-500/30 px-4 py-2">
          <Timer className="h-3 w-3 text-green-400" />
          <span className="font-mono text-xs tracking-wider text-green-400">
            {estimatedTime} hasta carga completa
          </span>
        </div>
      )}

      {/* Timestamp badge */}
      {lastUpdate && (
        <div className={`liquid-glass-pill relative z-10 mt-3 flex items-center gap-2 rounded-full px-4 py-2 ${isStale ? "border border-orange-500/30" : ""}`}>
          <Clock className={`h-3 w-3 ${isStale ? "text-orange-400" : "text-muted-foreground"}`} />
          <span className={`font-mono text-xs tracking-wider ${isStale ? "text-orange-400" : "text-muted-foreground"}`}>
            {formatRelativeTime(lastUpdate)}
            {isStale && " (sin conexión)"}
          </span>
        </div>
      )}

      {/* Scroll indicator */}
      <button
        onClick={() => {
          document.getElementById("project-info")?.scrollIntoView({ behavior: "smooth" })
        }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
        aria-label="Scroll para explorar el proyecto"
      >
        <span className="text-xs uppercase tracking-widest">Explorar</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </button>
    </section>
  )
}
