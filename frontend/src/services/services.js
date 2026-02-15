// =============================================================================
// services.js — Axios API client + Socket.IO service
// FIX: Use sessionStorage for auth token so multiple users logged in to
//      different tabs don't overwrite each other's tokens in localStorage.
//      sessionStorage is per-tab — each browser tab has its own isolated store.
// =============================================================================

import axios from "axios";
import { io } from "socket.io-client";

// =============================================================================
// TOKEN HELPERS
// Token is stored in sessionStorage (per-tab) with localStorage as fallback
// for page refreshes within the same tab.
// =============================================================================

const TOKEN_KEY = "tf_token";
const USER_KEY = "tf_user";

export const storage = {
  getToken: () =>
    sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY),

  setToken: (token) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token); // keep for same-tab refresh
  },

  getUser: () => {
    const raw =
      sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser: (user) => {
    const str = JSON.stringify(user);
    sessionStorage.setItem(USER_KEY, str);
    localStorage.setItem(USER_KEY, str);
  },

  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// =============================================================================
// AXIOS INSTANCE
// =============================================================================

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Send socket ID so the server can exclude us from our own broadcast events.
  // This is the server-side fix for duplicate task/list creation.
  const socketId = getSocket()?.id;
  if (socketId) config.headers["x-socket-id"] = socketId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      storage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// =============================================================================
// AUTH API
// =============================================================================

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateMe: (data) => api.put("/auth/me", data),
};

// =============================================================================
// BOARDS API
// =============================================================================

export const boardsAPI = {
  getAll: () => api.get("/boards"),
  create: (data) => api.post("/boards", data),
  getById: (id) => api.get(`/boards/${id}`),
  update: (id, data) => api.put(`/boards/${id}`, data),
  delete: (id) => api.delete(`/boards/${id}`),
  addMember: (id, data) => api.post(`/boards/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/boards/${id}/members/${userId}`),
};

// =============================================================================
// LISTS API
// =============================================================================

export const listsAPI = {
  create: (data) => api.post("/lists", data),
  update: (id, data) => api.put(`/lists/${id}`, data),
  delete: (id) => api.delete(`/lists/${id}`),
  reorder: (data) => api.put("/lists/reorder", data),
};

// =============================================================================
// TASKS API
// =============================================================================

export const tasksAPI = {
  create: (data) => api.post("/tasks", data),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  move: (id, data) => api.put(`/tasks/${id}/move`, data),
  assign: (id, data) => api.post(`/tasks/${id}/assign`, data),
  search: (params) => api.get("/tasks/search", { params }),
};

// =============================================================================
// ACTIVITY API
// =============================================================================

export const activityAPI = {
  getByBoard: (boardId, params) =>
    api.get(`/activity/board/${boardId}`, { params }),
};

// =============================================================================
// USERS API
// =============================================================================

export const usersAPI = {
  search: (q) => api.get("/users/search", { params: { q } }),
};

// =============================================================================
// SOCKET.IO SERVICE
// =============================================================================

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};

export const joinBoard = (boardId, user) => {
  getSocket().emit("join-board", {
    boardId,
    userId: user._id,
    userName: user.name,
  });
};

export const leaveBoard = (boardId) => {
  getSocket().emit("leave-board", { boardId });
};
