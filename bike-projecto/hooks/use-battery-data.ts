import { useEffect, useState } from 'react'
import type { BikeData } from '@/lib/bike-data'

interface UseBatteryDataReturn {
  data: BikeData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useBatteryData(refreshInterval: number = 60000): UseBatteryDataReturn {
  const [data, setData] = useState<BikeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        setData(result.data)
        setError(null)
      } else {
        setData(null)
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
    refetch: fetchData
  }
}
