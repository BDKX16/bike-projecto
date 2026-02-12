"use client"

import { Battery, Loader2, WifiOff } from "lucide-react"

export function EmptyBatteryState() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-16">
      {/* Radial gradient behind content */}
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, hsl(220 25% 6% / 0.75) 0%, hsl(220 25% 6% / 0.35) 55%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 rounded-full bg-muted/30 p-8">
          <Battery className="h-16 w-16 text-muted-foreground/50" />
        </div>

        {/* Header */}
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Esperando Primera Conexión
        </h2>
        <p className="mb-8 max-w-md text-muted-foreground">
          No se han recibido datos de la batería todavía. El ESP32 enviará la primera lectura automáticamente.
        </p>

        {/* Info cards */}
        <div className="liquid-glass-card w-full max-w-lg space-y-3 rounded-2xl p-6">
          <div className="flex items-start gap-3 text-left">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Conecta el ESP32</h3>
              <p className="text-sm text-muted-foreground">
                Asegúrate de que el ESP32 esté encendido y conectado a la red
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Espera la primera lectura</h3>
              <p className="text-sm text-muted-foreground">
                El sistema envía datos cada 10 minutos automáticamente
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Los datos aparecerán aquí</h3>
              <p className="text-sm text-muted-foreground">
                La página se actualiza automáticamente cada 60 segundos
              </p>
            </div>
          </div>
        </div>

        {/* API endpoint info */}
        <div className="liquid-glass-pill mt-6 flex items-center gap-2 rounded-full px-4 py-2">
          <WifiOff className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs text-muted-foreground">
            Endpoint: {process.env.NEXT_PUBLIC_API_URL || 'https://bike.xaviergalarreta.pro'}/api/battery
          </span>
        </div>
      </div>
    </section>
  )
}

export function LoadingBatteryState() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-16">
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, hsl(220 25% 6% / 0.75) 0%, hsl(220 25% 6% / 0.35) 55%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-medium text-foreground">Conectando con el sistema...</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cargando datos de la batería</p>
      </div>
    </section>
  )
}

export function ErrorBatteryState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-16">
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, hsl(220 25% 6% / 0.75) 0%, hsl(220 25% 6% / 0.35) 55%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-6 rounded-full bg-destructive/10 p-8">
          <WifiOff className="h-16 w-16 text-destructive" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-foreground">Error de Conexión</h2>
        <p className="mb-6 max-w-md text-muted-foreground">
          No se pudo conectar con el servidor. Verifica que el backend esté corriendo.
        </p>

        <div className="liquid-glass-pill mb-4 rounded-lg px-4 py-2">
          <code className="font-mono text-xs text-destructive">{error}</code>
        </div>

        <button
          onClick={onRetry}
          className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Reintentar
        </button>
      </div>
    </section>
  )
}
