"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

function FadeInSection({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.15 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  )
}

const buildSteps = [
  {
    number: "01",
    title: "Investigacion y planificacion",
    description:
      "Empece buscando entre los kits de conversion que habia en el mercado y todas resultaban exesivamente caras y motores poco eficientes, con engranajes de nylon la mayoria. Analice distintas configuraciones de baterias de litio, motores hub y controladores. La idea era armar un prototipo desarmando un Hoverboard y adaptando el motor. Prototipo el cual fallo en cada aspecto, pero permitio hacer el disño del chasis de todo el sistema electrico.",
    image: "/images/celdas.png",
    imageAlt: "Celdas 18650 dispuestas en configuracion 10s2p sobre el banco de trabajo",
    materials: ["Hoverboard", "Soldador", "Impresora 3d", "Controlador de motor"],
  },
  {
    number: "02",
    title: "Armado del battery pack",
    description:
      "Luego del prototipo, aprendi que el corazon del proyecto era el battery pack, asi que empeze a hacerlo en serio, y uno bueno. Compre celdas de altisima calidad y control para poder entregar muchisima potencia, 20A, y bastante autonomia, 20km aproximadamente. El paso mas critico: soldar las celdas con spot welder, cablear el BMS (Battery Management System) celda por celda, y testear que todo quede balanceado. Use un BMS de 10S 20A con balanceo activo. Imprimi separadores con la impresora 3D. Y compre un soldador de punto para asegurar conexiones seguras.",
    image: "/images/battery-pack.png",
    imageAlt: "Soldando cables al BMS del battery pack en el banco de trabajo",
    materials: ["BMS 10S 20A", "Cable silicona 12AWG", "Soldador de puntos", "Cinta kapton"],
  },
  {
    number: "03",
    title: "Conversion de la bicicleta",
    description:
      "Luego de haber instalado la bateria nueva, fue tan potente que quemó (literalmente se derritió) el motor de plastico del hoverboard. Por tanto compre un motor de monopatin de 350W y de aluminio, para que discipe todo ese calor. Todo el cableado lo pase con un cobertor adecuado para que quede lo mas prolijo posible. Con este motor alcance una velocidad maxima de 35km/h, y casi 45 km/h pedaleando. El motor va instalado en la rueda delantera, con un controlador de 18A y un acelerador tipo de moto. El freno lo saque pero mas adelante pienso instalar uno a disco en la rueda del motor por seguridad ya que es mucha la velocidad que alcanza.",
    image: "/images/bici.png",
    imageAlt: "Instalacion del motor hub en la rueda trasera de la bicicleta",
    materials: ["Motor hub 350W", "Controlador 18A", "Acelerador tipo moto", "Conectores XT60"],
  },
  {
    number: "04",
    title: "Telemetria con ESP32",
    description:
      "Arme un modulo de telemetria con un ESP32-C3 en la bateria que lee voltaje y corriente del pack via un sensor INA219. Los datos se mandan por WiFi a un servidor y se muestran en esta web en tiempo real. El firmware esta en C++ y el ESP va alimentado directo del BMS. En el cuadro van otros sensores como giroscopio, sensor de velocidad, etc. De esta manera puedo ver a la velocidad que voy, los kms recorridos, la autonomia restante y otros datos importantes. Asi como un menu para configurar varios modos.",
    image: "/images/esp.jpg",
    imageAlt: "ESP32 conectado a sensores de voltaje y corriente en un breadboard",
    materials: ["ESP32-C3", "Sensor INA219", "Display OLED 0.96\"", "PCB perforado"],
  },
  {
    number: "05",
    title: "Resultado final",
    description:
      "Despues de varias semanas de laburo, la bici quedo andando con una autonomia real de unos 25-30km dependiendo del terreno y cuanto pedalee. El sistema de telemetria me deja ver todo en tiempo real desde la pantalla. Ya lleva 15 ciclos de carga y el pack se mantiene sano, permitiendome llegar a mis destinos inclusive no habiendo gastado toda la bateria. El proximo paso es pintar el chasis para que quede mas integrado, y agregar un freno a disco en la rueda del motor por seguridad.",
    image: "/images/bici-final.png",
    imageAlt: "La bicicleta electrica terminada lista para andar",
    materials: null,
  },
]

