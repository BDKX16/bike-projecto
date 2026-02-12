const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const BikeData = require("./models/bikeData");
const { analyzeBatteryStatus, sendAlertEmail, sendChargeCompleteEmail } = require("./services/alertService");

require("dotenv").config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

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
      timestamp: espTimestamp 
    } = req.body;

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
          await sendChargeCompleteEmail(req.body);
          console.log(`🔋 Carga completa detectada. Email enviado.`);
          emailSent = true;
        } catch (emailError) {
          console.error('Error al enviar email de carga completa:', emailError.message);
        }
      } else {
        console.log(`🔋 Batería al 100% pero ya estaba completa. No se envía email.`);
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
            await sendAlertEmail(req.body, alerts);
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
      emailSent
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

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Server
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API escuchando en puerto ${PORT}`);
});
