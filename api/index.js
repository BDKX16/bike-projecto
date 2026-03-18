const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const BikeData = require("./models/bikeData");
const Settings = require("./models/settings");
const { analyzeBatteryStatus, sendAlertEmail, sendChargeCompleteEmail } = require("./services/alertService");

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
      
      return res.status(201).json({ 
        success: true, 
        data: bikeData,
        alerts: alerts.length > 0 ? alerts : undefined,
        emailSent
      });
    }
    
    // Si está cargando, solo devolver los datos
    res.status(201).json({ 
      success: true, 
      data: bikeData,
      charging: true,
      emailSent,
      percentAlerts: percentAlerts.length > 0 ? percentAlerts : undefined
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

// Server
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API escuchando en puerto ${PORT}`);
});
