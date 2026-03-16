import { useEffect, useState } from 'react'
import type { BikeData } from '@/lib/bike-data'

interface UseBatteryDataReturn {
  data: BikeData | null
  loading: boolean
  error: string | null
  refetch: () => void
  isStale: boolean
  lastUpdate: Date | null
}

const STALE_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutos

export function useBatteryData(refreshInterval: number = 60000): UseBatteryDataReturn {
  const [data, setData] = useState<BikeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      // En producción, usar la misma URL (relativa)
      // En desarrollo, usar localhost
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3120'
      
      // Si estamos en el navegador y la URL contiene el dominio de producción, usar ruta relativa
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const endpoint = isDevelopment ? `${apiUrl}/api/bike-data/latest` : '/api/bike-data/latest'
      
      console.log('Fetching from:', endpoint)
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        if (response.status === 404) {
          // No hay datos todavía
          setData(null)
          setError(null)
          setLoading(false)
          return
        }
        throw new Error(`Error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        const rawData: BikeData = result.data
        const dataTimestamp = new Date(rawData.timestamp)
        const now = new Date()
        const timeDiff = now.getTime() - dataTimestamp.getTime()
        const isDataStale = timeDiff > STALE_THRESHOLD_MS
        
        // Si pasaron más de 15 minutos, asumir que NO está cargando
        const processedData: BikeData = {
          ...rawData,
          charging: isDataStale ? false : rawData.charging
        }
        
        setData(processedData)
        setLastUpdate(dataTimestamp)
        setIsStale(isDataStale)
        setError(null)
      } else {
        setData(null)
        setLastUpdate(null)
        setIsStale(false)
      }
    } catch (err) {
      console.error('Error fetching battery data:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Refresh automático
    const interval = setInterval(fetchData, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isStale,
    lastUpdate
  }
}
