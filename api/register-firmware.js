#!/usr/bin/env node

/**
 * Script helper para registrar nuevas versiones de firmware OTA
 * 
 * Uso:
 *   node register-firmware.js battery 1.0.1 ./battery.bin "Fix de sensor de corriente"
 *   node register-firmware.js mainboard 1.0.0 ./mainboard.bin "Versión inicial"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3120';
const FIRMWARE_DIR = path.join(__dirname, 'firmware');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function calculateMD5(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('md5');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

async function promptPassword() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Contraseña admin: ', (password) => {
      rl.close();
      resolve(password);
    });
  });
}

async function registerFirmware(device, version, binFilePath, changelog) {
  try {
    // Validar entrada
    if (!device || !version || !binFilePath) {
      throw new Error('Uso: node register-firmware.js <device> <version> <binFilePath> [changelog]');
    }

    // Validar tipo de dispositivo
    const deviceUpper = device.toUpperCase();
    if (!['BATTERY', 'MAINBOARD'].includes(deviceUpper)) {
      throw new Error('Device debe ser "battery" o "mainboard"');
    }

    // Validar formato de versión
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      throw new Error('La versión debe estar en formato X.Y.Z (ej: 1.0.1)');
    }

    // Verificar que el archivo existe
    if (!fs.existsSync(binFilePath)) {
      throw new Error(`Archivo no encontrado: ${binFilePath}`);
    }

    log('\n📦 Procesando firmware...', 'cyan');
    log(`   Dispositivo: ${deviceUpper}`, 'blue');
    log(`   Versión: ${version}`, 'blue');
    log(`   Archivo: ${binFilePath}`, 'blue');

    // Calcular metadata
    const size = getFileSize(binFilePath);
    const md5 = calculateMD5(binFilePath);
    const filename = `${device.toLowerCase()}.bin`;

    log(`\n🔢 Metadata calculada:`, 'cyan');
    log(`   Tamaño: ${(size / 1024).toFixed(2)} KB`, 'blue');
    log(`   MD5: ${md5}`, 'blue');

    // Copiar archivo al directorio de firmware
    const destPath = path.join(FIRMWARE_DIR, filename);
    fs.copyFileSync(binFilePath, destPath);
    log(`\n✅ Archivo copiado a: ${destPath}`, 'green');

    // Solicitar contraseña
    const password = await promptPassword();

    // Registrar en la base de datos
    const payload = {
      password,
      device: deviceUpper,
      version,
      filename,
      size,
      md5,
      changelog: changelog || `Actualización ${version}`,
      enabled: true,
      rolloutPercentage: 100
    };

    log(`\n🚀 Registrando en el servidor...`, 'cyan');

    const fetch = require('node-fetch');
    const response = await fetch(`${API_URL}/api/ota/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log(`\n✅ Firmware registrado exitosamente!`, 'green');
      log(`\n📋 Detalles:`, 'cyan');
      log(`   ID: ${result.data._id}`, 'blue');
      log(`   Versión: ${result.data.version}`, 'blue');
      log(`   Dispositivo: ${result.data.device}`, 'blue');
      log(`   Tamaño: ${(result.data.size / 1024).toFixed(2)} KB`, 'blue');
      log(`   Fecha: ${new Date(result.data.releaseDate).toLocaleString('es-AR')}`, 'blue');
      log(`\n🌐 URL de descarga:`, 'cyan');
      log(`   ${API_URL}/firmware/${filename}`, 'blue');
    } else {
      throw new Error(result.error || 'Error al registrar firmware');
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar
const [,, device, version, binFilePath, ...changelogParts] = process.argv;
const changelog = changelogParts.join(' ');

if (!device || !version || !binFilePath) {
  log('❌ Uso incorrecto', 'red');
  log('\nUso:', 'yellow');
  log('  node register-firmware.js <device> <version> <binFilePath> [changelog]', 'cyan');
  log('\nEjemplos:', 'yellow');
  log('  node register-firmware.js battery 1.0.1 ./battery.bin "Fix de sensor"', 'cyan');
  log('  node register-firmware.js mainboard 1.0.0 ./mainboard.bin "Versión inicial"', 'cyan');
  process.exit(1);
}

registerFirmware(device, version, binFilePath, changelog);
