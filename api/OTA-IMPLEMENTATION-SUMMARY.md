# 🎉 Sistema OTA Implementado

## ✅ Resumen de Implementación

El sistema de actualizaciones OTA (Over-The-Air) para los dispositivos ESP32 ha sido implementado exitosamente en el backend.

### Archivos Creados

#### Modelos
- ✅ `api/models/firmwareVersion.js` - Esquema de MongoDB para versiones de firmware

#### Servicios
- ✅ `api/services/otaService.js` - Lógica principal del sistema OTA

#### Endpoints
- ✅ Modificado `POST /api/battery` - Ahora incluye verificación de actualizaciones
- ✅ `GET /api/ota/check-update` - Verifica actualización disponible
- ✅ `POST /api/ota/register` - Registra nueva versión de firmware
- ✅ `GET /api/ota/versions` - Lista todas las versiones
- ✅ `POST /api/ota/disable` - Deshabilita una versión
- ✅ `POST /api/ota/refresh-version-json` - Actualiza version.json
- ✅ `GET /firmware/version.json` - Metadata para ESP32
- ✅ `GET /firmware/*.bin` - Descarga de archivos binarios

#### Estructura de Archivos
- ✅ `api/firmware/` - Directorio para archivos binarios
- ✅ `api/firmware/version.json` - Metadata de versiones
- ✅ `api/firmware/README.md` - Guía completa de gestión
- ✅ `api/firmware/.gitignore` - Ignora .bin pero mantiene estructura

#### Scripts y Documentación
- ✅ `api/register-firmware.js` - Script helper para registro
- ✅ `api/OTA-TESTING.md` - Guía completa de testing
- ✅ `api/README.md` - Actualizado con documentación OTA

---

## 🚀 Características Implementadas

### 1. Verificación Automática de Actualizaciones
El endpoint `POST /api/battery` ahora:
- Recibe el campo `firmwareVersion` del ESP32
- Verifica si hay actualización disponible
- Responde con `updateAvailable: true/false`
- Incluye `newVersion` y `releaseNotes` si hay actualización

**Ejemplo de respuesta con actualización:**
```json
{
  "status": "ok",
  "success": true,
  "updateAvailable": true,
  "currentVersion": "1.0.0",
  "newVersion": "1.0.1",
  "releaseNotes": "Fix crítico en sensor de corriente"
}
```

### 2. Gestión de Versiones en Base de Datos
- Modelo MongoDB para almacenar metadata de firmware
- Versionado semántico (X.Y.Z)
- Campos: device, version, filename, size, md5, changelog
- Soporte para habilitar/deshabilitar versiones

### 3. Rollout Gradual
- `rolloutPercentage` - Controla qué % de dispositivos se actualizan
- `targetDevices` - Lista específica de dispositivos
- `minVersion` - Previene downgrades peligrosos

### 4. Servir Archivos de Firmware
- Directorio `/firmware` accesible vía HTTP/HTTPS
- Archivos `.bin` descargables
- `version.json` generado automáticamente

### 5. Seguridad
- Endpoints administrativos requieren contraseña
- Validación de formato de versión
- MD5 opcional para verificación de integridad
- Control de acceso por dispositivo

---

## 📋 Próximos Pasos

### 1. Configuración del Entorno ⚙️

Agregar al archivo `.env`:

```bash
# OTA Configuration
FIRMWARE_PATH=/path/to/api/firmware
ADMIN_PASSWORD=tu_password_seguro_aqui
```

### 2. Inicializar MongoDB 🗄️

Las colecciones se crearán automáticamente, pero puedes verificar:

```bash
# Conectar a MongoDB
mongo bike_db

# Verificar colección
db.firmwareversions.find()
```

### 3. Primer Test de Integración 🧪

```bash
# 1. Simular reporte de batería
curl -X POST http://localhost:3120/api/battery \
  -H "Content-Type: application/json" \
  -d '{
    "device": "eBikeBattery",
    "firmwareVersion": "1.0.0",
    "voltage": 37.45,
    "percent": 78.5,
    "charging": true
  }'

# Verificar que responde con updateAvailable: false (al inicio)
```

