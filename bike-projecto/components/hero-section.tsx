"use client"

import { ChevronDown, Zap } from "lucide-react"
import { BatteryGauge } from "./battery-gauge"
import { BatteryStats } from "./battery-stats"
import { BatteryAlert } from "./battery-alert"
import type { BikeData } from "@/lib/bike-data"

interface HeroSectionProps {
  data: BikeData
}

export function HeroSection({ data }: HeroSectionProps) {
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

      {/* Alert - Solo si hay alguna alerta que mostrar */}
      <div className="relative z-10 mb-6 w-full max-w-2xl">
        <BatteryAlert data={data} />
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
