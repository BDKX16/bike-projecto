// Script para probar la detección de carga completa
// Ejecutar con: node test-charge-complete.js

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/battery';

async function sendBatteryData(data, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${description}`);
  console.log('='.repeat(60));
  console.log(`Enviando: ${data.percent}% - ${data.charging ? '🔌 Cargando' : '🔋 En uso'} - ${data.voltage}V`);
  
  try {
    const response = await axios.post(API_URL, data);
    
    console.log('✅ Estado:', response.status);
    
    if (response.data.emailSent) {
      console.log('📧 EMAIL ENVIADO');
    } else {
      console.log('⏸️  Sin email (cooldown o sin alertas)');
    }
    
    if (response.data.alerts && response.data.alerts.length > 0) {
      console.log(`⚠️  ${response.data.alerts.length} alerta(s) detectada(s)`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testChargeSequence() {
  console.log('🧪 Probando secuencia de carga completa...\n');
  console.log('Este test simula el ESP32 enviando datos durante la carga');
  console.log('hasta llegar al 100%. Solo debe enviar UN email al completar.\n');
  
  // Simular progreso de carga
  const chargeSequence = [
    { percent: 70, voltage: 39.2, description: '1. Carga en progreso - 70%' },
    { percent: 80, voltage: 40.0, description: '2. Carga en progreso - 80%' },
    { percent: 90, voltage: 40.8, description: '3. Carga en progreso - 90%' },
    { percent: 95, voltage: 41.4, description: '4. Casi completa - 95%' },
    { percent: 98, voltage: 41.8, description: '5. Casi completa - 98%' },
    { percent: 100, voltage: 42.0, description: '6. ✅ CARGA COMPLETA - 100% (debe enviar email)' },
    { percent: 100, voltage: 42.0, description: '7. Aún al 100% (NO debe enviar email)' },
    { percent: 100, voltage: 42.0, description: '8. Todavía al 100% (NO debe enviar email)' },
  ];
  
  for (const step of chargeSequence) {
    await sendBatteryData({
      device: "eBikeBattery",
      voltage: step.voltage,
      current: -2.5, // Negativo = cargando
      percent: step.percent,
      charging: true,
      cycles: 15,
      timestamp: Date.now()
    }, step.description);
    
    // Esperar 2 segundos entre cada envío
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Test completado');
  console.log('='.repeat(60));
  console.log('\nResultado esperado:');
  console.log('- Solo el paso 6 (primera vez al 100%) debe haber enviado email');
  console.log('- Los pasos 7 y 8 no deben haber enviado email (ya estaba al 100%)');
  console.log('\nRevisa tu email para confirmar que solo recibiste UN mensaje de carga completa.');
}

testChargeSequence().catch(console.error);
