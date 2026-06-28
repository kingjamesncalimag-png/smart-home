const express = require("express");
const router = express.Router();
const db = require("../database");

// GET /api/history?limit=20
router.get("/", async (req, res) => {
    try {

        const limit = parseInt(req.query.limit) || 20;

        const [rows] = await db.execute(
            "SELECT id, temperature, humidity, rain, created_at FROM sensor_readings ORDER BY id DESC LIMIT ?",
            [limit]
        );

        // FIX: return plain array so script.js Array.isArray() check passes
        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json([]);
    }
});

module.exports = router;
