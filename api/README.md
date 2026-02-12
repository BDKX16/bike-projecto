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
  "timestamp": 123456789
}
```

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
