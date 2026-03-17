"use client"

import { HeroSection } from "@/components/hero-section"
import { ProjectSection } from "@/components/project-section"
import { ScrollDarkener } from "@/components/scroll-darkener"
import { BikeFrame } from "@/components/bike-frame"
import { SettingsModal } from "@/components/settings-modal"
import { EmptyBatteryState, LoadingBatteryState, ErrorBatteryState } from "@/components/battery-states"
import { useBatteryData } from "@/hooks/use-battery-data"

export default function Home() {
  const { data, loading, error, refetch, isStale, lastUpdate } = useBatteryData(60000) // Refrescar cada 60 segundos

  return (
    <main className="relative">
      <BikeFrame />
      <ScrollDarkener />
      <SettingsModal />
      
      <div className="relative z-10">
        {loading ? (
          <LoadingBatteryState />
        ) : error ? (
          <ErrorBatteryState error={error} onRetry={refetch} />
        ) : !data ? (
          <EmptyBatteryState />
        ) : (
          <HeroSection data={data} isStale={isStale} lastUpdate={lastUpdate} />
        )}
      </div>
      
      <div className="relative z-30">
        <ProjectSection />
      </div>
    </main>
  )
}
