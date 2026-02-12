"use client"

import { AlertTriangle, Battery, BatteryWarning, CheckCircle2, Unplug, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { BikeData } from "@/lib/bike-data"

interface BatteryAlertProps {
  data: BikeData
}

export function BatteryAlert({ data }: BatteryAlertProps) {
  const { percent, charging, voltage } = data

  // Batería al 100% y cargando - Debe desconectar
  if (percent >= 99.5 && charging) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <Unplug className="h-5 w-5 text-green-500" />
        <AlertTitle className="text-green-500">¡Carga Completa!</AlertTitle>
        <AlertDescription className="text-green-300/80">
          La batería está al 100%. Desconecta el cargador para prolongar la vida útil.
        </AlertDescription>
      </Alert>
    )
  }

  // Batería crítica (menos de 15% o voltaje muy bajo)
  if ((percent < 15 || voltage < 32) && !charging) {
    return (
      <Alert className="border-red-500/50 bg-red-500/10">
        <XCircle className="h-5 w-5 text-red-500" />
        <AlertTitle className="text-red-500">¡CRÍTICO! Batería Extremadamente Baja</AlertTitle>
        <AlertDescription className="text-red-300/80">
          {voltage < 32 ? (
            <>Voltaje: {voltage.toFixed(2)}V - Riesgo de daño permanente. <strong>Carga INMEDIATAMENTE</strong>.</>
          ) : (
            <>Solo queda {percent.toFixed(1)}% de carga. <strong>Carga INMEDIATAMENTE</strong> para evitar daño.</>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Batería baja (15-25%)
  if (percent < 25 && !charging) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/10">
        <BatteryWarning className="h-5 w-5 text-orange-500" />
        <AlertTitle className="text-orange-500">Batería Baja</AlertTitle>
        <AlertDescription className="text-orange-300/80">
          Queda {percent.toFixed(1)}% de carga. Considera cargar pronto para evitar descargas profundas.
        </AlertDescription>
      </Alert>
    )
  }

  // Batería media-baja (25-40%)
  if (percent < 40 && !charging) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        <AlertTitle className="text-yellow-500">Planifica una Recarga</AlertTitle>
        <AlertDescription className="text-yellow-300/80">
          La batería está al {percent.toFixed(1)}%. Las baterías de litio duran más si evitas descargas profundas.
        </AlertDescription>
      </Alert>
    )
  }

  // Sobrevoltaje - Solo alertar si es peligroso
  // Durante carga normal el cargador entrega 42V, esto es correcto
  // Solo alertar si: voltage > 42.5V O (voltage > 42V y NO está cargando)
  if (voltage > 42.5 || (voltage > 42 && !charging)) {
    return (
      <Alert className="border-red-500/50 bg-red-500/10">
        <XCircle className="h-5 w-5 text-red-500" />
        <AlertTitle className="text-red-500">¡PELIGRO! Sobrevoltaje Detectado</AlertTitle>
        <AlertDescription className="text-red-300/80">
          Voltaje: {voltage.toFixed(2)}V excede el límite seguro. <strong>DESCONECTA el cargador INMEDIATAMENTE</strong>.
        </AlertDescription>
      </Alert>
    )
  }

  // Cargando normalmente
  if (charging && percent < 99) {
    return (
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Battery className="h-5 w-5 text-blue-500 animate-pulse" />
        <AlertTitle className="text-blue-500">Cargando</AlertTitle>
        <AlertDescription className="text-blue-300/80">
          Nivel actual: {percent.toFixed(1)}%. Voltaje: {voltage.toFixed(2)}V
        </AlertDescription>
      </Alert>
    )
  }

  // Estado óptimo
  if (percent >= 60 && !charging) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <AlertTitle className="text-green-500">Estado Óptimo</AlertTitle>
        <AlertDescription className="text-green-300/80">
          La batería está en excelente estado con {percent.toFixed(1)}% de carga.
        </AlertDescription>
      </Alert>
    )
  }

  // Sin alerta necesaria
  return null
}
