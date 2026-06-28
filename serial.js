const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const db = require("./database");

// ===== CHANGE THIS IF YOUR PORT CHANGES =====
const PORT = "COM6";
const BAUD = 9600;
// ===========================================

const port = new SerialPort({
    path: PORT,
    baudRate: BAUD,
    autoOpen: false
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

port.open(err => {
    if (err) {
        console.log("Cannot open serial port:", err.message);
        return;
    }
    console.log("Connected to", PORT);
});

parser.on("data", async (line) => {

    line = line.trim();
    console.log("[Arduino]", line);

    try {

        // -----------------------------
        // SENSOR JSON
        // -----------------------------
        if (line.startsWith("SENSOR:")) {

            const json = line.substring(7);
            const data = JSON.parse(json);

            // FIX: 3 columns, 3 placeholders, 3 values (rfid_uid not included here)
            await db.execute(
                `INSERT INTO sensor_readings
                 (temperature, humidity, rain)
                 VALUES (?, ?, ?)`,
                [data.temp, data.humidity, data.rain]
            );

            // FIX: 3 SET columns, 3 values (rfid handled separately in RFID block)
            await db.execute(
                `UPDATE device_status
                 SET temperature=?, humidity=?, rain=?, last_seen=NOW()
                 WHERE id=1`,
                [data.temp, data.humidity, data.rain]
            );
        }

        // -----------------------------
        // RFID
        // -----------------------------
        else if (line.startsWith("RFID:")) {

            const parts = line.split(":");
            const status = parts[1];
            const uid    = parts[2];

            await db.execute(
                `INSERT INTO rfid_logs (uid, status) VALUES (?, ?)`,
                [uid, status]
            );

            await db.execute(
                `UPDATE device_status SET rfid_uid=?, last_seen=NOW() WHERE id=1`,
                [uid]
            );

            console.log("Latest RFID:", uid);
        }

        // -----------------------------
        // Door
        // -----------------------------
        else if (line.startsWith("DOORSTATE:")) {

            const state = line.replace("DOORSTATE:", "");

            await db.execute(
                `UPDATE device_status SET door_state=?, last_seen=NOW() WHERE id=1`,
                [state]
            );
        }

        // -----------------------------
        // Clothesline
        // -----------------------------
        else if (line.startsWith("CLOTHESSTATE:")) {

            const state = line.replace("CLOTHESSTATE:", "");

            await db.execute(
                `UPDATE device_status SET clothes_state=?, last_seen=NOW() WHERE id=1`,
                [state]
            );
        }

        // -----------------------------
        // Red LED
        // -----------------------------
        else if (line.startsWith("LEDSTATE:RED:")) {

            const state = line.replace("LEDSTATE:RED:", "");

            await db.execute(
                `UPDATE device_status SET red_led=?, last_seen=NOW() WHERE id=1`,
                [state]
            );
        }

        // -----------------------------
        // White LED
        // -----------------------------
        else if (line.startsWith("LEDSTATE:WHITE:")) {

            const state = line.replace("LEDSTATE:WHITE:", "");

            await db.execute(
                `UPDATE device_status SET white_led=?, last_seen=NOW() WHERE id=1`,
                [state]
            );
        }

    } catch (err) {
        console.log(err.message);
    }

});

// ====================================================
// Send pending commands to Arduino every 500ms
// ====================================================

setInterval(async () => {

    try {

        const [rows] = await db.execute(
            `SELECT * FROM device_commands WHERE status='pending' ORDER BY id`
        );

        for (const row of rows) {

            port.write(row.command + "\n");

            await db.execute(
                `UPDATE device_commands SET status='sent', sent_at=NOW() WHERE id=?`,
                [row.id]
            );

            console.log("Sent:", row.command);
        }

    } catch (err) {
        console.log(err.message);
    }

}, 500);
