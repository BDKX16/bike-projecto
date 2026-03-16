const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  // Email notifications
  emailNotifications: {
    enabled: { type: Boolean, default: true },
    email: { type: String, required: true },
    
    // Battery level alerts
    highBatteryAlert: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 80, min: 0, max: 100 }
    },
    lowBatteryAlert: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 20, min: 0, max: 100 }
    },
    criticalBatteryAlert: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 10, min: 0, max: 100 }
    },
    
    // Charging notifications
    chargeCompleteAlert: {
      enabled: { type: Boolean, default: true }
    },
    chargeStartedAlert: {
      enabled: { type: Boolean, default: false }
    },
    
    // Temperature alerts (para futuro)
    temperatureAlert: {
      enabled: { type: Boolean, default: false },
      maxTemp: { type: Number, default: 45 }
    }
  },
  
  // Display preferences
  displaySettings: {
    temperatureUnit: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' },
    theme: { type: String, enum: ['auto', 'light', 'dark'], default: 'auto' },
    language: { type: String, enum: ['es', 'en'], default: 'es' }
  },
  
  // Advanced settings
  advanced: {
    autoRefreshInterval: { type: Number, default: 60000, min: 5000 }, // ms
    dataRetentionDays: { type: Number, default: 90, min: 7 }
  },
  
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Solo queremos un documento de configuración
settingsSchema.statics.get = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Crear configuración por defecto si no existe
    settings = await this.create({
      emailNotifications: {
        email: process.env.NOTIFICATION_EMAIL || 'usuario@example.com'
      }
    });
  }
  return settings;
};

settingsSchema.statics.updateSettings = async function(newSettings) {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this(newSettings);
  } else {
    Object.assign(settings, newSettings);
  }
  settings.updatedAt = new Date();
  await settings.save();
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
