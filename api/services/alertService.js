const nodemailer = require('nodemailer');
const AlertLog = require('../models/alertLog');

// Tiempo mínimo entre alertas del mismo tipo (en horas)
const ALERT_COOLDOWN = {
  'CRÍTICO': 2,      // 2 horas para alertas críticas
  'URGENTE': 4,      // 4 horas para urgentes
  'ADVERTENCIA': 12, // 12 horas para advertencias
  'charge_complete': 24 // 24 horas para carga completa
};

// Configurar transportador de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verificar si se puede enviar una alerta (throttling)
async function canSendAlert(alertType) {
  try {
    const cooldownHours = ALERT_COOLDOWN[alertType] || 6;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    
    const lastAlert = await AlertLog.findOne({ alertType }).sort({ lastSent: -1 });
    
    if (!lastAlert) {
      return true; // Primera vez que se envía esta alerta
    }
    
    const timeSinceLastAlert = Date.now() - lastAlert.lastSent.getTime();
    return timeSinceLastAlert >= cooldownMs;
  } catch (error) {
    console.error('Error verificando cooldown de alerta:', error);
    return true; // En caso de error, permitir envío
  }
}

// Registrar que se envió una alerta
async function logAlert(alertType) {
  try {
    await AlertLog.create({
      alertType,
      lastSent: new Date()
    });
  } catch (error) {
    console.error('Error registrando alerta:', error);
  }
}

// Analizar estado de la batería 10s3p
function analyzeBatteryStatus(data) {
  const alerts = [];
  const { voltage, percent, current, remainingAh, charging, cycles, maxCycles } = data;

  // Voltaje crítico bajo (< 32V = 3.2V por celda)
  if (voltage < 32 && !charging) {
    alerts.push({
      level: 'CRÍTICO',
      issue: 'Voltaje extremadamente bajo',
      detail: `${voltage.toFixed(2)}V - Riesgo de daño permanente a las celdas`,
      action: '⚠️ APAGA el sistema INMEDIATAMENTE y carga la batería. No usar hasta que supere 36V.'
    });
  }
  // Voltaje bajo (< 34V = 3.4V por celda)
  else if (voltage < 34 && !charging) {
    alerts.push({
      level: 'URGENTE',
      issue: 'Voltaje bajo',
      detail: `${voltage.toFixed(2)}V - Las celdas están bajo estrés`,
      action: 'Carga la batería lo antes posible. Evita uso intensivo.'
    });
  }

  // Porcentaje crítico
  if (percent < 15 && !charging) {
    alerts.push({
      level: 'CRÍTICO',
      issue: 'Batería casi agotada',
      detail: `${percent.toFixed(1)}% restante`,
      action: 'Carga inmediatamente para evitar descarga profunda y pérdida de capacidad.'
    });
  } else if (percent < 25 && !charging) {
    alerts.push({
      level: 'ADVERTENCIA',
      issue: 'Batería baja',
      detail: `${percent.toFixed(1)}% restante`,
      action: 'Planifica una recarga pronto. La batería de litio dura más si evitas descargas profundas.'
    });
  }

  // Sobrevoltaje (> 42V = 4.2V por celda)
  if (voltage > 42) {
    alerts.push({
      level: 'CRÍTICO',
      issue: 'Sobrevoltaje detectado',
      detail: `${voltage.toFixed(2)}V - Excede el límite seguro de 42V`,
      action: '⚠️ DESCONECTA el cargador INMEDIATAMENTE. Verifica el BMS y el cargador.'
    });
  }

  // Corriente de descarga muy alta
  if (current > 15 && !charging) {
    alerts.push({
      level: 'ADVERTENCIA',
      issue: 'Corriente de descarga alta',
      detail: `${current.toFixed(2)}A - Sobrecarga del sistema`,
      action: 'Reduce la carga/velocidad. El uso intensivo continuo acorta la vida útil.'
    });
  }

  // Capacidad restante muy baja
  if (remainingAh < 0.5 && !charging) {
    alerts.push({
      level: 'URGENTE',
      issue: 'Capacidad casi agotada',
      detail: `${remainingAh.toFixed(2)}Ah restantes`,
      action: 'Batería prácticamente vacía. Carga inmediatamente.'
    });
  }

  // Ciclos de vida
  const cyclePercent = (cycles / maxCycles) * 100;
  if (cyclePercent > 90) {
    alerts.push({
      level: 'ADVERTENCIA',
      issue: 'Batería cerca del fin de vida útil',
      detail: `${cycles} de ${maxCycles} ciclos (${cyclePercent.toFixed(0)}%)`,
      action: 'Considera reemplazar la batería pronto. La capacidad puede degradarse rápidamente.'
    });
  }

  return alerts;
}

