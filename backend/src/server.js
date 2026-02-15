// =============================================================================
// server.js — Express app + HTTP server entry point
// =============================================================================

require("dotenv").config();
require("express-async-errors");

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { connectDB } = require("./utils");
const initSocket = require("./socket");
const { errorHandler } = require("./middleware");
const routes = require("./routes");

const app = express();
const server = http.createServer(app);

// ── Socket.IO ───────────────────────────────────────────────────────────────
const io = initSocket(server);
app.set("io", io);

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ── All API routes ────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ message: "Route not found" }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`\n🚀 TaskFlow server running on port ${PORT}`);
      console.log(`📡 Socket.IO enabled`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}\n`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server };
