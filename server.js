require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// ========================================
// Middleware
// ========================================
app.use(cors());
app.use(express.json());

// ========================================
// Start Serial Communication
// ========================================
require("./serial");

// ========================================
// API Routes
// ========================================
const statusRoute = require("./routes/status");
const historyRoute = require("./routes/history");

app.use("/api/status", statusRoute);
app.use("/api/history", historyRoute);

// ========================================
// Home Route
// ========================================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Smart Home Backend Running"
    });
});

// ========================================
// 404 Route
// ========================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found"
    });
});

// ========================================
// Start Server
// ========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
==========================================
🏠 Smart Home Backend Started
==========================================
🚀 Server : http://localhost:${PORT}
📡 Serial : Running
🌐 API:
   ✔ GET  /api/status
   ✔ GET  /api/history
==========================================
`);
});