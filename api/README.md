# Bike Projecto API

API simple para recopilar y consultar datos de telemetría de la bicicleta eléctrica con sistema de alertas automáticas.

## Características

- ✅ Almacenamiento de datos de telemetría en MongoDB
- ✅ Análisis automático del estado de la batería 10s3p
- ✅ Alertas por email para estados críticos (con throttling inteligente)
- ✅ Notificación única al completar carga al 100%
- ✅ Recomendaciones personalizadas de mantenimiento
- ✅ Prevención de spam de emails

## Endpoints

### POST /api/battery
Guarda datos de telemetría de la bicicleta enviados desde el ESP32.
**Analiza automáticamente el estado y envía alertas por email si detecta condiciones críticas.**

**Body:**
```json
{
  "device": "eBikeBattery",
  "name": "Hover 10s2p",
  "voltage": 38.45,
  "current": 2.134,
  "percent": 75.3,
  "remainingAh": 3.01,
  "consumedAh": 0.99,
  "cycles": 15,
  "maxCycles": 100,
  "charging": false,
  "gpioVoltage": 2.85,
  "timestamp": 123456789
}
```

**Nota:** El campo `gpioVoltage` es opcional y se usa para debug del voltaje raw del GPIO del ESP32.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "device": "eBikeBattery",
    "name": "Hover 10s2p",
    "voltage": 38.45,
    "current": 2.134,
    "percent": 75.3,
    "remainingAh": 3.01,
    "consumedAh": 0.99,
    "cycles": 15,
    "maxCycles": 100,
    "charging": false,
    "gpioVoltage": 2.85,
    "espTimestamp": 123456789,
    "timestamp": "2026-02-12T10:30:00.000Z"
  },
  "alerts": [
    {
      "level": "ADVERTENCIA",
      "issue": "Batería baja",
      "detail": "75.3% restante",
      "action": "Planifica una recarga pronto..."
    }
  ]
}
```

**Condiciones de Alerta:**
- 🚨 **CRÍTICO**: Voltaje < 32V, Porcentaje < 15%, Sobrevoltaje > 42V
- ⚠️ **URGENTE**: Voltaje < 34V, Capacidad < 0.5Ah
- ⚡ **ADVERTENCIA**: Porcentaje < 25%, Corriente > 15A, Ciclos > 90%

### GET /api/bike-data/latest
Obtiene el último registro guardado.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "device": "eBikeBattery",
    "name": "Hover 10s2p",
    "voltage": 38.45,
    "current": 2.134,
    "percent": 75.3,
    "remainingAh": 3.01,
    "consumedAh": 0.99,
    "cycles": 15,
    "maxCycles": 100,
    "charging": false,
    "espTimestamp": 123456789,
    "timestamp": "2026-02-12T10:30:00.000Z"
  }
}
```

### GET /api/bike-data/history
Obtiene el historial de registros de telemetría.

**Query Parameters:**
- `hours` (opcional): Número de horas hacia atrás. Por defecto: 24
- `limit` (opcional): Máximo número de registros. Por defecto: 1000

**Ejemplo:**
```
GET /api/bike-data/history?hours=24&limit=500
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "device": "eBikeBattery",
      "voltage": 38.45,
      "percent": 75.3,
      "charging": false,
      "timestamp": "2026-02-12T10:00:00.000Z"
    },
    {
      "_id": "...",
      "device": "eBikeBattery",
      "voltage": 38.52,
      "percent": 76.1,
      "charging": false,
      "timestamp": "2026-02-12T10:30:00.000Z"
    }
  ],
  "count": 2,
  "range": {
    "from": "2026-02-11T10:00:00.000Z",
    "to": "2026-02-12T10:30:00.000Z"
  }
}
```

