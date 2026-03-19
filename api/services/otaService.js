const FirmwareVersion = require('../models/firmwareVersion');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class OTAService {
  constructor() {
    this.firmwarePath = process.env.FIRMWARE_PATH || path.join(__dirname, '..', 'firmware');
  }

  /**
   * Verifica si hay actualización disponible para un dispositivo
   * @param {string} deviceType - Tipo de dispositivo (battery/mainboard)
   * @param {string} currentVersion - Versión actual del dispositivo
   * @param {string} deviceId - ID del dispositivo (opcional, para rollout gradual)
   * @returns {Promise<Object>} Información sobre actualización disponible
   */
  async checkForUpdate(deviceType, currentVersion, deviceId = null) {
    try {
      console.log(`  ├─ [OTA Service] Consultando BD para ${deviceType.toUpperCase()}...`);
      const updateInfo = await FirmwareVersion.checkUpdate(deviceType, currentVersion);
      
      if (!updateInfo.updateAvailable) {
        console.log(`  ├─ [OTA Service] No hay versión más nueva`);
        return {
          updateAvailable: false,
          currentVersion,
          latestVersion: updateInfo.latestVersion || currentVersion
        };
      }
      
      console.log(`  ├─ [OTA Service] Nueva versión encontrada: ${updateInfo.latestVersion}`);

      // Si hay actualización disponible, verificar rollout y target devices
      const latestFirmware = await FirmwareVersion.getLatestVersion(deviceType);
      
      // Verificar si el dispositivo está en la lista de targets (si existe)
      if (latestFirmware.targetDevices && latestFirmware.targetDevices.length > 0) {
        if (!deviceId || !latestFirmware.targetDevices.includes(deviceId)) {
          console.log(`📱 Dispositivo ${deviceId} no está en la lista de targets para actualización`);
          return {
            updateAvailable: false,
            currentVersion,
            latestVersion: updateInfo.latestVersion,
            reason: 'device_not_in_target_list'
          };
        }
      }

      // Verificar rollout percentage (implementación simple con hash)
      if (latestFirmware.rolloutPercentage < 100 && deviceId) {
        const hash = this.hashDeviceId(deviceId);
        const devicePercentile = hash % 100;
        
        if (devicePercentile >= latestFirmware.rolloutPercentage) {
          console.log(`📊 Dispositivo ${deviceId} fuera del rollout (${latestFirmware.rolloutPercentage}%)`);
          return {
            updateAvailable: false,
            currentVersion,
            latestVersion: updateInfo.latestVersion,
            reason: 'outside_rollout_percentage'
          };
        }
      }

      // Verificar versión mínima requerida
      if (this.compareVersions(currentVersion, latestFirmware.minVersion) < 0) {
        console.log(`  ├─ [OTA Service] ⚠️ Versión ${currentVersion} demasiado antigua (min: ${latestFirmware.minVersion})`);
        return {
          updateAvailable: false,
          currentVersion,
          latestVersion: updateInfo.latestVersion,
          reason: 'version_too_old',
          minVersion: latestFirmware.minVersion
        };
      }

      console.log(`  ├─ [OTA Service] ✅ Todos los checks pasados`);
      console.log(`  └─ [OTA Service] 🚀 Actualización autorizada: ${currentVersion} → ${updateInfo.latestVersion}`);
      
      return {
        updateAvailable: true,
        currentVersion,
        newVersion: updateInfo.latestVersion,
        releaseNotes: updateInfo.changelog || 'Nueva versión disponible',
        size: updateInfo.size,
        md5: updateInfo.md5
      };
    } catch (error) {
      console.error('Error al verificar actualización:', error);
      return {
        updateAvailable: false,
        currentVersion,
        error: error.message
      };
    }
  }

  /**
   * Genera un hash simple del device ID para rollout consistente
   * @param {string} deviceId 
   * @returns {number}
   */
  hashDeviceId(deviceId) {
    let hash = 0;
    for (let i = 0; i < deviceId.length; i++) {
      const char = deviceId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Compara dos versiones en formato semver
   * @param {string} v1 
   * @param {string} v2 
   * @returns {number} -1 si v1 < v2, 0 si iguales, 1 si v1 > v2
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    
    return 0;
  }

  /**
   * Registra una nueva versión de firmware
   * @param {Object} firmwareData - Datos del firmware
   * @returns {Promise<Object>}
   */
  async registerFirmware(firmwareData) {
    try {
      const firmware = new FirmwareVersion(firmwareData);
      await firmware.save();
      
      console.log(`✅ Firmware registrado: ${firmware.device} v${firmware.version}`);
      
      // Actualizar version.json
      await this.updateVersionJson();
      
      return firmware;
    } catch (error) {
      console.error('Error al registrar firmware:', error);
      throw error;
    }
  }

  /**
   * Genera/actualiza el archivo version.json con las últimas versiones
   * @returns {Promise<void>}
   */
  async updateVersionJson() {
    try {
      const batteryFirmware = await FirmwareVersion.getLatestVersion('BATTERY');
      const mainboardFirmware = await FirmwareVersion.getLatestVersion('MAINBOARD');

      const versionData = {};

      if (batteryFirmware) {
        versionData.battery = {
          version: batteryFirmware.version,
          device: batteryFirmware.device,
          filename: batteryFirmware.filename,
          size: batteryFirmware.size,
          md5: batteryFirmware.md5 || '',
          date: batteryFirmware.releaseDate.toISOString().split('T')[0],
          changelog: batteryFirmware.changelog || 'Nueva versión disponible'
        };
      }

      if (mainboardFirmware) {
        versionData.mainboard = {
          version: mainboardFirmware.version,
          device: mainboardFirmware.device,
          filename: mainboardFirmware.filename,
          size: mainboardFirmware.size,
          md5: mainboardFirmware.md5 || '',
          date: mainboardFirmware.releaseDate.toISOString().split('T')[0],
          changelog: mainboardFirmware.changelog || 'Nueva versión disponible'
        };
      }

      const versionJsonPath = path.join(this.firmwarePath, 'version.json');
      await fs.writeFile(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf-8');
      
      console.log(`📄 version.json actualizado en ${versionJsonPath}`);
    } catch (error) {
      console.error('Error al actualizar version.json:', error);
      throw error;
    }
  }

  /**
   * Calcula el MD5 de un archivo
   * @param {string} filePath 
   * @returns {Promise<string>}
   */
  async calculateMD5(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('md5');
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      console.error('Error al calcular MD5:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las versiones de firmware disponibles
   * @param {string} deviceType - Opcional, filtrar por tipo
   * @returns {Promise<Array>}
   */
  async getAllVersions(deviceType = null) {
    try {
      const query = {};
      if (deviceType) {
        query.device = deviceType.toUpperCase();
      }
      
      return await FirmwareVersion.find(query).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error al obtener versiones:', error);
      throw error;
    }
  }

  /**
   * Deshabilita una versión de firmware
   * @param {string} version 
   * @param {string} deviceType 
   * @returns {Promise<boolean>}
   */
  async disableFirmware(version, deviceType) {
    try {
      const result = await FirmwareVersion.updateOne(
        { version, device: deviceType.toUpperCase() },
        { enabled: false }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`❌ Firmware ${deviceType} v${version} deshabilitado`);
        await this.updateVersionJson();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error al deshabilitar firmware:', error);
      throw error;
    }
  }

  /**
   * Calcula la siguiente versión automáticamente (autoincremental)
   * @param {string} deviceType - Tipo de dispositivo (battery/mainboard)
   * @returns {Promise<string>} Siguiente versión en formato semver
   */
  async getNextVersion(deviceType) {
    try {
      const latestFirmware = await FirmwareVersion.getLatestVersion(deviceType);
      
      if (!latestFirmware) {
        // Si no hay versión previa, empezar con 1.0.0
        return '1.0.0';
      }

      // Parsear la versión actual
      const [major, minor, patch] = latestFirmware.version.split('.').map(Number);
      
      // Incrementar el patch version
      const nextVersion = `${major}.${minor}.${patch + 1}`;
      
      console.log(`📈 Nueva versión calculada para ${deviceType}: ${latestFirmware.version} → ${nextVersion}`);
      
      return nextVersion;
    } catch (error) {
      console.error('Error al calcular siguiente versión:', error);
      throw error;
    }
  }

  /**
   * Procesa el upload de un archivo de firmware
   * @param {string} deviceType - Tipo de dispositivo
   * @param {string} filePath - Ruta temporal del archivo subido
   * @param {string} changelog - Notas de la versión
   * @returns {Promise<Object>} Firmware registrado
   */
  async uploadFirmware(deviceType, filePath, changelog = '') {
    try {
      const deviceUpper = deviceType.toUpperCase();
      
      // Calcular siguiente versión
      const nextVersion = await this.getNextVersion(deviceType);
      
      // Calcular tamaño y MD5
      const size = (await fs.stat(filePath)).size;
      const md5 = await this.calculateMD5(filePath);
      
      // Nombre del archivo final
      const filename = `${deviceType.toLowerCase()}.bin`;
      const finalPath = path.join(this.firmwarePath, filename);
      
      // Mover archivo a la ubicación final
      await fs.rename(filePath, finalPath);
      
      console.log(`📦 Archivo movido a: ${finalPath}`);
      console.log(`   Tamaño: ${(size / 1024).toFixed(2)} KB`);
      console.log(`   MD5: ${md5}`);
      
      // Registrar en la base de datos
      const firmwareData = {
        device: deviceUpper,
        version: nextVersion,
        filename,
        size,
        md5,
        changelog: changelog || `Actualización ${nextVersion}`,
        enabled: true,
        rolloutPercentage: 100,
        targetDevices: [],
        minVersion: '0.0.0'
      };
      
      const firmware = await this.registerFirmware(firmwareData);
      
      console.log(`✅ Firmware ${deviceUpper} v${nextVersion} registrado exitosamente`);
      
      return firmware;
    } catch (error) {
      console.error('Error al procesar upload de firmware:', error);
      throw error;
    }
  }
}

module.exports = new OTAService();
