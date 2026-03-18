# Directorio de Firmware OTA

Este directorio contiene los archivos binarios de firmware para las actualizaciones OTA de los dispositivos eBike.

## Estructura de Archivos

```
firmware/
├── version.json          # Metadata de versiones disponibles
├── battery.bin          # Firmware para ESP32-C3 (batería)
├── mainboard.bin        # Firmware para ESP32-S (mainboard)
└── README.md            # Este archivo
```

## Archivos de Firmware

### battery.bin
- **Dispositivo**: ESP32-C3 (eBikeBattery)
- **Descripción**: Firmware del sistema de gestión de batería
- **URL**: `https://bike.xaviergalarreta.pro/firmware/battery.bin`

### mainboard.bin
- **Dispositivo**: ESP32-S2 (eBikeMainBoard)
- **Descripción**: Firmware de la placa principal de control
- **URL**: `https://bike.xaviergalarreta.pro/firmware/mainboard.bin`

## version.json

Este archivo contiene los metadatos de las versiones disponibles:

```json
{
  "battery": {
    "version": "1.0.1",
    "device": "BATTERY",
    "filename": "battery.bin",
    "size": 856320,
    "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4",
    "date": "2026-03-18",
    "changelog": "Fix crítico en calibración del sensor de corriente"
  },
  "mainboard": {
    "version": "1.0.0",
    "device": "MAINBOARD",
    "filename": "mainboard.bin",
    "size": 1024768,
    "md5": "b4e6d9a2c1f3e5b7d9a1c3e5f7b9d1a3",
    "date": "2026-03-15",
    "changelog": "Versión inicial con OTA"
  }
}
```

## Proceso de Actualización de Firmware

### 1. Compilar el firmware

Desde PlatformIO, compila el firmware para el dispositivo correspondiente:

```bash
# Para batería (ESP32-C3)
pio run -e esp32c3 --target upload

# Para mainboard (ESP32-S2)
pio run -e esp32s2 --target upload
```

El archivo `.bin` se encuentra en `.pio/build/<env>/firmware.bin`

### 2. Calcular MD5 del archivo

```bash
# Linux/Mac
md5sum battery.bin

# Windows PowerShell
Get-FileHash -Algorithm MD5 battery.bin

# Node.js
node -e "const crypto=require('crypto'),fs=require('fs');const hash=crypto.createHash('md5');hash.update(fs.readFileSync('battery.bin'));console.log(hash.digest('hex'));"
```

### 3. Copiar el archivo a este directorio

```bash
cp .pio/build/esp32c3/firmware.bin ./api/firmware/battery.bin
```

### 4. Registrar la nueva versión en la base de datos

Usando curl o Postman:

```bash
curl -X POST https://bike.xaviergalarreta.pro/api/ota/register \
  -H "Content-Type: application/json" \
  -d '{
    "password": "tu_password_admin",
    "device": "BATTERY",
    "version": "1.0.1",
    "filename": "battery.bin",
    "size": 856320,
    "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4",
    "changelog": "Fix crítico en calibración del sensor de corriente",
    "enabled": true,
    "rolloutPercentage": 100
  }'
```

Esto automáticamente actualizará el `version.json`.

### 5. Verificar la actualización

El ESP32 verificará automáticamente si hay actualizaciones disponibles cuando:
- Se conecta el cargador
- Cada 2 minutos mientras está cargando
- Cada 10 minutos cuando despierta del deep sleep

## API Endpoints

### Verificar actualización disponible

```bash
GET /api/ota/check-update?device=battery&version=1.0.0&deviceId=eBikeBattery
```

Respuesta:
```json
{
  "success": true,
  "updateAvailable": true,
  "currentVersion": "1.0.0",
  "newVersion": "1.0.1",
  "releaseNotes": "Fix crítico en calibración del sensor de corriente",
  "size": 856320,
  "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4"
}
```

### Listar todas las versiones

```bash
GET /api/ota/versions?device=battery
```

### Deshabilitar una versión

```bash
POST /api/ota/disable
Content-Type: application/json

{
  "password": "tu_password_admin",
  "device": "BATTERY",
  "version": "1.0.0"
}
```

### Refrescar version.json manualmente

```bash
POST /api/ota/refresh-version-json
Content-Type: application/json

{
  "password": "tu_password_admin"
}
```

## Rollout Gradual

Puedes controlar qué dispositivos reciben la actualización:

```javascript
{
  "rolloutPercentage": 50,  // Solo 50% de los dispositivos
  "targetDevices": ["eBikeBattery_01", "eBikeBattery_02"]  // Solo estos IDs
}
```

## Seguridad

- Todos los endpoints administrativos requieren contraseña
- Los archivos se sirven sobre HTTPS
- Se recomienda verificar MD5 en el ESP32
- Versión mínima puede prevenir downgrades peligrosos

## Monitoreo

Verifica los logs del servidor para ver actualizaciones:

```bash
docker logs -f bike-api
```

Logs típicos:
```
📊 Datos recibidos de batería:
  Device: eBikeBattery
  Firmware: 1.0.0
🚀 ACTUALIZACIÓN DISPONIBLE: 1.0.0 → 1.0.1
```

## Troubleshooting

### El ESP32 no descarga la actualización

1. Verificar que `version.json` esté actualizado
2. Verificar que el archivo `.bin` exista y sea accesible
3. Verificar logs del servidor para errores
4. Probar descarga manual: `curl https://bike.xaviergalarreta.pro/firmware/battery.bin -o test.bin`

### La actualización falla en el ESP32

1. Verificar tamaño del archivo (debe caber en la partición OTA)
2. Verificar MD5 si está habilitado
3. Verificar que el firmware compilado sea para el ESP32 correcto (C3 vs S2)
4. Ver logs del serial monitor del ESP32

### Rollback de actualización

Si una actualización causa problemas:

1. Deshabilitar la versión problemática:
```bash
curl -X POST https://bike.xaviergalarreta.pro/api/ota/disable \
  -H "Content-Type: application/json" \
  -d '{"password": "admin", "device": "BATTERY", "version": "1.0.1"}'
```

2. Los dispositivos volverán a reportar la versión anterior como actual

## Notas Importantes

- ⚠️ **Backup**: Siempre mantén una copia de la versión estable anterior
- ⚠️ **Testing**: Prueba primero con `rolloutPercentage` bajo (10-20%)
- ⚠️ **Tamaño**: Los archivos `.bin` típicamente pesan 800KB - 1.5MB
- ⚠️ **Espacio**: Asegúrate de tener espacio en disco suficiente en el servidor
