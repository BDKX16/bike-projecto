const mongoose = require('mongoose');

const bikeDataSchema = new mongoose.Schema({
  device: { type: String, required: true },
  name: { type: String },
  voltage: { type: Number, required: true },
  current: { type: Number, required: true },
  percent: { type: Number, required: true },
  remainingAh: { type: Number },
  consumedAh: { type: Number },
  cycles: { type: Number, required: true },
  maxCycles: { type: Number },
  charging: { type: Boolean, required: true },
  espTimestamp: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BikeData', bikeDataSchema);
