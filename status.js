const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", async (req, res) => {
    try {

        const [rows] = await db.query(
            "SELECT * FROM device_status LIMIT 1"
        );

        if (rows.length === 0) {
            return res.json({
                success: false,
                connected: false
            });
        }

        const status = rows[0];

        // seconds since Arduino last updated
        const diff =
            (Date.now() - new Date(status.last_seen).getTime()) / 1000;

        const connected = diff <= 10;

res.json({
    success: true,
    connected,

    temperature: connected ? Number(status.temperature) : null,
    humidity: connected ? Number(status.humidity) : null,
    rain: connected ? status.rain : null,

    // NEW
    rfid_uid: status.rfid_uid,

    door_state: status.door_state,
    clothes_state: status.clothes_state,
    red_led: status.red_led,
    white_led: status.white_led,

    last_seen: status.last_seen
});

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false
        });
    }
});

module.exports = router;