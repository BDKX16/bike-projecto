const mongoose = require("mongoose");

const wifiNetworkSchema = new mongoose.Schema({
  device: {
    type: String,
    required: true,
    index: true
  },
  ssid: {
    type: String,
    required: true,
    maxlength: 32
  },
  password: {
    type: String,
    required: true,
    maxlength: 64
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto para evitar duplicados
wifiNetworkSchema.index({ device: 1, ssid: 1 }, { unique: true });

// Método estático para obtener todas las redes deseadas de un dispositivo
wifiNetworkSchema.statics.getDesiredNetworks = function(device) {
  return this.find({ device }).sort({ createdAt: 1 }).lean();
};

// Método estático para agregar o actualizar red
wifiNetworkSchema.statics.upsertNetwork = function(device, ssid, password) {
  return this.findOneAndUpdate(
    { device, ssid },
    { 
      device, 
      ssid, 
      password,
      updatedAt: new Date()
    },
    { 
      upsert: true, 
      new: true 
    }
  );
};

// Método estático para eliminar red
wifiNetworkSchema.statics.removeNetwork = function(device, ssid) {
  return this.deleteOne({ device, ssid });
};

// Método estático para sincronizar con el estado reportado del ESP32
wifiNetworkSchema.statics.syncWithESP32 = async function(device, reportedNetworks) {
  // Obtener redes deseadas (master list)
  const desiredNetworks = await this.getDesiredNetworks(device);
  const desiredSSIDs = desiredNetworks.map(n => n.ssid);
  const reportedSSIDs = reportedNetworks || [];
  
  const commands = [];
  
  // 1. Eliminar redes que el ESP32 tiene pero no deberían estar
  for (const ssid of reportedSSIDs) {
    if (!desiredSSIDs.includes(ssid)) {
      commands.push({
        action: 'remove',
        ssid: ssid,
        reason: 'No está en la lista deseada'
      });
    }
  }
  
  // 2. Agregar redes que faltan en el ESP32
  for (const network of desiredNetworks) {
    if (!reportedSSIDs.includes(network.ssid)) {
      commands.push({
        action: 'add',
        ssid: network.ssid,
        password: network.password,
        reason: 'Falta en el ESP32'
      });
    }
  }
  
  return commands;
};

module.exports = mongoose.model("WifiNetwork", wifiNetworkSchema);
