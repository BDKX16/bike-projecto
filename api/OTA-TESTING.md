# Testing del Sistema OTA

Este documento contiene ejemplos de pruebas y comandos útiles para verificar el funcionamiento del sistema OTA.

## Configuración Inicial

### Variables de Entorno

Agregar al archivo `.env`:

```bash
# OTA Configuration
FIRMWARE_PATH=/var/www/html/firmware  # Ruta donde se almacenan los binarios
ADMIN_PASSWORD=tu_password_seguro     # Password para operaciones administrativas
```

## Testing con curl

### 1. Simular Reporte de Batería (sin actualización)

```bash
curl -X POST http://localhost:3120/api/battery \
  -H "Content-Type: application/json" \
  -d '{
    "device": "eBikeBattery",
    "name": "EVE 8.5A",
    "firmwareVersion": "1.0.0",
    "voltage": 37.45,
    "gpioVoltage": 1.3542,
    "current": -0.123,
    "percent": 78.5,
    "remainingAh": 6.71,
    "consumedAh": 1.84,
    "cycles": 15,
    "maxCycles": 500,
    "charging": true,
    "timestamp": 1234567
  }'
```

**Respuesta esperada (sin actualización):**
```json
{
  "status": "ok",
  "success": true,
  "data": { ... },
  "charging": true,
  "emailSent": false,
  "updateAvailable": false,
  "currentVersion": "1.0.0",
  "latestVersion": "1.0.0",
  "receivedAt": "2026-03-18T10:30:00.000Z"
}
```

### 2. Registrar Nueva Versión de Firmware

```bash
curl -X POST http://localhost:3120/api/ota/register \
  -H "Content-Type: application/json" \
  -d '{
    "password": "ebike2024",
    "device": "BATTERY",
    "version": "1.0.1",
    "filename": "battery.bin",
    "size": 856320,
    "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4",
    "changelog": "Fix crítico en calibración del sensor de corriente",
    "enabled": true,
    "rolloutPercentage": 100,
    "minVersion": "1.0.0"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Firmware registrado exitosamente",
  "data": {
    "_id": "65f8a9b7c8d1e9f2a3b4c5d6",
    "device": "BATTERY",
    "version": "1.0.1",
    "filename": "battery.bin",
    "size": 856320,
    "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4",
    "changelog": "Fix crítico en calibración del sensor de corriente",
    "enabled": true,
    "rolloutPercentage": 100,
    "releaseDate": "2026-03-18T10:30:00.000Z"
  }
}
```

### 3. Simular Reporte de Batería (con actualización disponible)

```bash
curl -X POST http://localhost:3120/api/battery \
  -H "Content-Type: application/json" \
  -d '{
    "device": "eBikeBattery",
    "name": "EVE 8.5A",
    "firmwareVersion": "1.0.0",
    "voltage": 37.45,
    "percent": 78.5,
    "charging": true
  }'
```

**Respuesta esperada (con actualización):**
```json
{
  "status": "ok",
  "success": true,
  "data": { ... },
  "charging": true,
  "emailSent": false,
  "updateAvailable": true,
  "currentVersion": "1.0.0",
  "newVersion": "1.0.1",
  "releaseNotes": "Fix crítico en calibración del sensor de corriente",
  "size": 856320,
  "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4",
  "receivedAt": "2026-03-18T10:30:00.000Z"
}
```

### 4. Verificar Actualización (endpoint dedicado)

```bash
curl "http://localhost:3120/api/ota/check-update?device=battery&version=1.0.0&deviceId=eBikeBattery"
```

**Respuesta:**
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

### 5. Listar Todas las Versiones

```bash
# Todas las versiones
curl "http://localhost:3120/api/ota/versions"

# Solo versiones de batería
curl "http://localhost:3120/api/ota/versions?device=battery"
```

**Respuesta:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "65f8a9b7c8d1e9f2a3b4c5d6",
      "device": "BATTERY",
      "version": "1.0.1",
      "filename": "battery.bin",
      "enabled": true,
      "releaseDate": "2026-03-18T10:30:00.000Z"
    },
    {
      "_id": "65f8a9b7c8d1e9f2a3b4c5d5",
      "device": "BATTERY",
      "version": "1.0.0",
      "filename": "battery.bin",
      "enabled": true,
      "releaseDate": "2026-03-15T10:30:00.000Z"
    }
  ]
}
```

### 6. Descargar version.json

```bash
curl "http://localhost:3120/firmware/version.json"
```

**Respuesta:**
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

### 7. Descargar Firmware Binary

```bash
curl "http://localhost:3120/firmware/battery.bin" --output battery.bin
```

### 8. Deshabilitar una Versión

```bash
curl -X POST http://localhost:3120/api/ota/disable \
  -H "Content-Type: application/json" \
  -d '{
    "password": "ebike2024",
    "device": "BATTERY",
    "version": "1.0.1"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Firmware BATTERY v1.0.1 deshabilitado"
}
```

### 9. Refrescar version.json Manualmente

```bash
curl -X POST http://localhost:3120/api/ota/refresh-version-json \
  -H "Content-Type: application/json" \
  -d '{
    "password": "ebike2024"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "version.json actualizado exitosamente"
}
```

## Testing Avanzado

### Rollout Gradual (50%)

```bash
curl -X POST http://localhost:3120/api/ota/register \
  -H "Content-Type: application/json" \
  -d '{
    "password": "ebike2024",
    "device": "BATTERY",
    "version": "1.0.2",
    "filename": "battery.bin",
    "size": 860000,
    "changelog": "Mejoras de rendimiento",
    "enabled": true,
    "rolloutPercentage": 50
  }'
