"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface BatteryHistoryData {
  timestamp: string
  percent: number
  voltage: number
  charging: boolean
  time: string
}

interface BatteryHistoryChartProps {
  className?: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

// Función para rellenar huecos en los datos
function fillGaps(data: BatteryHistoryData[]): BatteryHistoryData[] {
  if (data.length === 0) return []

  const result: BatteryHistoryData[] = []
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  // Crear intervalos de 30 minutos para las últimas 24 horas
  const intervals: Date[] = []
  for (let i = 0; i < 48; i++) {
    const intervalTime = new Date(oneDayAgo.getTime() + i * 30 * 60 * 1000)
    intervals.push(intervalTime)
  }

  let dataIndex = 0
  let lastKnownData: BatteryHistoryData = data[0]

  for (const intervalTime of intervals) {
    // Encontrar el dato más cercano a este intervalo
    let closestData = lastKnownData
    
    while (dataIndex < data.length) {
      const dataTime = new Date(data[dataIndex].timestamp)
      
      // Si el dato está antes del siguiente intervalo, usarlo
      if (dataTime <= intervalTime) {
        closestData = data[dataIndex]
        lastKnownData = data[dataIndex]
        dataIndex++
      } else {
        break
      }
    }

    // Agregar el dato (sea real o copiado)
    result.push({
      ...closestData,
      time: intervalTime.toLocaleTimeString("es-AR", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
      timestamp: intervalTime.toISOString()
    })
  }

  return result
}

// Función para determinar el color según el porcentaje
function getBarColor(percent: number, charging: boolean): string {
  if (charging) {
    return "hsl(160, 80%, 48%)" // Verde brillante cuando está cargando
  }
  
  if (percent < 20) {
    return "hsl(0, 85%, 60%)" // Rojo para nivel crítico
  }
  
  return "hsl(199, 89%, 48%)" // Azul del tema (color primario)
}

export function BatteryHistoryChart({ className = "", isOpen, onOpenChange }: BatteryHistoryChartProps) {
  const [historyData, setHistoryData] = useState<BatteryHistoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
    // Refrescar cada 2 minutos
    const interval = setInterval(fetchHistory, 120000)
    return () => clearInterval(interval)
  }, [])

  const fetchHistory = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3120'
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const endpoint = isDevelopment ? `${apiUrl}/api/bike-data/history?hours=24` : '/api/bike-data/history?hours=24'
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // Transformar los datos
        const transformedData: BatteryHistoryData[] = result.data.map((item: any) => ({
          timestamp: item.timestamp,
          percent: item.percent,
          voltage: item.voltage,
          charging: item.charging,
          time: new Date(item.timestamp).toLocaleTimeString("es-AR", { 
            hour: "2-digit", 
            minute: "2-digit" 
          })
        }))

        // Rellenar huecos
        const filledData = fillGaps(transformedData)
        setHistoryData(filledData)
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Calcular tendencia
  const getTrend = () => {
    if (historyData.length < 2) return null
    const recent = historyData.slice(-10)
    const first = recent[0].percent
    const last = recent[recent.length - 1].percent
    const diff = last - first
    
    if (Math.abs(diff) < 1) return { icon: Minus, text: "Estable", color: "text-muted-foreground" }
    if (diff > 0) return { icon: TrendingUp, text: "Subiendo", color: "text-green-400" }
    return { icon: TrendingDown, text: "Bajando", color: "text-orange-400" }
  }

  const trend = getTrend()

  return (
    <div className={className}>
      {/* Header con indicador de tendencia */}
      <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4" />
        <span className="font-mono tracking-wider">Historial 24h</span>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={historyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Bar 
              dataKey="percent" 
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              shape={(props: any) => {
                const { x, y, width, height, payload } = props
                const fill = getBarColor(payload.percent, payload.charging)
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={fill}
                    rx={4}
                  />
                )
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
