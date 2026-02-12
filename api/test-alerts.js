// Script para probar el sistema de alertas
// Ejecutar con: node test-alerts.js

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/battery';

// Escenarios de prueba
const testScenarios = [
  {
    name: 'Estado normal',
    data: {
      device: "eBikeBattery",
      name: "Hover 10s2p",
      voltage: 38.45,
      current: 2.134,
      percent: 75.3,
      remainingAh: 3.01,
      consumedAh: 0.99,
      cycles: 15,
      maxCycles: 100,
      charging: false,
      timestamp: Date.now()
    }
  },
  {
    name: 'Cargando - 50%',
    data: {
      device: "eBikeBattery",
      voltage: 38.2,
      current: -2.5,
      percent: 50.0,
      cycles: 15,
      charging: true,
      timestamp: Date.now()
    }
  },
  {
    name: 'Cargando - 85%',
    data: {
      device: "eBikeBattery",
      voltage: 40.8,
      current: -2.2,
      percent: 85.3,
      cycles: 15,
      charging: true,
      timestamp: Date.now()
    }
  },
  {
    name: 'Carga completa - 100%',
    data: {
      device: "eBikeBattery",
      voltage: 42.0,
      current: -0.5,
      percent: 100.0,
      cycles: 15,
      charging: true,
      timestamp: Date.now()
    }
  },
  {
    name: 'Batería baja (< 25%)',
    data: {
      device: "eBikeBattery",
      name: "Hover 10s2p",
      voltage: 34.2,
      current: 1.5,
      percent: 22.0,
      remainingAh: 0.88,
      consumedAh: 3.12,
      cycles: 15,
      maxCycles: 100,
      charging: false,
      timestamp: Date.now()
    }
  },
  {
    name: 'Voltaje crítico (< 32V)',
    data: {
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
    }
  },
  {
    name: 'Sobrevoltaje (> 42V)',
    data: {
      device: "eBikeBattery",
      name: "Hover 10s2p",
      voltage: 42.3,
      current: -3.2,
      percent: 98.0,
      remainingAh: 3.92,
      consumedAh: 0.08,
      cycles: 15,
      maxCycles: 100,
      charging: true,
      timestamp: Date.now()
    }
  },
  {
    name: 'Corriente alta',
    data: {
      device: "eBikeBattery",
      name: "Hover 10s2p",
      voltage: 36.8,
      current: 16.5,
      percent: 55.0,
      remainingAh: 2.2,
      consumedAh: 1.8,
      cycles: 15,
      maxCycles: 100,
      charging: false,
      timestamp: Date.now()
    }
  },
  {
    name: 'Fin de vida útil (> 90% ciclos)',
    data: {
      device: "eBikeBattery",
      name: "Hover 10s2p",
      voltage: 37.2,
      current: 2.0,
      percent: 60.0,
      remainingAh: 2.4,
      consumedAh: 1.6,
      cycles: 95,
      maxCycles: 100,
      charging: false,
      timestamp: Date.now()
    }
  }
];

async function testScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Probando: ${scenario.name}`);
  console.log('='.repeat(60));
  
  try {
    const response = await axios.post(API_URL, scenario.data);
    
    console.log('✅ Estado:', response.status);
    console.log('Datos guardados:', response.data.data._id);
    
    if (response.data.alerts && response.data.alerts.length > 0) {
      console.log(`\n⚠️  ${response.data.alerts.length} alerta(s) detectada(s):\n`);
      response.data.alerts.forEach((alert, i) => {
        console.log(`${i + 1}. [${alert.level}] ${alert.issue}`);
        console.log(`   ${alert.detail}`);
        console.log(`   Acción: ${alert.action}\n`);
      });
    } else {
      console.log('\n✓ No se detectaron alertas (estado normal)');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Respuesta:', error.response.data);
    }
  }
}

async function runTests() {
  console.log('🧪 Iniciando pruebas del sistema de alertas...\n');
  console.log('Asegúrate de que la API esté corriendo en http://localhost:3000\n');
  
  for (const scenario of testScenarios) {
    await testScenario(scenario);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo entre pruebas
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Pruebas completadas');
  console.log('='.repeat(60));
  console.log('\nRevisa tu email para ver las alertas enviadas.');
}

runTests().catch(console.error);