### GET /api/settings
Obtiene la configuración actual de notificaciones y alertas.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "emailNotifications": {
      "enabled": true,
      "email": "usuario@example.com",
      "highBatteryAlert": {
        "enabled": true,
        "threshold": 80
      },
      "lowBatteryAlert": {
        "enabled": true,
        "threshold": 20
      },
      "criticalBatteryAlert": {
        "enabled": true,
        "threshold": 10
      },
      "chargeCompleteAlert": {
        "enabled": true
      },
      "chargeStartedAlert": {
        "enabled": false
      }
    }
  }
}
```

### POST /api/settings
Actualiza la configuración de notificaciones. **Requiere contraseña de administrador.**

**Body:**
```json
{
  "password": "ebike2024",
  "settings": {
    "emailNotifications": {
      "enabled": true,
      "email": "nuevo@example.com",
      "highBatteryAlert": {
        "enabled": true,
        "threshold": 80
      },
      "lowBatteryAlert": {
        "enabled": true,
        "threshold": 20
      }
    }
  }
}
```

---

## 🔄 Sistema OTA (Over-The-Air Updates)

El sistema incluye actualizaciones OTA automáticas para los dispositivos ESP32.

### Características OTA

- ✅ Verificación automática de actualizaciones al conectar el cargador
- ✅ Notificación en respuesta del endpoint `/api/battery`
- ✅ Gestión de versiones en base de datos
- ✅ Rollout gradual (porcentaje de dispositivos)
- ✅ Target específico de dispositivos
- ✅ Generación automática de `version.json`
- ✅ Servir archivos `.bin` vía HTTP/HTTPS

### Flujo de Actualización

1. **ESP32 reporta datos** → POST `/api/battery` con `firmwareVersion`
2. **Servidor verifica** → Compara con última versión disponible
3. **Respuesta incluye**:
   ```json
   {
     "status": "ok",
     "updateAvailable": true,
     "currentVersion": "1.0.0",
     "newVersion": "1.0.1",
     "releaseNotes": "Fix crítico en sensor de corriente"
   }
   ```
4. **ESP32 descarga** → GET `/firmware/battery.bin`
5. **ESP32 instala y reinicia**

### Endpoints OTA

#### GET /api/ota/check-update
Verifica si hay actualización disponible (alternativa al POST /api/battery).

**Query Parameters:**
- `device`: Tipo de dispositivo (battery/mainboard)
- `version`: Versión actual del firmware
- `deviceId`: ID del dispositivo (opcional)

**Ejemplo:**
```
GET /api/ota/check-update?device=battery&version=1.0.0&deviceId=eBikeBattery
```

**Respuesta:**
```json
{
  "success": true,
  "updateAvailable": true,
  "currentVersion": "1.0.0",
  "newVersion": "1.0.1",
  "releaseNotes": "Fix crítico en calibración del sensor",
  "size": 856320,
  "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4"
}
```

#### POST /api/ota/register
Registra una nueva versión de firmware. **Requiere contraseña de administrador.**

**Body:**
```json
{
  "password": "ebike2024",
  "device": "BATTERY",
  "version": "1.0.1",
  "filename": "battery.bin",
  "size": 856320,
  "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4",
  "changelog": "Fix crítico en calibración del sensor de corriente",
  "enabled": true,
  "rolloutPercentage": 100,
  "targetDevices": [],
  "minVersion": "1.0.0"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Firmware registrado exitosamente",
  "data": {
    "_id": "65f8a9b7c8d1e9f2a3b4c5d6",
    "device": "BATTERY",
    "version": "1.0.1",
    "enabled": true
  }
}
```

#### GET /api/ota/versions
Lista todas las versiones de firmware registradas.

**Query Parameters:**
- `device` (opcional): Filtrar por tipo de dispositivo

**Ejemplo:**
```
GET /api/ota/versions?device=battery
```

**Respuesta:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "...",
      "device": "BATTERY",
      "version": "1.0.1",
      "filename": "battery.bin",
      "enabled": true,
      "releaseDate": "2026-03-18T10:30:00.000Z"
    },
    {
      "_id": "...",
      "device": "BATTERY",
      "version": "1.0.0",
      "filename": "battery.bin",
      "enabled": false,
      "releaseDate": "2026-03-15T10:30:00.000Z"
    }
  ]
}
```

#### POST /api/ota/disable
Deshabilita una versión de firmware. **Requiere contraseña de administrador.**

**Body:**
```json
{
  "password": "ebike2024",
  "device": "BATTERY",
  "version": "1.0.0"
}
```

#### GET /firmware/version.json
Obtiene metadata de las versiones disponibles (usado por ESP32).

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
    "changelog": "Fix crítico en calibración"
  },
  "mainboard": {
    "version": "1.0.0",
    "device": "MAINBOARD",
    "filename": "mainboard.bin",
    "size": 1024768,
    "md5": "...",
    "date": "2026-03-15",
    "changelog": "Versión inicial"
  }
}
```

#### GET /firmware/{filename}
Descarga el archivo binario de firmware.

**Ejemplos:**
- `GET /firmware/battery.bin`
- `GET /firmware/mainboard.bin`

### Script Helper para Registro de Firmware

Usa el script `register-firmware.js` para simplificar el proceso:

```bash
node register-firmware.js battery 1.0.1 ./battery.bin "Fix de sensor de corriente"
```

El script automáticamente:
- Calcula MD5
- Obtiene tamaño del archivo
- Copia el archivo a `firmware/`
- Registra en la base de datos
- Actualiza `version.json`

### Rollout Gradual

Controla el despliegue de actualizaciones:

```json
{
  "rolloutPercentage": 50,  // Solo 50% de los dispositivos se actualizarán
  "targetDevices": ["eBikeBattery_01", "eBikeBattery_02"]  // Solo estos dispositivos
}
```

### Documentación Adicional

- 📘 **[firmware/README.md](firmware/README.md)** - Guía completa de gestión de firmware
- 🧪 **[OTA-TESTING.md](OTA-TESTING.md)** - Ejemplos de testing con curl/Postman
- 🔧 **[register-firmware.js](register-firmware.js)** - Script helper para registrar firmware

---

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Configuración guardada exitosamente"
}
```