const materialsList = [
  { category: "Bateria", items: "20x 18650, BMS 10S, tiras de niquel, spot welder" },
  { category: "Motor", items: "Hub 350W, controlador 18A, acelerador tipo moto, freno con corte" },
  { category: "Telemetria", items: "ESP32-C3, INA219, OLED 0.96\", resistencias" },
  { category: "Varios", items: "Conectores XT60, cable silicona, termocontraible, bridas" },
]

export function ProjectSection() {
  return (
    <section
      id="project-info"
      className="relative min-h-screen bg-background px-4 py-20 md:px-8"
    >
      {/* Dark overlay gradient from hero */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-40 bg-gradient-to-b from-transparent to-background"
        aria-hidden="true"
      />

      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-[160px]" />
        <div className="absolute bottom-1/4 left-0 h-72 w-72 rounded-full bg-primary/3 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Section header */}
        <FadeInSection>
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block font-mono text-xs uppercase tracking-[0.3em] text-primary">
              Build Log
            </span>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Como arme esta e-bike
              <br />
              <span className="text-muted-foreground">desde cero</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-left text-muted-foreground">
              El proyecto empezo como una idea de transformar una bici en electrica
              y termino siendo un desarrollo tecnologico propio, integrando multiples 
              sensores a tiempo real y pantalla interactiva. Aca va el paso a paso.
            </p>
          </div>
        </FadeInSection>

        {/* Build steps */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-5 top-0 bottom-0 w-px bg-border md:left-1/2 md:-translate-x-px"
            aria-hidden="true"
          />

          {buildSteps.map((step, index) => (
            <FadeInSection key={step.number} className="mb-16 last:mb-0">
              <div className="relative pl-14 md:pl-0">
                {/* Step number circle */}
                <div
                  className="liquid-glass-pill absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm font-bold text-primary md:left-1/2 md:-translate-x-1/2"
                >
                  {step.number}
                </div>

                {/* Content card */}
                <div
                  className={`md:w-[calc(50%-2.5rem)] ${
                    index % 2 === 0 ? "md:mr-auto md:pr-0" : "md:ml-auto md:pl-0"
                  }`}
                >
                  <div className="liquid-glass overflow-hidden rounded-2xl">
                    {/* Image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={step.image}
                        alt={step.imageAlt}
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    </div>

                    {/* Text */}
                    <div className="p-5">
                      <h3 className="mb-2 text-lg font-bold text-foreground">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>

                      {/* Materials used */}
                      {step.materials && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {step.materials.map((mat) => (
                            <span
                              key={mat}
                              className="liquid-glass-pill rounded-lg px-2.5 py-1 font-mono text-xs text-muted-foreground"
                            >
                              {mat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>

        {/* Materials summary */}
        <FadeInSection className="mt-20 mb-16">
          <div className="liquid-glass rounded-2xl p-6 md:p-8">
            <h3 className="mb-6 text-center font-mono text-xs uppercase tracking-[0.3em] text-primary">
              Lista de Materiales
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {materialsList.map((group) => (
                <div key={group.category} className="liquid-glass-sm rounded-xl p-4">
                  <span className="mb-1 block font-mono text-sm font-bold text-foreground">
                    {group.category}
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {group.items}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Footer */}
        <FadeInSection>
          <div className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Proyecto en constante mejora
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["ESP32", "18650", "10s2p", "BMS", "MicroPython", "INA219"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="liquid-glass-pill rounded-full px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
            <div className="mt-12 border-t border-border pt-8">
              <span className="font-mono text-xs text-muted-foreground">
                Confi Bike &copy; 2026
              </span>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}
