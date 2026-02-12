"use client"

import { HeroSection } from "@/components/hero-section"
import { ProjectSection } from "@/components/project-section"
import { ScrollDarkener } from "@/components/scroll-darkener"
import { BikeFrame } from "@/components/bike-frame"
import { EmptyBatteryState, LoadingBatteryState, ErrorBatteryState } from "@/components/battery-states"
import { useBatteryData } from "@/hooks/use-battery-data"

export default function Home() {
  const { data, loading, error, refetch } = useBatteryData(60000) // Refrescar cada 60 segundos

  return (
    <main className="relative">
      <BikeFrame />
      <ScrollDarkener />
      
      {loading ? (
        <LoadingBatteryState />
      ) : error ? (
        <ErrorBatteryState error={error} onRetry={refetch} />
      ) : !data ? (
        <EmptyBatteryState />
      ) : (
        <>
          <div className="relative z-10">
            <HeroSection data={data} />
          </div>
          <div className="relative z-30">
            <ProjectSection />
          </div>
        </>
      )}
    </main>
  )
}
