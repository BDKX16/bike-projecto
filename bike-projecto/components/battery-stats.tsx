"use client"

import { Activity, Battery, RefreshCw, Zap } from "lucide-react"
import type { BikeData } from "@/lib/bike-data"

interface BatteryStatsProps {
  data: BikeData
}

export function BatteryStats({ data }: BatteryStatsProps) {
  const stats = [
    {
      icon: Zap,
      label: "Voltaje",
      value: `${data.voltage.toFixed(2)}V`,
      sub: "10s Li-ion",
    },
    {
      icon: Activity,
      label: "Corriente",
      value: `${Math.abs(data.current).toFixed(2)}A`,
      sub: data.charging ? "Cargando" : data.current > 0 ? "Descargando" : "Stand-by",
    },
    ...(data.remainingAh !== undefined && data.consumedAh !== undefined ? [{
      icon: Battery,
      label: "Restante",
      value: `${data.remainingAh.toFixed(2)}Ah`,
      sub: `${data.consumedAh.toFixed(2)}Ah usados`,
    }] : [{
      icon: Battery,
      label: "Capacidad",
      value: data.charging ? "Cargando" : "N/A",
      sub: "En cálculo",
    }]),
    {
      icon: RefreshCw,
      label: "Ciclos",
      value: `${data.cycles}`,
      sub: data.maxCycles ? `de ${data.maxCycles} est.` : "registrados",
    },
  ]

  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3 md:max-w-none md:grid-cols-4 md:gap-4">
      {stats.map((stat, index) => (
        <div
          key={`${stat.label}-${index}`}
          className="liquid-glass group flex flex-col items-center rounded-2xl p-4 transition-all duration-300"
        >
          <stat.icon className="mb-2 h-5 w-5 text-primary transition-all duration-300 group-hover:scale-110" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </span>
          <span className="mt-1 font-mono text-lg font-bold text-foreground">
            {stat.value}
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</span>
        </div>
      ))}
    </div>
  )
}
