const mongoose = require('mongoose');

const MeasurementSchema = new mongoose.Schema({
    device_id: { type: String, required: true, index: true },
    voltage: { type: Number, default: null },
    current: { type: Number, default: null },
    power: { type: Number, default: null },
    energy: { type: Number, default: null }, // kWh
    lastEnergy: { type: Number, default: null }, // kWh
    frequency: { type: Number, default: null },
    timestamp: { type: Date, required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Measurement', MeasurementSchema);
