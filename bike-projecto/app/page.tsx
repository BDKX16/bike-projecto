import { HeroSection } from "@/components/hero-section"
import { ProjectSection } from "@/components/project-section"
import { ScrollDarkener } from "@/components/scroll-darkener"
import { BikeFrame } from "@/components/bike-frame"
import { MOCK_BIKE_DATA } from "@/lib/bike-data"

export default function Home() {
  return (
    <main className="relative">
      <BikeFrame />
      <ScrollDarkener />
      <div className="relative z-10">
        <HeroSection data={MOCK_BIKE_DATA} />
      </div>
      <div className="relative z-30">
        <ProjectSection />
      </div>
    </main>
  )
}
