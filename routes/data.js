const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Measurement = require('../models/Measurement');
const router = express.Router();

module.exports = (io) => {
    // POST /api/data
    router.post('/',
        body('device_id').isString().trim().notEmpty(),
        body('voltage').optional().isFloat({ min: 0 }),
        body('current').optional().isFloat({ min: 0 }),
        body('power').optional().isFloat(),
        body('energy').optional().isFloat(),
        body('frequency').optional().isFloat(),
        body('timestamp').optional().isISO8601(),
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            try {
                const { device_id, voltage, current, power, energy, frequency, timestamp } = req.body;
                const ts = timestamp ? new Date(timestamp) : new Date();

                const doc = new Measurement({
                    device_id,
                    voltage,
                    current,
                    power,
                    energy,
                    frequency,
                    timestamp: ts
                });

                const saved = await doc.save();

                // Emit via WebSocket if available
                if (io) {
                    io.emit('new-measurement', saved);
                }

                return res.status(201).json({ success: true, data: saved });
            } catch (err) {
                console.error(err);
                return res.status(500).json({ error: 'Server error' });
            }
        }
    );

    // GET /api/data/latest?device_id=ESP32-001
    router.get('/latest', async (req, res) => {
        try {
            const device_id = req.query.device_id;
            const filter = device_id ? { device_id } : {};
            const latest = await Measurement.find(filter).sort({ timestamp: -1 }).limit(1);
            return res.json({ data: latest[0] || null });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // GET /api/data/history?device_id=&page=1&limit=50&from=&to=
    router.get('/history', [
        query('page').optional().toInt(),
        query('limit').optional().toInt()
    ], async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(1000, parseInt(req.query.limit) || 100);
            const device_id = req.query.device_id;
            const from = req.query.from ? new Date(req.query.from) : null;
            const to = req.query.to ? new Date(req.query.to) : null;

            const q = {};
            if (device_id) q.device_id = device_id;
            if (from || to) q.timestamp = {};
            if (from) q.timestamp.$gte = from;
            if (to) q.timestamp.$lte = to;

            const total = await Measurement.countDocuments(q);
            const docs = await Measurement.find(q)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            res.json({ page, limit, total, data: docs });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    return router;
};
