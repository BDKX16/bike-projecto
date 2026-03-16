/**
 * Test de campo gpioVoltage para debug
 * 
 * Envía datos con el campo gpioVoltage incluido y verifica que se persista correctamente en MongoDB
 */

require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3120';

async function testGpioVoltage() {
  console.log('🧪 Test de gpioVoltage para debug\n');
  
  const testData = {
    device: "eBikeBattery",
    name: "Test GPIO",
    voltage: 38.45,
    current: 2.134,
    percent: 75.3,
    remainingAh: 3.01,
    consumedAh: 0.99,
    cycles: 15,
    maxCycles: 100,
    charging: false,
    gpioVoltage: 2.856, // Voltaje GPIO raw para debug
    timestamp: Date.now()
  };

  try {
    console.log('📤 Enviando datos con gpioVoltage:', testData.gpioVoltage);
    
    const response = await fetch(`${API_URL}/api/battery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Datos guardados exitosamente');
      console.log('📊 Respuesta:', JSON.stringify(result.data, null, 2));
      
      if (result.data.gpioVoltage !== undefined) {
        console.log('✅ gpioVoltage persistido correctamente:', result.data.gpioVoltage);
      } else {
        console.log('❌ gpioVoltage NO se guardó en la base de datos');
      }
    } else {
      console.log('❌ Error:', result.error);
    }
    
    // Verificar que se puede recuperar
    console.log('\n📥 Recuperando último registro...');
    const latestResponse = await fetch(`${API_URL}/api/bike-data/latest`);
    const latestResult = await latestResponse.json();
    
    if (latestResult.success) {
      console.log('✅ Último registro recuperado');
      console.log('   gpioVoltage:', latestResult.data.gpioVoltage);
      console.log('   voltage:', latestResult.data.voltage);
      console.log('   percent:', latestResult.data.percent);
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    console.error('💡 Asegúrate de que el servidor esté corriendo en', API_URL);
  }
}

// Ejecutar test
testGpioVoltage();
