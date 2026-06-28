require("dotenv").config();
const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

(async () => {
    try {
        const conn = await db.getConnection();
        console.log("✅ Connected to Railway MySQL");
        conn.release();
    } catch (err) {
        console.error("❌ Database connection failed:");
        console.error(err.message);
    }
})();

module.exports = db;
