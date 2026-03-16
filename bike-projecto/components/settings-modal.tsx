"use client"

import { useState, useEffect } from "react"
import { Settings as SettingsIcon, Mail, Battery, BatteryCharging, Wifi, Lock, Save, X, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Settings {
  emailNotifications: {
    enabled: boolean
    email: string
    highBatteryAlert: {
      enabled: boolean
      threshold: number
    }
    lowBatteryAlert: {
      enabled: boolean
      threshold: number
    }
    criticalBatteryAlert: {
      enabled: boolean
      threshold: number
    }
    chargeCompleteAlert: {
      enabled: boolean
    }
    chargeStartedAlert: {
      enabled: boolean
    }
    temperatureAlert: {
      enabled: boolean
      maxTemp: number
    }
  }
  displaySettings: {
    temperatureUnit: string
    theme: string
    language: string
  }
  advanced: {
    autoRefreshInterval: number
    dataRetentionDays: number
  }
}

export function SettingsModal() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cargar configuración al abrir el modal
  useEffect(() => {
    if (open && !settings) {
      fetchSettings()
    }
  }, [open])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3120'
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const endpoint = isDevelopment ? `${apiUrl}/api/settings` : '/api/settings'
      
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.data)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!showPasswordInput) {
      setShowPasswordInput(true)
      return
    }

    if (!password) {
      setError('Por favor ingresa la contraseña')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3120'
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const endpoint = isDevelopment ? `${apiUrl}/api/settings` : '/api/settings'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          settings
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess(true)
        setPassword('')
        setShowPasswordInput(false)
        setTimeout(() => {
          setSuccess(false)
          setOpen(false)
        }, 2000)
      } else {
        setError(data.error || 'Error al guardar la configuración')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Error al guardar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const updateEmailNotification = (key: string, value: any) => {
    if (!settings) return
    setSettings({
      ...settings,
      emailNotifications: {
        ...settings.emailNotifications,
        [key]: value
      }
    })
  }

  const updateAlertSetting = (alertType: string, key: string, value: any) => {
    if (!settings) return
    setSettings({
      ...settings,
      emailNotifications: {
        ...settings.emailNotifications,
        [alertType]: {
          ...(settings.emailNotifications as any)[alertType],
          [key]: value
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed right-4 top-4 z-[100] h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-accent hover:shadow-xl"
          title="Configuración"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {!settings ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Cargando configuración...</p>
            </div>
          </div>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Configuración de Notificaciones
          </DialogTitle>
          <DialogDescription>
            Configura las alertas y notificaciones por correo electrónico
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 text-green-900">
            <AlertDescription>✅ Configuración guardada exitosamente</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Email principal */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label htmlFor="email-enabled">Notificaciones por Email</Label>
              </div>
              <Switch
                id="email-enabled"
                checked={settings.emailNotifications.enabled}
                onCheckedChange={(checked) => updateEmailNotification('enabled', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={settings.emailNotifications.email}
                onChange={(e) => updateEmailNotification('email', e.target.value)}
                placeholder="tu@email.com"
                disabled={!settings.emailNotifications.enabled}
              />
            </div>
          </div>

          <Separator />

          {/* Alertas de batería */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Battery className="h-4 w-4" />
              Alertas de Nivel de Batería
            </h3>

            {/* Batería alta (al cargar) */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="high-battery">Batería alta (al cargar)</Label>
                <Switch
                  id="high-battery"
                  checked={settings.emailNotifications.highBatteryAlert.enabled}
                  onCheckedChange={(checked) => updateAlertSetting('highBatteryAlert', 'enabled', checked)}
                  disabled={!settings.emailNotifications.enabled}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="high-threshold" className="text-sm text-muted-foreground">
                  Umbral:
                </Label>
                <Input
                  id="high-threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.emailNotifications.highBatteryAlert.threshold}
                  onChange={(e) => updateAlertSetting('highBatteryAlert', 'threshold', parseInt(e.target.value))}
                  className="w-20"
                  disabled={!settings.emailNotifications.highBatteryAlert.enabled}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Avisa cuando la batería alcanza este nivel durante la carga
              </p>
            </div>

            {/* Batería baja */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="low-battery">Batería baja</Label>
                <Switch
                  id="low-battery"
                  checked={settings.emailNotifications.lowBatteryAlert.enabled}
                  onCheckedChange={(checked) => updateAlertSetting('lowBatteryAlert', 'enabled', checked)}
                  disabled={!settings.emailNotifications.enabled}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="low-threshold" className="text-sm text-muted-foreground">
                  Umbral:
                </Label>
                <Input
                  id="low-threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.emailNotifications.lowBatteryAlert.threshold}
                  onChange={(e) => updateAlertSetting('lowBatteryAlert', 'threshold', parseInt(e.target.value))}
                  className="w-20"
                  disabled={!settings.emailNotifications.lowBatteryAlert.enabled}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alerta cuando la batería baja de este nivel
              </p>
            </div>

            {/* Batería crítica */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="critical-battery">Batería crítica</Label>
                <Switch
                  id="critical-battery"
                  checked={settings.emailNotifications.criticalBatteryAlert.enabled}
                  onCheckedChange={(checked) => updateAlertSetting('criticalBatteryAlert', 'enabled', checked)}
                  disabled={!settings.emailNotifications.enabled}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="critical-threshold" className="text-sm text-muted-foreground">
                  Umbral:
                </Label>
                <Input
                  id="critical-threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.emailNotifications.criticalBatteryAlert.threshold}
                  onChange={(e) => updateAlertSetting('criticalBatteryAlert', 'threshold', parseInt(e.target.value))}
                  className="w-20"
                  disabled={!settings.emailNotifications.criticalBatteryAlert.enabled}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alerta urgente cuando la batería está críticamente baja
              </p>
            </div>
          </div>

          <Separator />

          {/* Alertas de carga */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <BatteryCharging className="h-4 w-4" />
              Alertas de Carga
            </h3>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <Label htmlFor="charge-complete">Carga completa</Label>
                <p className="text-xs text-muted-foreground">
                  Notifica cuando la batería alcanza el 100%
                </p>
              </div>
              <Switch
                id="charge-complete"
                checked={settings.emailNotifications.chargeCompleteAlert.enabled}
                onCheckedChange={(checked) => updateAlertSetting('chargeCompleteAlert', 'enabled', checked)}
                disabled={!settings.emailNotifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <Label htmlFor="charge-started">Inicio de carga</Label>
                <p className="text-xs text-muted-foreground">
                  Notifica cuando se conecta el cargador (próximamente)
                </p>
              </div>
              <Switch
                id="charge-started"
                checked={settings.emailNotifications.chargeStartedAlert.enabled}
                onCheckedChange={(checked) => updateAlertSetting('chargeStartedAlert', 'enabled', checked)}
                disabled={true}
              />
            </div>
          </div>

          <Separator />

          {/* Alertas avanzadas (futuras) */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Wifi className="h-4 w-4" />
              Alertas Avanzadas
            </h3>

            <div className="flex items-center justify-between rounded-lg border p-3 opacity-50">
              <div className="space-y-1">
                <Label htmlFor="temp-alert">Alertas de temperatura</Label>
                <p className="text-xs text-muted-foreground">
                  Próximamente: alertas de sobrecalentamiento
                </p>
              </div>
              <Switch id="temp-alert" disabled={true} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 opacity-50">
              <div className="space-y-1">
                <Label htmlFor="connection-alert">Pérdida de conexión</Label>
                <p className="text-xs text-muted-foreground">
                  Próximamente: avisa si no hay datos por X minutos
                </p>
              </div>
              <Switch id="connection-alert" disabled={true} />
            </div>
          </div>

          {/* Contraseña y botón de guardar */}
          {showPasswordInput && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-orange-500/50 bg-orange-50 p-3 dark:bg-orange-950/10">
                <Lock className="h-4 w-4 text-orange-600" />
                <Input
                  type="password"
                  placeholder="Contraseña de administrador"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  className="border-none bg-transparent"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se requiere contraseña para guardar los cambios
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setShowPasswordInput(false)
                setPassword('')
                setError(null)
              }}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {showPasswordInput ? 'Confirmar' : 'Guardar'}
            </Button>
          </div>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
