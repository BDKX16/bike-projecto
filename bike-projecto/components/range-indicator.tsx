"use client"

import { Bike } from "lucide-react"
import type { BikeData } from "@/lib/bike-data"

interface RangeIndicatorProps {
  data: BikeData
}

export function RangeIndicator({ data }: RangeIndicatorProps) {
  // Solo mostrar si no está cargando y tenemos los datos necesarios
  if (data.charging || data.remainingAh === undefined) {
    return null
  }

  // Calcular autonomía estimada
  // Motor: 350W brushless sin engranajes
  // Consumo promedio estimado: 15 Wh/km (considera terreno mixto, peso del ciclista, etc.)
  // Rodado 26 (diámetro ~66cm, perímetro ~2.07m)
  const whAvailable = data.voltage * data.remainingAh
  const AVERAGE_CONSUMPTION_WH_KM = 15 // Wh por km
  const estimatedKm = whAvailable / AVERAGE_CONSUMPTION_WH_KM
  
  // Calcular autonomía máxima (con batería llena)
  const totalCapacity = data.remainingAh + (data.consumedAh || 0)
  const maxWh = data.voltage * totalCapacity
  const maxKm = maxWh / AVERAGE_CONSUMPTION_WH_KM
  
  // Calcular porcentaje para el slider
  const percentage = (estimatedKm / maxKm) * 100

  // Determinar color según el rango
  const getColor = () => {
    if (estimatedKm >= maxKm * 0.6) return "hsl(199, 89%, 48%)" // Azul
    if (estimatedKm >= maxKm * 0.4) return "hsl(199, 89%, 48%)" // Azul
    if (estimatedKm >= maxKm * 0.3) return "hsl(45, 90%, 55%)" // Amarillo
    if (estimatedKm >= maxKm * 0.15) return "hsl(25, 90%, 55%)" // Naranja
    return "hsl(0, 80%, 55%)" // Rojo
  }

  const color = getColor()

  return (
    <div className="liquid-glass relative z-10 mx-auto mt-6 w-full max-w-2xl rounded-2xl p-6 md:mt-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Autonomía estimada
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xl font-bold" style={{ color }}>
            {estimatedKm.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">km</span>
        </div>
      </div>

      {/* Barra de progreso con ícono de bicicleta */}
      <div className="relative h-12 w-full">
        {/* Track de fondo (zona no disponible) */}
        <div className="absolute inset-0 rounded-full bg-muted/20" />
        
        {/* Barra de progreso coloreada y rellena (zona disponible) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(5, Math.min(percentage, 100))}%`,
            backgroundColor: color,
            opacity: 0.85,
            boxShadow: `0 0 20px ${color}80`
          }}
        />

        {/* Ícono de bicicleta en el punto actual */}
        <div
          className="absolute inset-y-0 flex items-center transition-all duration-500"
          style={{
            left: `${Math.max(2, Math.min(percentage, 98))}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-lg"
            style={{
              boxShadow: `0 0 0 2px ${color}, 0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.3)`
            }}
          >
            <Bike className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>0 km</span>
        <span className="font-mono">
          Máx: {maxKm.toFixed(1)} km
        </span>
      </div>

     
    </div>
  )
}
