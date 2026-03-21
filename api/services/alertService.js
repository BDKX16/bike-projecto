const nodemailer = require('nodemailer');
const AlertLog = require('../models/alertLog');

// Tiempo mínimo entre alertas del mismo tipo (en horas)
const ALERT_COOLDOWN = {
  'CRÍTICO': 2,      // 2 horas para alertas críticas
  'URGENTE': 4,      // 4 horas para urgentes
  'ADVERTENCIA': 12, // 12 horas para advertencias
  'charge_complete': 24, // 24 horas para carga completa
  'charge_started': 6     // 6 horas para inicio de carga
};

// Configurar transportador de email
// Soporta tanto Gmail como SMTP personalizado
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const isSecurePort = smtpPort === 465; // Puerto 465 requiere secure: true

const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST ? {
    // SMTP personalizado
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: isSecurePort || process.env.SMTP_SECURE === 'true', // true para 465, false para 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: false
    }
  } : {
    // Gmail por defecto
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: false
    }
  }
);

// Verificar configuración del transporter al iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error en configuración de email:', error.message);
  } else {
    console.log('✅ Servicio de email configurado correctamente');
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
  // Durante la carga es normal llegar a 42V, solo alertar si:
  // - Voltaje > 42.5V (sobrecarga peligrosa), O
  // - Voltaje > 42V y NO está cargando (indica problema en BMS)
  if (voltage > 42.5 || (voltage > 42 && !charging)) {
    alerts.push({
      level: 'CRÍTICO',
      issue: 'Sobrevoltaje detectado',
      detail: `${voltage.toFixed(2)}V - Excede el límite seguro`,
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
async function sendAlertEmail(data, alerts, settings = null) {
  if (alerts.length === 0) return null;

  // Si hay configuración, verificar si los emails están habilitados
  if (settings && !settings.emailNotifications?.enabled) {
    console.log('📧 Emails de notificación deshabilitados en configuración');
    return null;
  }

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

  // Usar el email de la configuración si está disponible, sino usar el de .env
  const recipientEmail = settings?.emailNotifications?.email || process.env.ALERT_EMAIL;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email de alerta enviado a ${recipientEmail}: ${info.messageId}`);
    
    // Registrar que se envió la alerta
    await logAlert(alertType);
    
    return info;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

// Enviar email de carga completa
async function sendChargeCompleteEmail(data, settings = null) {
  // Si hay configuración, verificar si está habilitado
  if (settings && !settings.emailNotifications?.enabled) {
    console.log('📧 Emails de notificación deshabilitados en configuración');
    return null;
  }

  if (settings && !settings.emailNotifications?.chargeCompleteAlert?.enabled) {
    console.log('📧 Alerta de carga completa deshabilitada en configuración');
    return null;
  }

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

  // Usar el email de la configuración si está disponible, sino usar el de .env
  const recipientEmail = settings?.emailNotifications?.email || process.env.ALERT_EMAIL;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email de carga completa enviado a ${recipientEmail}: ${info.messageId}`);
    
    // Registrar que se envió la alerta
    await logAlert('charge_complete');
    
    return info;
  } catch (error) {
    console.error('❌ Error enviando email de carga completa:', error.message);
    throw error;
  }
}

// Enviar email de inicio de carga con estimado de tiempo
async function sendChargeStartedEmail(data, settings = null) {
  // Si hay configuración, verificar si está habilitado
  if (settings && !settings.emailNotifications?.enabled) {
    console.log('📧 Emails de notificación deshabilitados en configuración');
    return null;
  }

  if (settings && !settings.emailNotifications?.chargeStartedAlert?.enabled) {
    console.log('📧 Alerta de inicio de carga deshabilitada en configuración');
    return null;
  }

  // Verificar throttling para inicio de carga (6 horas mínimo entre alertas)
  const canSend = await canSendAlert('charge_started');
  if (!canSend) {
    console.log(`⏸️ Alerta de inicio de carga en cooldown. No se envía email.`);
    return null;
  }

  const { device, voltage, percent, current, remainingAh, cycles } = data;

  // Calcular tiempo estimado de carga
  // Fórmula: Tiempo (horas) = Capacidad restante (Ah) / Corriente de carga (A)
  // Capacidad total de batería 10s3p ≈ 7.5Ah (2500mAh x 3 = 7500mAh)
  const totalCapacityAh = 7.5;
  const currentPercent = percent;
  const remainingPercent = 100 - currentPercent;
  const remainingCapacity = (remainingPercent / 100) * totalCapacityAh;
  
  // Corriente de carga (valor absoluto, ya que el sensor puede reportarla como negativa)
  const chargingCurrent = Math.abs(current);
  
  // Calcular tiempo en horas (con factor de eficiencia 0.85)
  const estimatedHours = chargingCurrent > 0.1 
    ? (remainingCapacity / chargingCurrent) * 1.15  // Factor 1.15 por ineficiencias
    : 0;
  
  // Convertir a horas y minutos
  const hours = Math.floor(estimatedHours);
  const minutes = Math.round((estimatedHours - hours) * 60);
  
  let timeEstimate = '';
  if (estimatedHours < 0.1) {
    timeEstimate = 'Carga casi completa';
  } else if (hours === 0) {
    timeEstimate = `${minutes} minutos`;
  } else if (hours === 1) {
    timeEstimate = minutes > 0 ? `1 hora ${minutes} minutos` : '1 hora';
  } else {
    timeEstimate = minutes > 0 ? `${hours} horas ${minutes} minutos` : `${hours} horas`;
  }

  const subject = `🔌 Inicio de Carga - ${device}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🔌 Inicio de Carga Detectado</h2>
      
      <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
        <p style="margin: 0; font-size: 18px;">Tu batería ha comenzado a cargar</p>
      </div>

      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0;">Estado Actual</h3>
        <table style="width: 100%;">
          <tr><td><strong>Dispositivo:</strong></td><td>${device}</td></tr>
          <tr><td><strong>Voltaje:</strong></td><td>${voltage.toFixed(2)}V</td></tr>
          <tr><td><strong>Nivel actual:</strong></td><td>${percent.toFixed(1)}%</td></tr>
          <tr><td><strong>Corriente de carga:</strong></td><td>${chargingCurrent.toFixed(2)}A</td></tr>
          <tr><td><strong>Capacidad restante:</strong></td><td>${remainingCapacity.toFixed(2)}Ah</td></tr>
          <tr><td><strong>Ciclos:</strong></td><td>${cycles}</td></tr>
        </table>
      </div>

      <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669;">
        <h3 style="margin-top: 0; color: #059669;">⏱️ Tiempo Estimado de Carga</h3>
        <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #047857;">${timeEstimate}</p>
        <p style="margin: 5px 0; font-size: 12px; color: #065f46;">
          ${chargingCurrent > 0.1 
            ? `Con una corriente de ${chargingCurrent.toFixed(2)}A, se estima alcanzar el 100% en aproximadamente ${timeEstimate}`
            : 'Corriente de carga muy baja o estabilizándose'}
        </p>
      </div>

      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h4 style="margin-top: 0; color: #92400e;">💡 Consejos de Carga:</h4>
        <ul style="margin: 10px 0; padding-left: 20px; color: #78350f;">
          <li>La carga rápida puede disminuir ligeramente la vida útil de la batería</li>
          <li>Para uso diario, no es necesario cargar hasta el 100%</li>
          <li>El rango 20%-80% es ideal para maximizar la longevidad</li>
          <li>Evita interrumpir la carga frecuentemente</li>
          <li>Verifica que el voltaje no supere 42V (4.2V/celda)</li>
        </ul>
      </div>

      <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
        Este email fue generado automáticamente por el sistema de monitoreo de Bike Projecto.<br>
        Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' })}
      </p>
    </div>
  `;

  // Usar el email de la configuración si está disponible, sino usar el de .env
  const recipientEmail = settings?.emailNotifications?.email || process.env.ALERT_EMAIL;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email de inicio de carga enviado a ${recipientEmail}: ${info.messageId}`);
    
    // Registrar que se envió la alerta
    await logAlert('charge_started');
    
    return info;
  } catch (error) {
    console.error('❌ Error enviando email de inicio de carga:', error.message);
    throw error;
  }
}

module.exports = {
  analyzeBatteryStatus,
  sendAlertEmail,
  sendChargeCompleteEmail,
  sendChargeStartedEmail
};