// Generar contenido del email
function generateEmailContent(data, alerts) {
  const { device, name, voltage, current, percent, remainingAh, consumedAh, cycles, charging } = data;

  const criticalCount = alerts.filter(a => a.level === 'CRÍTICO').length;
  const urgentCount = alerts.filter(a => a.level === 'URGENTE').length;

  let subject = `🔋 Alerta de Batería - ${name}`;
  if (criticalCount > 0) subject = `🚨 CRÍTICO: ${subject}`;
  else if (urgentCount > 0) subject = `⚠️ URGENTE: ${subject}`;

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🔋 Alerta de Estado de Batería</h2>
      
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0;">Estado Actual</h3>
        <table style="width: 100%;">
          <tr><td><strong>Dispositivo:</strong></td><td>${device} (${name})</td></tr>
          <tr><td><strong>Voltaje:</strong></td><td>${voltage.toFixed(2)}V</td></tr>
          <tr><td><strong>Nivel:</strong></td><td>${percent.toFixed(1)}%</td></tr>
          <tr><td><strong>Corriente:</strong></td><td>${current.toFixed(2)}A</td></tr>
          <tr><td><strong>Capacidad restante:</strong></td><td>${remainingAh.toFixed(2)}Ah</td></tr>
          <tr><td><strong>Consumidos:</strong></td><td>${consumedAh.toFixed(2)}Ah</td></tr>
          <tr><td><strong>Ciclos:</strong></td><td>${cycles}</td></tr>
          <tr><td><strong>Estado:</strong></td><td>${charging ? '🔌 Cargando' : '🔋 En uso'}</td></tr>
        </table>
      </div>

      <h3 style="color: #dc2626;">Alertas Detectadas</h3>
  `;

  alerts.forEach(alert => {
    let color = '#dc2626'; // rojo
    if (alert.level === 'URGENTE') color = '#f59e0b'; // naranja
    if (alert.level === 'ADVERTENCIA') color = '#eab308'; // amarillo

    html += `
      <div style="border-left: 4px solid ${color}; padding: 15px; margin-bottom: 15px; background: #fef2f2;">
        <h4 style="margin-top: 0; color: ${color};">${alert.level}: ${alert.issue}</h4>
        <p style="margin: 5px 0;"><strong>Detalle:</strong> ${alert.detail}</p>
        <p style="margin: 5px 0; color: #991b1b;"><strong>Acción requerida:</strong> ${alert.action}</p>
      </div>
    `;
  });

  html += `
      <div style="margin-top: 30px; padding: 15px; background: #e0f2fe; border-radius: 8px;">
        <h4>💡 Recomendaciones para baterías de litio 10s3p:</h4>
        <ul style="margin: 10px 0;">
          <li>Rango óptimo de operación: 33V - 41V</li>
          <li>Evita descargas por debajo de 32V (3.2V/celda)</li>
          <li>No cargues por encima de 42V (4.2V/celda)</li>
          <li>Guarda con 50-60% de carga si no usas por tiempo prolongado</li>
          <li>Verifica el BMS regularmente para mantener celdas balanceadas</li>
        </ul>
      </div>

      <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
        Este email fue generado automáticamente por el sistema de monitoreo de Bike Projecto.<br>
        Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' })}
      </p>
    </div>
  `;

  return { subject, html };
}

// Enviar email de alerta
async function sendAlertEmail(data, alerts) {
  if (alerts.length === 0) return null;

  // Determinar el nivel más alto de alerta
  const hasCritical = alerts.some(a => a.level === 'CRÍTICO');
  const hasUrgent = alerts.some(a => a.level === 'URGENTE');
  
  let alertType;
  if (hasCritical) alertType = 'CRÍTICO';
  else if (hasUrgent) alertType = 'URGENTE';
  else alertType = 'ADVERTENCIA';

  // Verificar throttling
  const canSend = await canSendAlert(alertType);
  if (!canSend) {
    console.log(`⏸️ Alerta ${alertType} en cooldown. No se envía email.`);
    return null;
  }

  const { subject, html } = generateEmailContent(data, alerts);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ALERT_EMAIL,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email de alerta enviado: ${info.messageId}`);
    
    // Registrar que se envió la alerta
    await logAlert(alertType);
    
    return info;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

// Enviar email de carga completa
async function sendChargeCompleteEmail(data) {
  // Verificar throttling para carga completa
  const canSend = await canSendAlert('charge_complete');
  if (!canSend) {
    console.log(`⏸️ Alerta de carga completa en cooldown. No se envía email.`);
    return null;
  }

  const { device, voltage, percent, cycles } = data;

  const subject = `✅ Carga Completa - ${device}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">✅ Carga Completa</h2>
      
      <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669;">
        <p style="margin: 0; font-size: 18px;">Tu batería ha alcanzado el 100% de carga</p>
      </div>

      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0;">Estado Final</h3>
        <table style="width: 100%;">
          <tr><td><strong>Dispositivo:</strong></td><td>${device}</td></tr>
          <tr><td><strong>Voltaje:</strong></td><td>${voltage.toFixed(2)}V</td></tr>
          <tr><td><strong>Nivel:</strong></td><td>${percent.toFixed(1)}%</td></tr>
          <tr><td><strong>Ciclos:</strong></td><td>${cycles}</td></tr>
        </table>
      </div>

      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h4 style="margin-top: 0; color: #1e40af;">📌 Recordatorio:</h4>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Desconecta el cargador para prolongar la vida útil de la batería</li>
          <li>El voltaje óptimo para almacenaje prolongado es 36-38V (50-60%)</li>
          <li>Evita dejar la batería al 100% sin usar por períodos largos</li>
          <li>Para viajes cortos, no es necesario cargar hasta el 100%</li>
        </ul>
      </div>

      <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
        Este email fue generado automáticamente por el sistema de monitoreo de Bike Projecto.<br>
        Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' })}
      </p>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ALERT_EMAIL,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email de carga completa enviado: ${info.messageId}`);
    
    // Registrar que se envió la alerta
    await logAlert('charge_complete');
    
    return info;
  } catch (error) {
    console.error('❌ Error enviando email de carga completa:', error);
    throw error;
  }
}

module.exports = {
  analyzeBatteryStatus,
  sendAlertEmail,
  sendChargeCompleteEmail
};