```

### Target Devices Específicos

```bash
curl -X POST http://localhost:3120/api/ota/register \
  -H "Content-Type: application/json" \
  -d '{
    "password": "ebike2024",
    "device": "BATTERY",
    "version": "1.0.3-beta",
    "filename": "battery.bin",
    "size": 865000,
    "changelog": "Versión beta para testing",
    "enabled": true,
    "targetDevices": ["eBikeBattery_dev", "eBikeBattery_test"]
  }'
```

## Uso del Script Helper

### Registrar Firmware usando el script

```bash
# Desde el directorio api/
node register-firmware.js battery 1.0.1 ./path/to/battery.bin "Fix de sensor de corriente"
```

El script automáticamente:
1. ✅ Valida el archivo
2. ✅ Calcula MD5
3. ✅ Obtiene tamaño
4. ✅ Copia el archivo a `firmware/`
5. ✅ Registra en la base de datos
6. ✅ Actualiza `version.json`

## Testing con Postman

### Collection Import

Puedes importar esta colección en Postman:

```json
{
  "info": {
    "name": "eBike OTA API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Battery Report (Check Update)",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"device\": \"eBikeBattery\",\n  \"firmwareVersion\": \"1.0.0\",\n  \"voltage\": 37.45,\n  \"percent\": 78.5,\n  \"charging\": true\n}"
        },
        "url": "http://localhost:3120/api/battery"
      }
    },
    {
      "name": "Register Firmware",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"password\": \"ebike2024\",\n  \"device\": \"BATTERY\",\n  \"version\": \"1.0.1\",\n  \"filename\": \"battery.bin\",\n  \"size\": 856320,\n  \"changelog\": \"Fix crítico\"\n}"
        },
        "url": "http://localhost:3120/api/ota/register"
      }
    },
    {
      "name": "List Versions",
      "request": {
        "method": "GET",
        "url": "http://localhost:3120/api/ota/versions"
      }
    }
  ]
}
```

## Verificación de Logs

### Logs del servidor Node.js

```bash
# Docker
docker logs -f bike-api

# Local
npm start
```

**Logs esperados:**

```
📊 Datos recibidos de batería:
  Device: eBikeBattery
  Firmware: 1.0.0
  Voltage: 37.45V
  Percent: 78.5%
  Charging: true
🚀 Actualización disponible para battery: 1.0.0 → 1.0.1
✅ Firmware registrado: BATTERY v1.0.1
📄 version.json actualizado en /path/to/firmware/version.json
```

## Checklist de Testing

- [ ] ✅ Endpoint POST `/api/battery` responde correctamente
- [ ] ✅ Campo `updateAvailable` aparece en respuesta
- [ ] ✅ Registro de nueva versión funciona
- [ ] ✅ `version.json` se actualiza automáticamente
- [ ] ✅ Archivos `.bin` son accesibles vía HTTP
- [ ] ✅ Comparación de versiones funciona (1.0.0 < 1.0.1)
- [ ] ✅ Rollout gradual funciona correctamente
- [ ] ✅ Target devices funciona correctamente
- [ ] ✅ Deshabilitar versión funciona
- [ ] ✅ Logs aparecen correctamente en consola

## Troubleshooting

### Error: "version.json no encontrado"

```bash
# Crear manualmente
curl -X POST http://localhost:3120/api/ota/refresh-version-json \
  -H "Content-Type: application/json" \
  -d '{"password": "ebike2024"}'
```

### Error: "Firmware no encontrado"

Verificar que el archivo existe:
```bash
ls -la api/firmware/battery.bin
```

### Error: "updateAvailable no aparece en respuesta"

Verificar que se está enviando `firmwareVersion` en el POST:
```json
{
  "device": "eBikeBattery",
  "firmwareVersion": "1.0.0",  // <- Este campo es necesario
  "voltage": 37.45
}
```

## Monitoreo en Producción

### Verificar actualizaciones activas

```bash
# Ver últimas actualizaciones registradas
mongo bike_db --eval "db.firmwareversions.find().sort({createdAt:-1}).limit(5)"

# Ver dispositivos que reportaron
mongo bike_db --eval "db.bikedatas.find({}, {device:1, firmwareVersion:1, timestamp:1}).sort({timestamp:-1}).limit(10)"
```

### Estadísticas de actualización

```javascript
// Script para ver qué versiones tienen los dispositivos
db.bikedatas.aggregate([
  { $sort: { timestamp: -1 } },
  { $group: { 
      _id: "$device", 
      lastVersion: { $first: "$firmwareVersion" },
      lastSeen: { $first: "$timestamp" }
  }}
])
```
