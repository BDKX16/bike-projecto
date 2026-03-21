"use client"

import { useState, useEffect } from "react"
import { Settings as SettingsIcon, Mail, Battery, BatteryCharging, Wifi, Lock, Save, X, Clock, Upload, Download, Zap, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useBatteryData } from "@/hooks/use-battery-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Hace unos segundos"
  if (diffMins === 1) return "Hace 1 minuto"
  if (diffMins < 60) return `Hace ${diffMins} minutos`
  if (diffHours === 1) return "Hace 1 hora"
  if (diffHours < 24) return `Hace ${diffHours} horas`
  if (diffDays === 1) return "Hace 1 día"
  return `Hace ${diffDays} días`
}

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
  const { toast } = useToast()
  const { isStale, lastUpdate } = useBatteryData()
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  
  // Estados para OTA upload
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null)
  const [deviceType, setDeviceType] = useState<string>("battery")
  const [changelog, setChangelog] = useState<string>("")
  const [uploadingFirmware, setUploadingFirmware] = useState(false)
  const [nextVersion, setNextVersion] = useState<string>("")
  const [currentVersion, setCurrentVersion] = useState<string>("")

  // Estados para WiFi management
  const [wifiSSID, setWifiSSID] = useState<string>("")
  const [wifiPassword, setWifiPassword] = useState<string>("")
  const [currentNetworks, setCurrentNetworks] = useState<string[]>([])
  const [desiredNetworks, setDesiredNetworks] = useState<any[]>([])
  const [loadingWifiData, setLoadingWifiData] = useState(false)
  const [wifiInSync, setWifiInSync] = useState<boolean | null>(null)

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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar la configuración",
      })
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa la contraseña",
      })
      return
    }

    try {
      setLoading(true)
      
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
        toast({
          title: "✅ Éxito",
          description: "Configuración guardada exitosamente",
          className: "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
        })
        setPassword('')
        setShowPasswordInput(false)
        setTimeout(() => {
          setOpen(false)
        }, 2000)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || 'Contraseña incorrecta. Por favor, inténtalo de nuevo.',
        })
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "Error al conectar con el servidor. Por favor, verifica tu conexión.",
      })
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

  // Obtener próxima versión cuando cambia el tipo de dispositivo
  useEffect(() => {
    if (deviceType && open) {
      fetchNextVersion()
      fetchWifiNetworks()
    }
  }, [deviceType, open])

  const fetchNextVersion = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3120'
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const endpoint = isDevelopment 
        ? `${apiUrl}/api/ota/next-version?device=${deviceType}` 
        : `/api/ota/next-version?device=${deviceType}`
      
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (data.success) {
        setNextVersion(data.nextVersion)
        setCurrentVersion(data.currentVersion)
      }
    } catch (err) {
      console.error('Error fetching next version:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.bin')) {
        setFirmwareFile(file)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Solo se permiten archivos .bin",
        })
      }
    }
  }

  const handleFirmwareUpload = async () => {
    if (!firmwareFile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona un archivo .bin",
      })
      return
    }

    if (!password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa la contraseña de administrador",
      })
      setShowPasswordInput(true)
      return
    }

    try {
      setUploadingFirmware(true)

      const formData = new FormData()
      formData.append('firmware', firmwareFile)
      formData.append('device', deviceType)
      formData.append('password', password)
      formData.append('changelog', changelog || `Actualización ${nextVersion}`)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3120'
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const endpoint = isDevelopment ? `${apiUrl}/api/ota/upload` : '/api/ota/upload'

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Firmware Subido",
          description: `Versión ${data.data.version} registrada exitosamente`,
          className: "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
        })
        
        // Limpiar formulario
        setFirmwareFile(null)
        setChangelog("")
        const fileInput = document.getElementById('firmware-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        
        // Actualizar próxima versión
        await fetchNextVersion()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || 'Error al subir el firmware',
        })
      }
    } catch (err) {
      console.error('Error uploading firmware:', err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al conectar con el servidor",
      })
    } finally {
      setUploadingFirmware(false)
    }
  }

  // ==================== WIFI MANAGEMENT FUNCTIONS ====================

  const fetchWifiNetworks = async () => {
    try {
      setLoadingWifiData(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3120'
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      
      // Obtener redes actuales y deseadas
      const networksEndpoint = isDevelopment 
        ? `${apiUrl}/api/wifi/networks/eBikeBattery` 
        : `/api/wifi/networks/eBikeBattery`
      
      const networksResponse = await fetch(networksEndpoint)
      const networksData = await networksResponse.json()
      
      if (networksData.success) {
        setCurrentNetworks(networksData.data.currentNetworks || [])
        setDesiredNetworks(networksData.data.desiredNetworks || [])
        setWifiInSync(networksData.data.inSync)
      }
    } catch (err) {
      console.error('Error fetching WiFi data:', err)
    } finally {
      setLoadingWifiData(false)
    }
  }

  const handleAddWifiNetwork = async () => {
    if (!wifiSSID || !wifiPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa SSID y contraseña",
      })
      return
    }

    if (!password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa la contraseña de administrador",
      })
      setShowPasswordInput(true)
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3120'
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const endpoint = isDevelopment ? `${apiUrl}/api/wifi/network` : '/api/wifi/network'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          device: 'eBikeBattery',
          ssid: wifiSSID,
          wifiPassword: wifiPassword
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Red WiFi Agregada",
          description: `La red "${wifiSSID}" se agregará en el próximo reporte del ESP32`,
          className: "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
        })
        
        // Limpiar formulario
        setWifiSSID("")
        setWifiPassword("")
        
        // Actualizar lista de redes
        await fetchWifiNetworks()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || 'Error al agregar red WiFi',
        })
      }
    } catch (err) {
      console.error('Error adding WiFi network:', err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al conectar con el servidor",
      })
    }
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
          {lastUpdate && (
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs mt-2 w-fit ${isStale ? "bg-orange-500/10 border border-orange-500/30" : "bg-muted"}`}>
              <Clock className={`h-3 w-3 ${isStale ? "text-orange-400" : "text-muted-foreground"}`} />
              <span className={`font-mono tracking-wider ${isStale ? "text-orange-400" : "text-muted-foreground"}`}>
                {formatRelativeTime(lastUpdate)}
                {isStale && " (sin conexión)"}
              </span>
            </div>
          )}
        </DialogHeader>

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
                  Notifica cuando se conecta el cargador con estimado de tiempo
                </p>
              </div>
              <Switch
                id="charge-started"
                checked={settings.emailNotifications.chargeStartedAlert.enabled}
                onCheckedChange={(checked) => updateAlertSetting('chargeStartedAlert', 'enabled', checked)}
                disabled={!settings.emailNotifications.enabled}
              />
            </div>
          </div>

          <Separator />

          {/* Secciones Avanzadas - Acordeón */}
          <Accordion type="multiple" className="w-full">
            {/* Actualización de Firmware OTA */}
            <AccordionItem value="ota-firmware">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 font-semibold">
                  <Zap className="h-4 w-4" />
                  Actualización de Firmware (OTA)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 rounded-lg border bg-background p-4">
                  {/* Selector de dispositivo */}
                  <div className="space-y-2">
                    <Label htmlFor="device-type">Tipo de Dispositivo</Label>
                    <Select value={deviceType} onValueChange={setDeviceType}>
                      <SelectTrigger id="device-type">
                        <SelectValue placeholder="Selecciona dispositivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="battery">
                          <div className="flex items-center gap-2">
                            <Battery className="h-4 w-4" />
                            <span>Batería (ESP32-C3)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="mainboard">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span>Mainboard (ESP32-S2)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Información de versiones */}
                  <div className="grid grid-cols-2 gap-3 rounded-md bg-background/50 p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Versión Actual</p>
                      <p className="font-mono text-sm font-semibold">{currentVersion || '---'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Próxima Versión</p>
                      <p className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">
                        {nextVersion || '---'}
                      </p>
                    </div>
                  </div>

                  {/* Selector de archivo */}
                  <div className="space-y-2">
                    <Label htmlFor="firmware-file">Archivo de Firmware (.bin)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="firmware-file"
                        type="file"
                        accept=".bin"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                      />
                      {firmwareFile && (
                        <div className="flex items-center gap-1 rounded-md bg-green-50 px-3 text-xs text-green-700 dark:bg-green-950 dark:text-green-400">
                          <Download className="h-3 w-3" />
                          {(firmwareFile.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {firmwareFile ? `Seleccionado: ${firmwareFile.name}` : 'Selecciona un archivo .bin compilado'}
                    </p>
                  </div>

                  {/* Changelog */}
                  <div className="space-y-2">
                    <Label htmlFor="changelog">Notas de la Versión (Opcional)</Label>
                    <Textarea
                      id="changelog"
                      placeholder="Fix de bug en sensor de corriente, mejoras de rendimiento..."
                      value={changelog}
                      onChange={(e) => setChangelog(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe los cambios de esta actualización
                    </p>
                  </div>

                  {/* Botón de subir */}
                  <Button
                    onClick={handleFirmwareUpload}
                    disabled={uploadingFirmware || !firmwareFile}
                    className="w-full"
                    variant="default"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingFirmware ? 'Subiendo...' : `Subir Firmware v${nextVersion}`}
                  </Button>

                  <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950/20">
                    <p className="text-xs text-blue-800 dark:text-blue-400">
                      ℹ️ El versionado es <strong>autoincremental</strong>. La versión se asigna automáticamente basándose en la última versión registrada (+1 en patch).
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Gestión de Redes WiFi */}
            <AccordionItem value="wifi-management">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 font-semibold">
                  <Wifi className="h-4 w-4" />
                  Gestión Remota de Redes WiFi
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 rounded-lg border bg-background p-4">
                  {/* Información */}
                  <div className="rounded-md bg-blue-100 p-3 dark:bg-blue-900/30">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      📡 <strong>Gestión remota:</strong> Agrega o elimina redes WiFi del ESP32 sin necesidad de reprogramarlo. Los cambios se aplicarán en el próximo reporte de batería.
                    </p>
                  </div>

                  {/* Agregar nueva red */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar Nueva Red
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="wifi-ssid" className="text-foreground">SSID de la Red</Label>
                      <Input
                        id="wifi-ssid"
                        placeholder="MiRedWiFi"
                        value={wifiSSID}
                        onChange={(e) => setWifiSSID(e.target.value)}
                        maxLength={32}
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wifi-pwd" className="text-foreground">Contraseña de la Red</Label>
                      <Input
                        id="wifi-pwd"
                        type="password"
                        placeholder="•••••••••"
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        maxLength={64}
                        className="bg-background"
                      />
                    </div>

                    <Button
                      onClick={handleAddWifiNetwork}
                      disabled={!wifiSSID || !wifiPassword}
                      className="w-full"
                      variant="default"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Red WiFi
                    </Button>
                  </div>

                  <Separator />

                  {/* Redes actuales y estado de sincronización */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Estado de Redes WiFi</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchWifiNetworks}
                        disabled={loadingWifiData}
                      >
                        {loadingWifiData ? 'Cargando...' : 'Actualizar'}
                      </Button>
                    </div>

                    {loadingWifiData ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Estado de sincronización */}
                        {wifiInSync !== null && (
                          <div className={`rounded-md p-3 ${wifiInSync ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900/30' : 'bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30'}`}>
                            <p className={`text-xs font-medium ${wifiInSync ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
                              {wifiInSync ? '✅ Sincronizado' : '⚠️ Desincronizado - Se sincronizará en el próximo reporte'}
                            </p>
                          </div>
                        )}

                        {/* Redes actuales en el ESP32 */}
                        <div className="rounded-lg border bg-background/50 p-3">
                          <p className="mb-2 text-xs font-semibold text-muted-foreground">Redes en el ESP32 ({currentNetworks.length})</p>
                          {currentNetworks.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin redes reportadas</p>
                          ) : (
                            <div className="space-y-1">
                              {currentNetworks.map((ssid, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Wifi className="h-3 w-3 text-blue-600" />
                                  <span className="text-sm font-mono">{ssid}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Redes deseadas (master list) */}
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                          <p className="mb-2 text-xs font-semibold text-primary">Redes Configuradas ({desiredNetworks.length})</p>
                          {desiredNetworks.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin redes configuradas</p>
                          ) : (
                            <div className="space-y-1">
                              {desiredNetworks.map((network, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Wifi className="h-3 w-3 text-primary" />
                                  <span className="text-sm font-mono">{network.ssid}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-950/20">
                    <p className="text-xs text-amber-800 dark:text-amber-400">
                      ⚠️ <strong>Nota:</strong> Las redes se sincronizan automáticamente en el próximo reporte del ESP32. Máximo 10 redes configurables.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />


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
