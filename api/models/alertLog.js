const mongoose = require('mongoose');

// Modelo para trackear las alertas enviadas y evitar spam
const alertLogSchema = new mongoose.Schema({
  alertType: { type: String, required: true }, // 'critical', 'urgent', 'warning', 'charge_complete'
  lastSent: { type: Date, required: true },
  count: { type: Number, default: 1 }
});

module.exports = mongoose.model('AlertLog', alertLogSchema);
