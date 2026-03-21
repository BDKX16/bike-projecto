const mongoose = require("mongoose");

const wifiCommandSchema = new mongoose.Schema({
  device: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['add', 'remove', 'list']
  },
  ssid: {
    type: String,
    maxlength: 32
  },
  password: {
    type: String,
    maxlength: 64
  },
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date
  }
});

// Índice compuesto para consultas frecuentes
wifiCommandSchema.index({ device: 1, processed: 1, createdAt: 1 });

// Método estático para obtener comandos pendientes de un dispositivo
wifiCommandSchema.statics.getPendingCommands = function(device) {
  return this.find({ 
    device: device, 
    processed: false 
  }).sort({ createdAt: 1 });
};

// Método estático para marcar comandos como procesados
wifiCommandSchema.statics.markAsProcessed = function(commandIds) {
  return this.updateMany(
    { _id: { $in: commandIds } },
    { 
      processed: true,
      processedAt: new Date()
    }
  );
};

// Método estático para agregar comando
wifiCommandSchema.statics.addCommand = function(device, action, ssid, password) {
  return this.create({
    device,
    action,
    ssid,
    password
  });
};

module.exports = mongoose.model("WifiCommand", wifiCommandSchema);
