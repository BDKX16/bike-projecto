const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const BikeData = require("./models/bikeData");
const Settings = require("./models/settings");
const { analyzeBatteryStatus, sendAlertEmail, sendChargeCompleteEmail } = require("./services/alertService");
const otaService = require("./services/otaService");

require("dotenv").config();

const app = express();

// Middlewares
app.use(express.json());

// CORS solo en desarrollo local (en producción lo maneja nginx)
if (process.env.NODE_ENV !== 'production') {
  const corsOptions = {
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o curl)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3121',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3121'
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  };
  
  app.use(cors(corsOptions));
  console.log('🔓 CORS habilitado para desarrollo local');
} else {
  console.log('🔒 CORS deshabilitado (manejado por nginx)');
}

// MongoDB Connection
const mongoUri = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DATABASE}?authSource=admin`;

console.log('🔍 MongoDB URI:', mongoUri.replace(/\/\/.*:.*@/, '//*****:*****@')); // Log con password oculto

mongoose.connect(mongoUri)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => {
    console.error("❌ Error conectando a MongoDB:", err.message);
    console.error("💡 Verifica las variables de entorno:");
    console.error(`   MONGO_HOST: ${process.env.MONGO_HOST}`);
    console.error(`   MONGO_PORT: ${process.env.MONGO_PORT}`);
    console.error(`   MONGO_USERNAME: ${process.env.MONGO_USERNAME}`);
    console.error(`   MONGO_DATABASE: ${process.env.MONGO_DATABASE}`);
  });

// Endpoints

// POST - Guardar datos de la bicicleta
app.post("/api/battery", async (req, res) => {
  try {
    const { 
      device, 
      name,
      firmwareVersion, 
      voltage, 
      current, 
      percent, 
      remainingAh, 
      consumedAh, 
      cycles, 
      maxCycles, 
      charging,
      gpioVoltage,
      timestamp: espTimestamp 
    } = req.body;

    // Cargar configuración
    const settings = await Settings.get();

    // Obtener el último registro antes de guardar el nuevo
    const previousData = await BikeData.findOne().sort({ timestamp: -1 });
    
    const bikeData = new BikeData({
      device,
      name,
      voltage,
      current,
      percent,
      remainingAh,
      consumedAh,
      cycles,
      maxCycles,
      charging,
      gpioVoltage,
      espTimestamp,
      timestamp: new Date()
    });
    
    await bikeData.save();

    let emailSent = false;

    // Detectar carga completa (solo una vez)
    if (charging && percent >= 99.5) {
      // Verificar si el registro anterior no estaba al 100%
      if (!previousData || previousData.percent < 99.5) {
        try {
          await sendChargeCompleteEmail(req.body, settings);
          console.log(`🔋 Carga completa detectada. Email enviado.`);
          emailSent = true;
        } catch (emailError) {
          console.error('Error al enviar email de carga completa:', emailError.message);
        }
      } else {
        console.log(`🔋 Batería al 100% pero ya estaba completa. No se envía email.`);
      }
    }

    // Verificar alertas personalizadas de batería alta/baja basadas en configuración
    const percentAlerts = [];
    
    // Alerta de batería alta (cuando está cargando)
    if (charging && settings.emailNotifications?.highBatteryAlert?.enabled) {
      const threshold = settings.emailNotifications.highBatteryAlert.threshold;
      if (percent >= threshold && (!previousData || previousData.percent < threshold)) {
        percentAlerts.push({
          level: 'INFO',
          type: 'high_battery',
          issue: `Batería alcanzó ${threshold}%`,
          detail: `La batería llegó al ${percent.toFixed(1)}% durante la carga`,
          action: `Nivel objetivo de ${threshold}% alcanzado`
        });
      }
    }

    // Alerta de batería baja (cuando NO está cargando)
    if (!charging && settings.emailNotifications?.lowBatteryAlert?.enabled) {
      const threshold = settings.emailNotifications.lowBatteryAlert.threshold;
      if (percent <= threshold && (!previousData || previousData.percent > threshold)) {
        percentAlerts.push({
          level: 'ADVERTENCIA',
          type: 'low_battery',
          issue: `Batería baja - ${threshold}%`,
          detail: `La batería bajó a ${percent.toFixed(1)}%`,
          action: `Considera cargar pronto para evitar descarga profunda`
        });
        
        // Enviar email para batería baja
        try {
          await sendAlertEmail(req.body, percentAlerts, settings);
          console.log(`⚠️ Batería baja (${threshold}%). Email enviado.`);
          emailSent = true;
        } catch (emailError) {
          console.error('Error al enviar email de batería baja:', emailError.message);
        }
      }
    }

    // Analizar estado de la batería (solo si no está cargando)
    if (!charging) {
      const alerts = analyzeBatteryStatus(req.body);
      
      // Enviar email si hay alertas críticas o urgentes
      if (alerts.length > 0) {
        const criticalAlerts = alerts.filter(a => a.level === 'CRÍTICO' || a.level === 'URGENTE');
        if (criticalAlerts.length > 0) {
          try {
            await sendAlertEmail(req.body, alerts, settings);
            console.log(`⚠️ ${alerts.length} alerta(s) detectada(s). Email enviado.`);
            emailSent = true;
          } catch (emailError) {
            console.error('Error al enviar email de alerta:', emailError.message);
          }
        }
      }

      // Verificar actualización OTA
      let otaUpdate = { updateAvailable: false };
      if (firmwareVersion) {
        console.log(`🔍 [OTA] Verificando actualización para ${device} v${firmwareVersion} (NO cargando)`);
        otaUpdate = await otaService.checkForUpdate('battery', firmwareVersion, device);
        if (otaUpdate.updateAvailable) {
          console.log(`📥 [OTA] ✅ Actualización disponible: ${firmwareVersion} → ${otaUpdate.newVersion}`);
        } else {
          console.log(`✓ [OTA] Sin actualización - Versión actual: ${firmwareVersion}`);
        }
      } else {
        console.log(`⚠️ [OTA] Dispositivo ${device} no envió firmwareVersion`);
      }
      
      return res.status(201).json({ 
        status: 'ok',
        success: true, 
        data: bikeData,
        alerts: alerts.length > 0 ? alerts : undefined,
        emailSent,
        ...otaUpdate,
        receivedAt: new Date().toISOString()
      });
    }
    
    // Si está cargando, incluir verificación OTA
    let otaUpdate = { updateAvailable: false };
    if (firmwareVersion) {
      console.log(`🔍 [OTA] Verificando actualización para ${device} v${firmwareVersion} (CARGANDO)`);
      otaUpdate = await otaService.checkForUpdate('battery', firmwareVersion, device);
      if (otaUpdate.updateAvailable) {
        console.log(`📥 [OTA] ✅ Actualización disponible: ${firmwareVersion} → ${otaUpdate.newVersion}`);
        console.log(`📥 [OTA] URL: /firmware/battery.bin (${(otaUpdate.size / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`✓ [OTA] Sin actualización - Versión actual: ${firmwareVersion}`);
      }
    } else {
      console.log(`⚠️ [OTA] Dispositivo ${device} no envió firmwareVersion`);
    }

    res.status(201).json({ 
      status: 'ok',
      success: true, 
      data: bikeData,
      charging: true,
      emailSent,
      percentAlerts: percentAlerts.length > 0 ? percentAlerts : undefined,
      ...otaUpdate,
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener el último registro
app.get("/api/bike-data/latest", async (req, res) => {
  try {
    const latestData = await BikeData.findOne().sort({ timestamp: -1 });
    
    if (!latestData) {
      return res.status(404).json({ success: false, message: "No hay datos disponibles" });
    }
    
    res.json({ success: true, data: latestData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener historial de las últimas 24 horas
app.get("/api/bike-data/history", async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const limit = parseInt(req.query.limit) || 1000;
    
    const since = new Date();
    since.setHours(since.getHours() - hours);
    
    const historyData = await BikeData.find({ 
      timestamp: { $gte: since } 
    })
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();
    
    res.json({ 
      success: true, 
      data: historyData,
      count: historyData.length,
      range: { from: since, to: new Date() }
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener configuración
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await Settings.get();
    
    // No enviar información sensible si existe
    const publicSettings = {
      ...settings.toObject(),
      _id: settings._id
    };
    
    res.json({ success: true, data: publicSettings });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Actualizar configuración (requiere contraseña)
app.post("/api/settings", async (req, res) => {
  try {
    const { password, settings: newSettings } = req.body;
    
    // Verificar contraseña
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ebike2024";
    
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ 
        success: false, 
        error: "Contraseña incorrecta" 
      });
    }
    
    // Actualizar configuración
    const updatedSettings = await Settings.updateSettings(newSettings);
    
    console.log('⚙️ Configuración actualizada exitosamente');
    
    res.json({ 
      success: true, 
      data: updatedSettings,
      message: "Configuración guardada exitosamente" 
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ==================== OTA ENDPOINTS ====================

// Servir archivos estáticos de firmware
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs').promises;

const firmwarePath = process.env.FIRMWARE_PATH || path.join(__dirname, 'firmware');

// Middleware para loggear descargas de firmware
app.use('/firmware', (req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  if (req.path.endsWith('.bin')) {
    console.log(`\n📦 [OTA] ========================================`);
    console.log(`📦 [OTA] DESCARGA DE FIRMWARE`);
    console.log(`📦 [OTA] Archivo: ${req.path}`);
    console.log(`📦 [OTA] IP: ${clientIP}`);
    console.log(`📦 [OTA] User-Agent: ${userAgent}`);
    console.log(`📦 [OTA] Timestamp: ${new Date().toISOString()}`);
    console.log(`📦 [OTA] ========================================\n`);
  }
  
  next();
});

app.use('/firmware', express.static(firmwarePath));

// Configurar multer para upload de firmware
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, firmwarePath);
  },
  filename: function (req, file, cb) {
    // El nombre se establecerá después según el tipo de dispositivo
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.bin')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .bin'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// GET - version.json (metadata de versiones disponibles)
app.get('/firmware/version.json', async (req, res) => {
  try {
    const versionFile = path.join(firmwarePath, 'version.json');
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`📄 [OTA] Descarga de version.json desde ${clientIP}`);
    res.sendFile(versionFile);
  } catch (error) {
    console.error('❌ [OTA] Error al servir version.json:', error);
    res.status(404).json({ success: false, error: 'version.json no encontrado' });
  }
});

// GET - Verificar actualización (alternativa al POST /api/battery)
app.get('/api/ota/check-update', async (req, res) => {
  try {
    const { device, version, deviceId } = req.query;
    
    if (!device || !version) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parámetros requeridos: device, version' 
      });
    }

    const updateInfo = await otaService.checkForUpdate(device, version, deviceId);
    
    res.json({
      success: true,
      ...updateInfo
    });
  } catch (error) {
    console.error('Error al verificar actualización:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Registrar nueva versión de firmware (requiere autenticación)
app.post('/api/ota/register', async (req, res) => {
  try {
    const { password, ...firmwareData } = req.body;
    
    // Verificar contraseña
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ebike2024";
    
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ 
        success: false, 
        error: "Contraseña incorrecta" 
      });
    }

    const firmware = await otaService.registerFirmware(firmwareData);
    
    res.json({
      success: true,
      message: 'Firmware registrado exitosamente',
      data: firmware
    });
  } catch (error) {
    console.error('Error al registrar firmware:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Listar todas las versiones disponibles
app.get('/api/ota/versions', async (req, res) => {
  try {
    const { device } = req.query;
    const versions = await otaService.getAllVersions(device);
    
    res.json({
      success: true,
      count: versions.length,
      data: versions
    });
  } catch (error) {
    console.error('Error al obtener versiones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Deshabilitar versión de firmware
app.post('/api/ota/disable', async (req, res) => {
  try {
    const { password, version, device } = req.body;
    
    // Verificar contraseña
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ebike2024";
    
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ 
        success: false, 
        error: "Contraseña incorrecta" 
      });
    }

    if (!version || !device) {
      return res.status(400).json({ 
        success: false, 
        error: "Parámetros requeridos: version, device" 
      });
    }

    const disabled = await otaService.disableFirmware(version, device);
    
    if (disabled) {
      res.json({
        success: true,
        message: `Firmware ${device} v${version} deshabilitado`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Firmware no encontrado'
      });
    }
  } catch (error) {
    console.error('Error al deshabilitar firmware:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Actualizar version.json manualmente
app.post('/api/ota/refresh-version-json', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Verificar contraseña
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ebike2024";
    
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ 
        success: false, 
        error: "Contraseña incorrecta" 
      });
    }

    await otaService.updateVersionJson();
    
    res.json({
      success: true,
      message: 'version.json actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar version.json:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Upload de firmware (con versionado autoincremental)
app.post('/api/ota/upload', upload.single('firmware'), async (req, res) => {
  try {
    const { password, device, changelog } = req.body;
    
    // Verificar contraseña
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ebike2024";
    
    if (!password || password !== ADMIN_PASSWORD) {
      // Eliminar archivo si la contraseña es incorrecta
      if (req.file) {
        await fs.unlink(req.file.path).catch(err => console.error('Error al eliminar archivo:', err));
      }
      return res.status(401).json({ 
        success: false, 
        error: "Contraseña incorrecta" 
      });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No se recibió ningún archivo" 
      });
    }

    // Verificar tipo de dispositivo
    if (!device || !['battery', 'mainboard'].includes(device.toLowerCase())) {
      await fs.unlink(req.file.path).catch(err => console.error('Error al eliminar archivo:', err));
      return res.status(400).json({ 
        success: false, 
        error: "Tipo de dispositivo inválido. Debe ser 'battery' o 'mainboard'" 
      });
    }

    console.log(`📤 Upload de firmware recibido:`);
    console.log(`   Dispositivo: ${device}`);
    console.log(`   Archivo: ${req.file.originalname}`);
    console.log(`   Tamaño: ${(req.file.size / 1024).toFixed(2)} KB`);

    // Procesar el upload con versionado autoincremental
    const firmware = await otaService.uploadFirmware(
      device.toLowerCase(),
      req.file.path,
      changelog || ''
    );

    res.json({
      success: true,
      message: 'Firmware subido y registrado exitosamente',
      data: {
        version: firmware.version,
        device: firmware.device,
        size: firmware.size,
        md5: firmware.md5,
        changelog: firmware.changelog
      }
    });
  } catch (error) {
    console.error('Error al subir firmware:', error);
    
    // Intentar eliminar el archivo si hubo error
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.error('Error al eliminar archivo:', err));
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener próxima versión (para preview en frontend)
app.get('/api/ota/next-version', async (req, res) => {
  try {
    const { device } = req.query;
    
    if (!device || !['battery', 'mainboard'].includes(device.toLowerCase())) {
      return res.status(400).json({ 
        success: false, 
        error: "Tipo de dispositivo inválido" 
      });
    }

    const nextVersion = await otaService.getNextVersion(device.toLowerCase());
    const currentFirmware = await otaService.getAllVersions(device.toLowerCase());
    const latestVersion = currentFirmware.length > 0 ? currentFirmware[0].version : 'Ninguna';

    res.json({
      success: true,
      currentVersion: latestVersion,
      nextVersion: nextVersion
    });
  } catch (error) {
    console.error('Error al obtener próxima versión:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API escuchando en puerto ${PORT}`);
});
