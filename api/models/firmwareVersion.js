const mongoose = require('mongoose');

const firmwareVersionSchema = new mongoose.Schema({
  device: {
    type: String,
    required: true,
    enum: ['BATTERY', 'MAINBOARD'],
    index: true
  },
  version: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validar formato semver (X.Y.Z)
        return /^\d+\.\d+\.\d+$/.test(v);
      },
      message: props => `${props.value} no es un formato de versión válido (debe ser X.Y.Z)`
    }
  },
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  md5: {
    type: String,
    required: false  // Opcional pero recomendado
  },
  changelog: {
    type: String,
    required: false
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  enabled: {
    type: Boolean,
    default: true
  },
  rolloutPercentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  targetDevices: {
    type: [String],
    default: []  // Array vacío = todos los dispositivos
  },
  minVersion: {
    type: String,
    default: '0.0.0'  // Versión mínima desde la cual se puede actualizar
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas rápidas
firmwareVersionSchema.index({ device: 1, version: 1 }, { unique: true });
firmwareVersionSchema.index({ device: 1, enabled: 1, createdAt: -1 });

// Método estático para obtener la última versión de un dispositivo
firmwareVersionSchema.statics.getLatestVersion = async function(deviceType) {
  return await this.findOne({ 
    device: deviceType.toUpperCase(),
    enabled: true 
  }).sort({ createdAt: -1 });
};

// Método estático para verificar si hay actualización disponible
firmwareVersionSchema.statics.checkUpdate = async function(deviceType, currentVersion) {
  const latest = await this.getLatestVersion(deviceType);
  
  if (!latest) {
    return { updateAvailable: false };
  }

  // Comparar versiones
  const isNewer = compareVersions(latest.version, currentVersion) > 0;
  
  return {
    updateAvailable: isNewer,
    latestVersion: latest.version,
    currentVersion: currentVersion,
    changelog: isNewer ? latest.changelog : null,
    filename: isNewer ? latest.filename : null,
    size: isNewer ? latest.size : null,
    md5: isNewer ? latest.md5 : null
  };
};

// Función auxiliar para comparar versiones
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  
  return 0;
}

const FirmwareVersion = mongoose.model('FirmwareVersion', firmwareVersionSchema);

module.exports = FirmwareVersion;
