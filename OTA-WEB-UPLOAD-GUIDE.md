# 🎉 Sistema de Actualización de Firmware OTA con Upload Web

## ✅ Implementación Completada

Se ha implementado exitosamente un sistema completo de actualización de firmware OTA con interfaz web de usuario, que incluye:

### 🚀 Características Implementadas

#### Backend (API)

1. **Endpoint de Upload de Firmware**
   - `POST /api/ota/upload` - Sube archivos .bin con versionado autoincremental
   - Validación de contraseña de administrador
   - Validación de tipo de archivo (.bin solamente)
   - Límite de 5MB por archivo
   - Calcula automáticamente MD5 y tamaño

2. **Endpoint de Próxima Versión**
   - `GET /api/ota/next-version?device=battery` - Obtiene la próxima versión autoincremental
   - Muestra versión actual y próxima versión

3. **Versionado Autoincremental**
   - Método `getNextVersion()` en `otaService.js`
   - Incrementa automáticamente el patch version (X.Y.Z+1)
   - Si no hay versión previa, empieza en 1.0.0
   - Ejemplo: 1.0.0 → 1.0.1 → 1.0.2 → 1.0.3...

4. **Procesamiento de Upload**
   - Método `uploadFirmware()` en `otaService.js`
   - Mueve el archivo a la ubicación correcta
   - Calcula metadata (tamaño, MD5)
   - Registra en base de datos
   - Actualiza `version.json` automáticamente

#### Frontend (Modal de Configuración)

1. **Nueva Sección "Actualización de Firmware (OTA)"**
   - Selector de tipo de dispositivo (Batería / Mainboard)
   - Muestra versión actual y próxima versión en tiempo real
   - Input para seleccionar archivo .bin
   - Indicador de tamaño de archivo
   - Textarea para notas de versión (changelog)
   - Botón de subir con indicador de progreso

2. **UX Mejorada**
   - Preview de versiones antes de subir
   - Validación de archivo (.bin solamente)
   - Feedback visual del proceso
   - Notificaciones toast de éxito/error
   - Limpieza automática del formulario tras subir

---

## 📋 Cómo Usar el Sistema

### Paso 1: Compilar el Firmware

Compila tu firmware ESP32 usando PlatformIO:

```bash
# Para batería (ESP32-C3)
pio run -e esp32c3

# Para mainboard (ESP32-S2)
pio run -e esp32s2
```

El archivo `.bin` se generará en `.pio/build/<env>/firmware.bin`

### Paso 2: Acceder al Modal de Configuración

1. Abre la aplicación web: `https://bike.xaviergalarreta.pro`
2. Haz clic en el botón de configuración (⚙️) en la esquina superior derecha
3. Desplázate hasta la sección **"Actualización de Firmware (OTA)"**

### Paso 3: Subir el Firmware

1. **Selecciona el tipo de dispositivo:**
   - 🔋 Batería (ESP32-C3)
   - ⚡ Mainboard (ESP32-S2)

2. **Verifica las versiones:**
   - La versión actual se muestra automáticamente
   - La próxima versión se calcula automáticamente (autoincremental)

3. **Selecciona el archivo:**
   - Haz clic en "Choose File" o arrastra el archivo `.bin`
   - Solo se aceptan archivos `.bin`
   - Tamaño máximo: 5MB
   - Se mostrará el tamaño del archivo

4. **Agrega notas de versión (opcional):**
   - Describe los cambios de esta actualización
   - Ejemplo: "Fix de bug en sensor de corriente, mejoras de rendimiento"

5. **Ingresa la contraseña:**
   - Si no está visible, haz clic en el botón "Guardar" primero
   - Ingresa la contraseña de administrador

6. **Sube el firmware:**
   - Haz clic en el botón "Subir Firmware vX.X.X"
   - Espera la confirmación
   - ¡Listo! El firmware está disponible para los dispositivos

### Paso 4: Verificación

El firmware estará disponible inmediatamente para los dispositivos ESP32:

1. **Versiones actualizadas:**
   ```bash
   curl https://bike.xaviergalarreta.pro/firmware/version.json
   ```

2. **Archivo accesible:**
   ```bash
   curl https://bike.xaviergalarreta.pro/firmware/battery.bin --output test.bin
   ```

3. **Los dispositivos ESP32 detectarán la actualización:**
   - Al conectar el cargador
   - Cada 2 minutos durante la carga
   - Cada 10 minutos en deep sleep

---

## 🔢 Versionado Autoincremental

### Cómo Funciona

El sistema utiliza **versionado semántico** (Semantic Versioning):

```
MAJOR.MINOR.PATCH
  1  .  0  .  0
```

- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nuevas funcionalidades compatibles
- **PATCH**: Correcciones de bugs

### Incremento Automático

El sistema **incrementa automáticamente el PATCH** (tercer número):

```
1.0.0 → 1.0.1 → 1.0.2 → 1.0.3 → 1.0.4
```

### Cambios Manuales

Si necesitas incrementar MAJOR o MINOR:

1. **Opción A: A través de la base de datos**
   ```javascript
   // Conectar a MongoDB
   db.firmwareversions.updateOne(
     { device: "BATTERY", version: "1.0.10" },
     { $set: { version: "2.0.0" } }
   )
   ```

2. **Opción B: Usando el script helper**
   ```bash
   node api/register-firmware.js battery 2.0.0 ./battery.bin "Major update"
   ```

3. **Siguiente subida web**: Continuará desde la nueva versión
   ```
   2.0.0 → 2.0.1 → 2.0.2...
   ```

### Primera Versión

Si no hay versiones previas en la base de datos, el sistema empieza en **1.0.0**

---

## 🛡️ Seguridad

### Validaciones Implementadas

1. **Autenticación**
   - Requiere contraseña de administrador
   - Configurada en variable de entorno `ADMIN_PASSWORD`
   - Por defecto: `ebike2024`

2. **Validación de Archivos**
   - Solo archivos `.bin`
   - Tamaño máximo: 5MB
   - Si falla la validación, el archivo se elimina automáticamente

3. **Validación de Dispositivo**
   - Solo acepta: `battery` o `mainboard`
   - Previene subidas a dispositivos incorrectos

4. **Manejo de Errores**
   - Si ocurre un error durante el upload, el archivo se elimina
   - Mensajes de error claros para el usuario

### Recomendaciones

1. **Cambia la contraseña por defecto:**
   ```bash
   # En .env
   ADMIN_PASSWORD=tu_password_super_seguro_aqui
   ```

2. **Usa HTTPS en producción:**
   - Ya configurado con nginx
   - Protege la contraseña durante la transmisión

3. **Prueba primero con rollout gradual:**
   - Después de subir, puedes modificar el rollout en la BD
   - Empieza con 10-20% de dispositivos

---

## 📊 Estructura de Archivos

### Backend

```
api/
├── index.js                    # ✅ Endpoints de upload agregados
├── services/
│   └── otaService.js          # ✅ Métodos getNextVersion() y uploadFirmware()
├── models/
│   └── firmwareVersion.js     # ✅ Ya existente (sin cambios)
└── firmware/
    ├── version.json           # ⚙️ Actualizado automáticamente
    ├── battery.bin            # 📦 Generado por upload
    ├── mainboard.bin          # 📦 Generado por upload
    └── README.md
```

### Frontend

```
bike-projecto/
└── components/
    ├── settings-modal.tsx     # ✅ Nueva sección OTA agregada
    └── ui/
        ├── select.tsx         # ✅ Ya existente
        └── textarea.tsx       # ✅ Ya existente
```

---

## 🧪 Testing

### Test 1: Obtener Próxima Versión

```bash
curl "http://localhost:3120/api/ota/next-version?device=battery"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "currentVersion": "1.0.2",
  "nextVersion": "1.0.3"
}
```

### Test 2: Upload de Firmware

```bash
curl -X POST http://localhost:3120/api/ota/upload \
  -F "firmware=@battery.bin" \
  -F "device=battery" \
  -F "password=ebike2024" \
  -F "changelog=Fix de bug en sensor"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Firmware subido y registrado exitosamente",
  "data": {
    "version": "1.0.3",
    "device": "BATTERY",
    "size": 856320,
    "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4",
    "changelog": "Fix de bug en sensor"
  }
}
```

### Test 3: Verificar en version.json

```bash
curl http://localhost:3120/firmware/version.json
```