**Respuesta con contraseña incorrecta:**
```json
{
  "success": false,
  "error": "Contraseña incorrecta"
}
```

### GET /health
Health check del servidor.

## Instalación

1. Copia `.env.example` a `.env` y configura las variables
2. Instala dependencias: `npm install`
3. Inicia el servidor: `npm start` o `npm run dev` (con nodemon)

## Pruebas

Para probar el sistema sin el ESP32:

**1. Test completo de alertas:**
```bash
node test-alerts.js
```
Envía diferentes escenarios (batería baja, voltaje crítico, carga, etc.)

**2. Test de carga completa:**
```bash
node test-charge-complete.js
```
Simula una secuencia de carga del 70% al 100% y verifica que solo envíe UN email al completar.

**3. Test de throttling:**
```bash
node test-throttling.js
```
Envía la misma alerta CRÍTICA 3 veces consecutivas y verifica que solo envíe UN email (las otras están en cooldown).

**4. Test de gpioVoltage:**
```bash
node test-gpio-voltage.js
```
Verifica que el campo `gpioVoltage` (para debug) se persista correctamente en MongoDB.
```bash
node test-throttling.js
```
Envía la misma alerta CRÍTICA 3 veces consecutivas y verifica que solo envíe UN email (las otras están en cooldown).

## Variables de Entorno

Ver archivo `.env.example` para las variables necesarias.

### Configuración de Email (Gmail)

Para que funcionen las alertas por email:

1. Usa una cuenta de Gmail
2. Activa la verificación en 2 pasos
3. Genera una **contraseña de aplicación**:
   - Ve a: https://myaccount.google.com/apppasswords
   - Genera una contraseña para "Correo"
   - Usa esa contraseña en `EMAIL_PASSWORD`

```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # App password de Gmail
ALERT_EMAIL=xgalarreta.dev@gmail.com
```

## Sistema de Alertas

La API analiza automáticamente cada lectura y envía emails cuando detecta:

**Estados Críticos:**
- Voltaje < 32V (riesgo de daño permanente)
- Batería < 15%
- Sobrevoltaje > 42V

**Estados Urgentes:**
- Voltaje < 34V
- Capacidad restante < 0.5Ah

**Advertencias:**
- Batería < 25%
- Corriente alta > 15A
- Ciclos de vida > 90%

**Carga Completa:**
- Email único cuando la batería alcanza 100% (solo la primera vez)

### Throttling Inteligente

Para evitar spam, el sistema implementa cooldowns automáticos:
- **CRÍTICO**: 2 horas entre alertas
- **URGENTE**: 4 horas entre alertas  
- **ADVERTENCIA**: 12 horas entre alertas
- **Carga completa**: 24 horas entre alertas

Si envías múltiples lecturas con el mismo problema, solo recibirás un email por período de cooldown.

### Soporte para Carga

Cuando `charging: true`, el ESP32 puede enviar datos simplificados:
```json
{
  "device": "eBikeBattery",
  "voltage": 41.8,
  "current": -2.5,
  "percent": 85.3,
  "charging": true,
  "cycles": 15,
  "timestamp": 123456789
}
```

Durante la carga no se analizan alertas de batería baja, solo se detecta:
- Sobrevoltaje (> 42V)
- Carga completa (100%)

Cada email incluye recomendaciones específicas para cuidar la batería de litio 10s3p.

## Sistema de Configuración

La API incluye un sistema de configuración persistente en MongoDB que permite personalizar las notificaciones desde el frontend.

### Características de Configuración:

**Notificaciones por Email:**
- ✅ Activar/desactivar todas las notificaciones
- ✅ Configurar email de destino
- ✅ Alerta de batería alta (al cargar): personalizar umbral (ej: 80%)
- ✅ Alerta de batería baja: personalizar umbral (ej: 20%)
- ✅ Alerta de batería crítica: personalizar umbral (ej: 10%)
- ✅ Alerta de carga completa: activar/desactivar
- 🔜 Alerta de inicio de carga (próximamente)
- 🔜 Alerta de temperatura (próximamente)

### Seguridad:

El sistema requiere autenticación para modificar la configuración:
- Los cambios solo se guardan si se proporciona la contraseña correcta
- La contraseña se configura en `ADMIN_PASSWORD` en el archivo `.env`
- Por defecto: `ebike2024` (se recomienda cambiarla)

### Desde el Frontend:

Los usuarios pueden acceder al modal de configuración haciendo clic en el ícono de engranaje ⚙️ en la esquina superior derecha del dashboard.

### Configuración Automática:

- Si no hay configuración guardada, se crea automáticamente con valores por defecto
- La configuración se sincroniza con cada lectura de batería
- Las alertas personalizadas (80% alto, 20% bajo) se envían solo cuando se cruza el umbral
