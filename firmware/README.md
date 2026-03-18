# Directorio de Firmware OTA

Este directorio contiene los archivos binarios de firmware para actualizaciones OTA de los dispositivos eBike.

## 📍 Ubicación

- **Desarrollo**: `E:\ProyectosVisual\bike-projecto\api\firmware`
- **Producción**: `E:\ProyectosVisual\bike-projecto\firmware` (raíz del proyecto)

En producción (Docker), este directorio se monta como volumen:
```yaml
volumes:
  - ./firmware:/app/firmware
```

## 📦 Estructura

```
firmware/
├── version.json          # Metadata de versiones disponibles
├── battery.bin          # Firmware para ESP32-C3 (batería)
├── mainboard.bin        # Firmware para ESP32-S2 (mainboard)
├── .gitignore           # Ignora .bin pero mantiene estructura
└── README.md            # Este archivo
```

## 🌐 URLs de Acceso

### Desarrollo
- `http://localhost:3120/firmware/version.json`
- `http://localhost:3120/firmware/battery.bin`
- `http://localhost:3120/firmware/mainboard.bin`

### Producción
- `https://bike.xaviergalarreta.pro/firmware/version.json`
- `https://bike.xaviergalarreta.pro/firmware/battery.bin`
- `https://bike.xaviergalarreta.pro/firmware/mainboard.bin`

## 📤 Subir Firmware

### Desde la Interfaz Web (Recomendado)

1. Abre `https://bike.xaviergalarreta.pro`
2. Click en ⚙️ (Configuración)
3. Scroll hasta "Actualización de Firmware (OTA)"
4. Selecciona dispositivo, archivo .bin y changelog
5. Ingresa contraseña y sube

El sistema automáticamente:
- ✅ Calcula versión autoincremental
- ✅ Calcula MD5 del archivo
- ✅ Guarda en este directorio
- ✅ Registra en MongoDB
- ✅ Actualiza version.json

### Desde la Línea de Comandos

```bash
# Opción 1: Script helper (desde api/)
cd api
node register-firmware.js battery 1.0.1 ./path/to/battery.bin "Fix importante"

# Opción 2: curl directo
curl -X POST http://localhost:3120/api/ota/upload \
  -F "firmware=@battery.bin" \
  -F "device=battery" \
  -F "password=ebike2024" \
  -F "changelog=Fix de sensor"
```

## 🐳 Docker - Volúmenes Persistentes

Los archivos en este directorio **persisten entre reinicios** del contenedor porque está montado como volumen:

```bash
# Ver archivos desde el host
ls -la ./firmware/

# Ver archivos desde el contenedor
docker exec bike-api ls -la /app/firmware/

# Verificar volumen
docker inspect bike-api | grep firmware
```

## 🔐 Permisos (Producción Linux)

Si tienes problemas de permisos en producción:

```bash
# Desde el host
sudo chown -R 1000:1000 ./firmware
sudo chmod -R 755 ./firmware

# Los archivos .bin deben ser legibles
sudo chmod 644 ./firmware/*.bin
```

## 📊 Verificar Archivos

```bash
# Listar archivos
ls -lh firmware/

# Ver version.json
cat firmware/version.json

# Calcular MD5 de un archivo
md5sum firmware/battery.bin

# Ver tamaño
du -h firmware/battery.bin
```

## 🧹 Limpieza

Para limpiar archivos antiguos (manualmente):

```bash
# Backup antes de eliminar
cp firmware/battery.bin firmware/battery.bin.backup

# Eliminar archivos .bin (no version.json)
rm firmware/*.bin

# Nota: version.json se regenera automáticamente
# al subir un nuevo firmware desde la web
```

## ⚠️ Importante

- **No versionar archivos .bin**: El `.gitignore` previene esto
- **version.json sí se versiona**: Contiene metadata, no binarios
- **Backup recomendado**: Mantén backups de versiones estables
- **Espacio en disco**: Cada firmware ocupa ~800KB-1.5MB

## 🔄 Actualización desde ESP32

Cuando un ESP32 detecta actualización disponible:

1. Lee `/firmware/version.json`
2. Compara con su versión actual
3. Descarga `/firmware/battery.bin` (o mainboard.bin)
4. Verifica MD5 (opcional)
5. Instala y reinicia
6. Reporta nueva versión al servidor

## 📋 Checklist de Producción

- [x] Directorio creado en la raíz del proyecto
- [x] Volumen montado en `docker-compose.yml`
- [x] Variable `FIRMWARE_PATH=/app/firmware` configurada
- [x] `.gitignore` previene subir archivos .bin
- [x] `version.json` inicial creado
- [ ] Permisos correctos en Linux (755 para directorio, 644 para archivos)
- [ ] Backup configurado para versiones estables
- [ ] Nginx configurado para servir archivos estáticos

## 🌐 Nginx (Opcional - Si usas proxy reverso)

Si usas nginx como proxy, asegúrate de permitir archivos grandes:

```nginx
location /firmware {
    proxy_pass http://localhost:3120;
    
    # Permitir archivos grandes
    client_max_body_size 10M;
    
    # Timeouts largos para uploads
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
}
```

---

**Ubicación en producción**: `/app/firmware` (contenedor) → `./firmware` (host)  
**Acceso web**: `https://bike.xaviergalarreta.pro/firmware/`  
**Gestión**: A través del modal de configuración en la web
