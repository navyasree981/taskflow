// =============================================================================
// socket.js — Socket.IO setup and all real-time event handlers
//
// KEY IMPROVEMENT: exposes io.broadcastToBoard(event, data, excludeSocketId)
// so controllers can emit to everyone in a board room EXCEPT the originating
// socket. This eliminates the need for client-side duplicate-detection hacks
// for task:created, list:created, etc.
// =============================================================================

const { Server } = require("socket.io");

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // boardId -> Map<socketId, { userId, userName, socketId }>
  const boardUsers = new Map();

  // ── socketId -> boardId reverse-lookup (for fast disconnect cleanup) ──
  const socketBoards = new Map();

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── Join a board room ────────────────────────────────────────────────
    socket.on("join-board", ({ boardId, userId, userName }) => {
      socket.join(`board:${boardId}`);

      if (!boardUsers.has(boardId)) boardUsers.set(boardId, new Map());
      boardUsers
        .get(boardId)
        .set(socket.id, { userId, userName, socketId: socket.id });

      // Track which board this socket is in (for disconnect cleanup)
      socketBoards.set(socket.id, boardId);

      const activeUsers = Array.from(boardUsers.get(boardId).values());
      socket
        .to(`board:${boardId}`)
        .emit("user:joined", { userId, userName, activeUsers });
      socket.emit("board:active-users", activeUsers);

      console.log(`👤 ${userName} joined board ${boardId}`);
    });

    // ── Leave a board room ───────────────────────────────────────────────
    socket.on("leave-board", ({ boardId }) => {
      socket.leave(`board:${boardId}`);
      removeUser(boardId, socket.id);
      socketBoards.delete(socket.id);
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      // Use reverse-lookup instead of iterating all boards
      const boardId = socketBoards.get(socket.id);
      if (boardId) {
        removeUser(boardId, socket.id);
        socketBoards.delete(socket.id);
      }
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  // ── Helper: remove user from a board and notify others ──────────────────
  const removeUser = (boardId, socketId) => {
    if (!boardUsers.has(boardId)) return;
    const users = boardUsers.get(boardId);
    const user = users.get(socketId);
    if (!user) return;

    users.delete(socketId);
    if (users.size === 0) boardUsers.delete(boardId);

    io.to(`board:${boardId}`).emit("user:left", {
      userId: user.userId,
      userName: user.userName,
      activeUsers: Array.from((boardUsers.get(boardId) || new Map()).values()),
    });
  };

  // ── broadcastToBoard ─────────────────────────────────────────────────────
  // Emit an event to everyone in a board room, optionally excluding one socket.
  // Usage in controllers:
  //   req.app.get("io").broadcastToBoard(
  //     `board:${boardId}`,   // room
  //     "task:created",       // event
  //     { task, listId },     // payload
  //     req.headers["x-socket-id"]  // excludeSocketId (may be undefined)
  //   );
  io.broadcastToBoard = (room, event, data, excludeSocketId) => {
    if (excludeSocketId) {
      // Emit to everyone in the room EXCEPT the originating socket
      io.to(room).except(excludeSocketId).emit(event, data);
    } else {
      // No socket to exclude — broadcast to everyone (fallback)
      io.to(room).emit(event, data);
    }
  };

  return io;
};

module.exports = initSocket;