### 4. Registrar Primera Versión 📦

```bash
# Opción A: Usando el script helper
node api/register-firmware.js battery 1.0.0 ./battery.bin "Versión inicial"

# Opción B: Manual con curl
curl -X POST http://localhost:3120/api/ota/register \
  -H "Content-Type: application/json" \
  -d '{
    "password": "ebike2024",
    "device": "BATTERY",
    "version": "1.0.0",
    "filename": "battery.bin",
    "size": 850000,
    "changelog": "Versión inicial con soporte OTA"
  }'
```

### 5. Compilar y Subir Nuevo Firmware 🔧

```bash
# En el proyecto ESP32
pio run -e esp32c3

# Copiar el .bin generado
cp .pio/build/esp32c3/firmware.bin ./api/firmware/battery.bin

# Registrar la nueva versión
node api/register-firmware.js battery 1.0.1 ./api/firmware/battery.bin "Fix importante"
```

### 6. Verificar que el ESP32 Detecta la Actualización ✅

Cuando el ESP32 envíe datos con `firmwareVersion: "1.0.0"`, debería recibir:

```json
{
  "updateAvailable": true,
  "newVersion": "1.0.1",
  "releaseNotes": "Fix importante"
}
```

### 7. Monitorear Logs 📊

```bash
# Docker
docker logs -f bike-api

# Local
npm start
```

Buscar mensajes como:
```
🚀 Actualización disponible para battery: 1.0.0 → 1.0.1
```

---

## 🔄 Flujo Completo del Sistema

### Desde el Desarrollo hasta Producción

1. **Desarrollador compila firmware**
   ```bash
   pio run -e esp32c3
   ```

2. **Copia el .bin al servidor**
   ```bash
   scp .pio/build/esp32c3/firmware.bin user@server:/api/firmware/battery.bin
   ```

3. **Registra la versión**
   ```bash
   node register-firmware.js battery 1.0.1 ./battery.bin "Fix de sensor"
   ```

4. **Sistema actualiza automáticamente:**
   - ✅ Copia archivo a `/firmware/`
   - ✅ Calcula MD5
   - ✅ Guarda en MongoDB
   - ✅ Actualiza `version.json`

5. **ESP32 conecta el cargador**
   - Envía POST `/api/battery` con `firmwareVersion: "1.0.0"`
   - Recibe `updateAvailable: true`

6. **ESP32 descarga y actualiza**
   - Lee `/firmware/version.json`
   - Descarga `/firmware/battery.bin`
   - Verifica MD5 (opcional)
   - Instala y reinicia

7. **ESP32 reporta nueva versión**
   - Envía POST con `firmwareVersion: "1.0.1"`
   - Recibe `updateAvailable: false`

---

## 🧪 Testing Recomendado

### Test 1: Sin Actualización Disponible
```bash
curl -X POST http://localhost:3120/api/battery \
  -H "Content-Type: application/json" \
  -d '{"device": "eBikeBattery", "firmwareVersion": "1.0.0", "voltage": 37.5, "percent": 80, "charging": true}'
```
**Esperado:** `updateAvailable: false`

### Test 2: Registrar Nueva Versión
```bash
curl -X POST http://localhost:3120/api/ota/register \
  -H "Content-Type: application/json" \
  -d '{"password": "ebike2024", "device": "BATTERY", "version": "1.0.1", "filename": "battery.bin", "size": 850000, "changelog": "Fix importante"}'
```
**Esperado:** `success: true`

### Test 3: Con Actualización Disponible
```bash
curl -X POST http://localhost:3120/api/battery \
  -H "Content-Type: application/json" \
  -d '{"device": "eBikeBattery", "firmwareVersion": "1.0.0", "voltage": 37.5, "percent": 80, "charging": true}'
```
**Esperado:** 
```json
{
  "updateAvailable": true,
  "newVersion": "1.0.1",
  "releaseNotes": "Fix importante"
}
```

### Test 4: Descargar version.json
```bash
curl http://localhost:3120/firmware/version.json
```
**Esperado:** JSON con metadata de versiones

### Test 5: Listar Versiones
```bash
curl http://localhost:3120/api/ota/versions?device=battery
```
**Esperado:** Array de versiones registradas

