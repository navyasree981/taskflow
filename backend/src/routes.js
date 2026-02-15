// =============================================================================
// routes.js — All Express routes in one file
// Sections: AUTH | BOARDS | LISTS | TASKS | ACTIVITY | USERS
// =============================================================================

const express = require("express");
const router = express.Router();
const { protect } = require("./middleware");
const {
  register,
  login,
  getMe,
  updateMe,
  getBoards,
  createBoard,
  getBoard,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember,
  createList,
  updateList,
  deleteList,
  reorderLists,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  moveTask,
  assignUser,
  searchTasks,
  getBoardActivity,
  searchUsers,
} = require("./controllers");

// =============================================================================
// AUTH ROUTES  —  /api/auth/...
// =============================================================================
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", protect, getMe);
router.put("/auth/me", protect, updateMe);

// =============================================================================
// BOARD ROUTES  —  /api/boards/...
// =============================================================================
router.get("/boards", protect, getBoards);
router.post("/boards", protect, createBoard);
router.get("/boards/:id", protect, getBoard);
router.put("/boards/:id", protect, updateBoard);
router.delete("/boards/:id", protect, deleteBoard);
router.post("/boards/:id/members", protect, addMember);
router.delete("/boards/:id/members/:userId", protect, removeMember);

// =============================================================================
// LIST ROUTES  —  /api/lists/...
// =============================================================================
router.post("/lists", protect, createList);
router.put("/lists/reorder", protect, reorderLists); // must be before /:id
router.put("/lists/:id", protect, updateList);
router.delete("/lists/:id", protect, deleteList);

// =============================================================================
// TASK ROUTES  —  /api/tasks/...
// =============================================================================
router.get("/tasks/search", protect, searchTasks); // must be before /:id
router.post("/tasks", protect, createTask);
router.get("/tasks/:id", protect, getTask);
router.put("/tasks/:id", protect, updateTask);
router.delete("/tasks/:id", protect, deleteTask);
router.put("/tasks/:id/move", protect, moveTask);
router.post("/tasks/:id/assign", protect, assignUser);

// =============================================================================
// ACTIVITY ROUTES  —  /api/activity/...
// =============================================================================
router.get("/activity/board/:boardId", protect, getBoardActivity);

// =============================================================================
// USER ROUTES  —  /api/users/...
// =============================================================================
router.get("/users/search", protect, searchUsers);

module.exports = router;
