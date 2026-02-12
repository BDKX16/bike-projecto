// Script para probar el throttling de alertas
// Ejecutar con: node test-throttling.js

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/battery';

async function sendCriticalAlert(attemptNumber) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Intento ${attemptNumber}: Enviando alerta CRÍTICA (voltaje < 32V)`);
  console.log('='.repeat(60));
  
  try {
    const response = await axios.post(API_URL, {
      device: "eBikeBattery",
      name: "Hover 10s2p",
      voltage: 31.5,
      current: 0.8,
      percent: 8.0,
      remainingAh: 0.32,
      consumedAh: 3.68,
      cycles: 15,
      maxCycles: 100,
      charging: false,
      timestamp: Date.now()
    });
    
    console.log('✅ Estado:', response.status);
    
    if (response.data.emailSent) {
      console.log('📧 EMAIL ENVIADO ✉️');
      console.log('   → Primera vez detectando esta alerta o cooldown expirado');
    } else {
      console.log('⏸️  SIN EMAIL (throttling activo)');
      console.log('   → La alerta ya fue enviada recientemente');
    }
    
    if (response.data.alerts) {
      console.log(`\nAlertas detectadas: ${response.data.alerts.length}`);
      response.data.alerts.forEach(alert => {
        console.log(`   • [${alert.level}] ${alert.issue}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testThrottling() {
  console.log('🧪 Probando sistema de throttling de alertas...\n');
  console.log('Este test envía la misma alerta CRÍTICA 3 veces consecutivas.');
  console.log('Solo la primera debe enviar email. Las siguientes deben estar en cooldown (2 horas).\n');
  
  // Enviar la misma alerta 3 veces
  for (let i = 1; i <= 3; i++) {
    await sendCriticalAlert(i);
    
    if (i < 3) {
      console.log('\nEsperando 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Test completado');
  console.log('='.repeat(60));
  console.log('\nResultado esperado:');
  console.log('- Intento 1: EMAIL ENVIADO ✉️');
  console.log('- Intento 2: SIN EMAIL (throttling)');
  console.log('- Intento 3: SIN EMAIL (throttling)');
  console.log('\nEl cooldown para alertas CRÍTICAS es de 2 horas.');
  console.log('Si ejecutas este test después de 2 horas, el intento 1 enviará email de nuevo.');
  console.log('\nRevisa tu email para confirmar que solo recibiste UN mensaje.');
}

testThrottling().catch(console.error);