**Debe mostrar la nueva versión:**
```json
{
  "battery": {
    "version": "1.0.3",
    "device": "BATTERY",
    "filename": "battery.bin",
    "size": 856320,
    "md5": "a3f5c8d1e9b2f4a6c8e1d3f5a7b9c2e4",
    "date": "2026-03-18",
    "changelog": "Fix de bug en sensor"
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Solo se permiten archivos .bin"

**Causa:** El archivo no tiene extensión `.bin`

**Solución:** Verifica que el archivo compilado tenga extensión `.bin`

### Error: "Contraseña incorrecta"

**Causa:** La contraseña ingresada no coincide

**Solución:** 
1. Verifica la variable `ADMIN_PASSWORD` en `.env`
2. Por defecto es: `ebike2024`

### Error: "Tipo de dispositivo inválido"

**Causa:** El tipo de dispositivo no es válido

**Solución:** Solo son válidos: `battery` o `mainboard`

### El archivo no se sube (sin error)

**Causa:** El archivo es muy grande (>5MB)

**Solución:** Optimiza el firmware o aumenta el límite en `index.js`:
```javascript
limits: {
  fileSize: 10 * 1024 * 1024 // 10MB
}
```

### La versión no se incrementa

**Causa:** Puede haber un error en la BD

**Solución:** Verifica las versiones en MongoDB:
```bash
mongo bike_db --eval "db.firmwareversions.find({device:'BATTERY'}).sort({createdAt:-1}).limit(1)"
```

---

## 📝 Ejemplo Completo de Uso

### Escenario: Actualizar firmware de batería

1. **Compilar firmware:**
   ```bash
   cd esp32-battery-project
   pio run -e esp32c3
   # Archivo generado: .pio/build/esp32c3/firmware.bin
   ```

2. **Abrir app web:**
   - Ir a `https://bike.xaviergalarreta.pro`
   - Click en ⚙️ (Settings)

3. **En la sección OTA:**
   - Dispositivo: **Batería (ESP32-C3)**
   - Versión actual: `1.0.5`
   - Próxima versión: `1.0.6` (autoincremental)

4. **Seleccionar archivo:**
   - Click en "Choose File"
   - Seleccionar `.pio/build/esp32c3/firmware.bin`
   - Tamaño mostrado: `852.3 KB`

5. **Agregar changelog:**
   ```
   - Fix crítico en calibración de sensor de corriente
   - Optimización de consumo en deep sleep
   - Mejora en detección de cargador
   ```

6. **Ingresar contraseña:**
   - Click en "Guardar" (si no está visible el campo de password)
   - Ingresar: `ebike2024`

7. **Subir:**
   - Click en "Subir Firmware v1.0.6"
   - Esperar notificación de éxito ✅

8. **Verificación:**
   - La versión actual cambia a: `1.0.6`
   - La próxima versión cambia a: `1.0.7`
   - El formulario se limpia automáticamente

9. **Los dispositivos ESP32:**
   - Detectarán la actualización automáticamente
   - Descargarán e instalarán v1.0.6
   - Reiniciarán con la nueva versión

---

## 🎯 Ventajas del Sistema

### ✅ Sin Línea de Comandos

- No necesitas usar terminal o scripts
- Todo desde la interfaz web
- Amigable para usuarios no técnicos

### ✅ Versionado Automático

- No necesitas recordar la última versión
- El sistema calcula automáticamente
- Evita errores de versionado manual

### ✅ Validación Automática

- Verifica extensión del archivo
- Calcula MD5 automáticamente
- Valida tamaño del archivo

### ✅ Feedback Inmediato

- Preview de próxima versión antes de subir
- Notificaciones de éxito/error
- Actualización en tiempo real

### ✅ Seguro

- Requiere autenticación
- Validaciones robustas
- Limpieza automática en errores

---

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│  1. Usuario compila firmware ESP32                          │
│     pio run -e esp32c3                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Usuario abre modal de configuración en web              │
│     https://bike.xaviergalarreta.pro                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Sistema muestra versión actual y próxima (autoincr.)    │
│     Actual: 1.0.5  →  Próxima: 1.0.6                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Usuario selecciona archivo .bin y changelog             │
│     battery.bin (852 KB) + "Fix de sensor"                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Usuario sube con contraseña                             │
│     POST /api/ota/upload + password                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Backend procesa:                                         │
│     - Calcula MD5                                           │
│     - Mueve a /firmware/battery.bin                         │
│     - Registra en MongoDB con v1.0.6                        │
│     - Actualiza version.json                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. ESP32 detecta actualización                             │
│     Descarga /firmware/battery.bin                          │
│     Instala y reinicia                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  8. ESP32 reporta nueva versión                             │
│     POST /api/battery {"firmwareVersion": "1.0.6"}         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎉 ¡Sistema Listo para Usar!

El sistema de actualización OTA con upload web está completamente funcional y listo para usar en producción.

**Características principales:**
- ✅ Upload desde interfaz web
- ✅ Versionado autoincremental
- ✅ Validaciones de seguridad
- ✅ Feedback visual
- ✅ Proceso automatizado

**Próximos pasos opcionales:**
- 📊 Dashboard de versiones activas por dispositivo
- 📈 Estadísticas de actualizaciones
- 🎯 Control avanzado de rollout desde UI
- 📋 Historial de versiones en el modal

---

**Documentación creada:** 18 de marzo de 2026  
**Sistema:** Bike Project OTA Updates  
**Versión del sistema:** 2.0.0
