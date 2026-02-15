// =============================================================================
// utils.js — DB connection, JWT helper, Activity logger
// =============================================================================

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

const connectDB = async () => {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/taskflow";
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    throw err;
  }
};

// =============================================================================
// JWT HELPER
// =============================================================================

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// =============================================================================
// ACTIVITY LOGGER
// =============================================================================

const logActivity = async (
  app,
  { boardId, userId, type, entity, entityId, entityTitle, meta, description },
) => {
  try {
    // Lazy-require to avoid circular dep with models
    const { Activity } = require("./models");
    const activity = await Activity.create({
      board: boardId,
      user: userId,
      type,
      entity,
      entityId,
      entityTitle,
      meta: meta || {},
      description,
    });
    await activity.populate("user", "name email color avatar");

    const io = app.get("io");
    if (io) io.to(`board:${boardId}`).emit("activity:new", activity);

    return activity;
  } catch (err) {
    console.error("Activity log error:", err.message);
  }
};

module.exports = { connectDB, generateToken, logActivity };