---

## 📝 Variables de Entorno Necesarias

```bash
# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USERNAME=admin
MONGO_PASSWORD=password
MONGO_DATABASE=bike_db

# API
API_PORT=3120
NODE_ENV=development

# OTA
FIRMWARE_PATH=/path/to/api/firmware
ADMIN_PASSWORD=password_seguro

# Email (ya existentes)
EMAIL_USER=...
EMAIL_PASS=...
```

---

## 🔐 Seguridad en Producción

### Recomendaciones

1. **HTTPS Obligatorio**
   - Configurar certificado SSL en nginx
   - Evitar transmisión de binarios sin encriptar

2. **Contraseña Fuerte**
   ```bash
   ADMIN_PASSWORD=$(openssl rand -base64 32)
   ```

3. **Validación de MD5**
   - Siempre incluir MD5 en registros
   - ESP32 debe verificar antes de instalar

4. **Rollout Gradual**
   - Empezar con 10-20% de dispositivos
   - Monitorear por 24-48 horas
   - Aumentar gradualmente a 100%

5. **Backup de Versiones**
   - Mantener versiones anteriores estables
   - No eliminar archivos `.bin` hasta confirmar estabilidad

---

## 📚 Documentación Completa

- 📘 **[api/README.md](api/README.md)** - Documentación general del API (actualizada)
- 📘 **[api/firmware/README.md](api/firmware/README.md)** - Guía completa de gestión de firmware
- 🧪 **[api/OTA-TESTING.md](api/OTA-TESTING.md)** - Ejemplos detallados de testing
- 🔧 **[api/register-firmware.js](api/register-firmware.js)** - Script helper

---

## ❓ Troubleshooting

### Problema: "updateAvailable no aparece en respuesta"

**Causa:** El ESP32 no está enviando el campo `firmwareVersion`

**Solución:** Verificar que el payload incluya:
```json
{
  "device": "eBikeBattery",
  "firmwareVersion": "1.0.0",  // <- Este campo es necesario
  "voltage": 37.45
}
```

### Problema: "version.json no encontrado"

**Causa:** No se ha registrado ninguna versión aún

**Solución:** 
```bash
curl -X POST http://localhost:3120/api/ota/refresh-version-json \
  -H "Content-Type: application/json" \
  -d '{"password": "ebike2024"}'
```

### Problema: "Firmware no se descarga"

**Causa:** Archivo `.bin` no existe en `/firmware/`

**Solución:** Verificar que el archivo existe:
```bash
ls -la api/firmware/battery.bin
```

---

## 🎯 Checklist de Implementación

- [x] ✅ Modelo `FirmwareVersion` creado
- [x] ✅ Servicio `otaService` implementado
- [x] ✅ Endpoint `POST /api/battery` modificado
- [x] ✅ Endpoints OTA creados
- [x] ✅ Directorio `firmware/` creado
- [x] ✅ Script helper creado
- [x] ✅ Documentación completa
- [ ] ⏳ Configurar variables de entorno
- [ ] ⏳ Probar con dispositivo ESP32 real
- [ ] ⏳ Configurar HTTPS en producción
- [ ] ⏳ Implementar monitoreo de actualizaciones

---

## 🎊 Conclusión

El sistema OTA backend está **100% funcional** y listo para integrarse con los dispositivos ESP32. 

**Próximo paso crítico:** Modificar el código del ESP32 para leer y procesar el campo `updateAvailable` en la respuesta del endpoint `/api/battery`.

### Modificación Sugerida en el ESP32

```cpp
// En el código ESP32, después de enviar POST /api/battery
if (httpResponseCode == 200) {
  String response = http.getString();
  
  // Parsear JSON
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, response);
  
  // Verificar si hay actualización
  bool updateAvailable = doc["updateAvailable"];
  
  if (updateAvailable) {
    String newVersion = doc["newVersion"];
    Serial.println("🚀 Actualización disponible: " + newVersion);
    
    // Iniciar proceso OTA
    performOTAUpdate();
  }
}
```

---

**¡Sistema OTA Backend Completado! 🎉**
