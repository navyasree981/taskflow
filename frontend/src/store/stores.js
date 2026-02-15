// =============================================================================
// stores.js — All Zustand state stores in one file
// Sections: AUTH STORE | BOARD STORE
// Fix: duplicate task bug — createTask does optimistic update; socket echo
//      is now ignored for the creator using a pendingTaskIds Set.
// =============================================================================

import { create } from "zustand";
import {
  authAPI,
  boardsAPI,
  listsAPI,
  tasksAPI,
  storage,
} from "../services/services";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinBoard,
  leaveBoard,
} from "../services/services";

// =============================================================================
// AUTH STORE
// =============================================================================

export const useAuthStore = create((set) => ({
  user: storage.getUser(),
  token: storage.getToken() || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.login({ email, password });
      storage.setToken(data.token);
      storage.setUser(data.user);
      set({ user: data.user, token: data.token, isLoading: false });
      connectSocket();
      return data;
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.register({ name, email, password });
      storage.setToken(data.token);
      storage.setUser(data.user);
      set({ user: data.user, token: data.token, isLoading: false });
      connectSocket();
      return data;
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: () => {
    storage.clear();
    disconnectSocket();
    set({ user: null, token: null });
  },

  updateUser: (user) => {
    storage.setUser(user);
    set({ user });
  },

  clearError: () => set({ error: null }),
}));

// =============================================================================
// BOARD STORE
// =============================================================================

export const useBoardStore = create((set, get) => ({
  boards: [],
  currentBoard: null,
  lists: [],
  isLoading: false,
  error: null,
  activeUsers: [],

  // ── Tracks task IDs we created locally so we can ignore our own socket echo ──
  // This is a Set stored outside Zustand state (no re-render needed).
  // When WE create a task, the server broadcasts task:created to ALL clients
  // including us — causing a duplicate. We add the ID here on create, then
  // skip it in the socket handler and remove it from the set.
  _pendingTaskIds: new Set(),

  // ── Boards ─────────────────────────────────────────────────────────────────
  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const { data } = await boardsAPI.getAll();
      set({ boards: data.boards, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  createBoard: async (boardData) => {
    const { data } = await boardsAPI.create(boardData);
    set((s) => ({ boards: [data.board, ...s.boards] }));
    return data.board;
  },

  fetchBoard: async (boardId, user) => {
    set({ isLoading: true, currentBoard: null, lists: [] });
    try {
      const { data } = await boardsAPI.getById(boardId);
      set({ currentBoard: data.board, lists: data.lists, isLoading: false });
      joinBoard(boardId, user);
      get().setupSocketListeners(boardId);
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  leaveBoard: (boardId) => {
    leaveBoard(boardId);
    get().teardownSocketListeners();
    set({ currentBoard: null, lists: [], activeUsers: [] });
  },

  updateBoard: async (boardId, data) => {
    const { data: res } = await boardsAPI.update(boardId, data);
    set({ currentBoard: res.board });
    set((s) => ({
      boards: s.boards.map((b) => (b._id === boardId ? res.board : b)),
    }));
    return res.board;
  },

  deleteBoard: async (boardId) => {
    await boardsAPI.delete(boardId);
    set((s) => ({ boards: s.boards.filter((b) => b._id !== boardId) }));
  },

  addMember: async (boardId, email, role) => {
    const { data } = await boardsAPI.addMember(boardId, { email, role });
    set({ currentBoard: data.board });
    return data.board;
  },

  removeMember: async (boardId, userId) => {
    const { data } = await boardsAPI.removeMember(boardId, userId);
    set({ currentBoard: data.board });
  },

  // ── Lists ──────────────────────────────────────────────────────────────────
  createList: async (title, boardId) => {
    const { data } = await listsAPI.create({ title, boardId });
    set((s) => ({ lists: [...s.lists, { ...data.list, tasks: [] }] }));
    return data.list;
  },

  updateList: async (listId, updates) => {
    const { data } = await listsAPI.update(listId, updates);
    set((s) => ({
      lists: s.lists.map((l) =>
        l._id === listId ? { ...l, ...data.list } : l,
      ),
    }));
  },

  deleteList: async (listId) => {
    await listsAPI.delete(listId);
    set((s) => ({ lists: s.lists.filter((l) => l._id !== listId) }));
  },

  reorderLists: async (boardId, orderedIds) => {
    const { lists } = get();
    const reordered = orderedIds
      .map((id) => lists.find((l) => l._id === id))
      .filter(Boolean);
    set({ lists: reordered });
    await listsAPI.reorder({ boardId, orderedIds });
  },

  // ── Tasks ──────────────────────────────────────────────────────────────────
  createTask: async (taskData) => {
    const { data } = await tasksAPI.create(taskData);
    const newTask = data.task;

    // ── DUPLICATE FIX ──────────────────────────────────────────────────────
    // Mark this task ID as "created by us". The socket will broadcast
    // task:created to everyone including us. The socket handler checks this
    // set and skips adding it again if we created it.
    get()._pendingTaskIds.add(newTask._id);

    // Optimistic / immediate local update
    set((s) => ({
      lists: s.lists.map((l) =>
        l._id === taskData.listId
          ? { ...l, tasks: [...(l.tasks || []), newTask] }
          : l,
      ),
    }));

    return newTask;
  },

  updateTask: async (taskId, updates) => {
    const { data } = await tasksAPI.update(taskId, updates);
    set((s) => ({
      lists: s.lists.map((l) => ({
        ...l,
        tasks: (l.tasks || []).map((t) => (t._id === taskId ? data.task : t)),
      })),
    }));
    return data.task;
  },

  deleteTask: async (taskId, listId) => {
    await tasksAPI.delete(taskId);
    set((s) => ({
      lists: s.lists.map((l) =>
        l._id === listId
          ? { ...l, tasks: (l.tasks || []).filter((t) => t._id !== taskId) }
          : l,
      ),
    }));
  },

  moveTask: async (taskId, sourceListId, targetListId, position) => {
    const { lists } = get();
    const sourceList = lists.find((l) => l._id === sourceListId);
    const task = sourceList?.tasks?.find((t) => t._id === taskId);
    if (!task) return;

    // Optimistic update
    const updated = lists.map((l) => {
      if (l._id === sourceListId)
        return { ...l, tasks: l.tasks.filter((t) => t._id !== taskId) };
      if (l._id === targetListId) {
        const newTasks = [...(l.tasks || [])];
        newTasks.splice(position, 0, { ...task, list: targetListId });
        return { ...l, tasks: newTasks };
      }
      return l;
    });
    set({ lists: updated });

    try {
      await tasksAPI.move(taskId, { targetListId, position });
    } catch {
      // Revert on error
      const { data } = await boardsAPI.getById(get().currentBoard._id);
      set({ lists: data.lists });
    }
  },

  assignUser: async (taskId, userId, action = "assign") => {
    const { data } = await tasksAPI.assign(taskId, { userId, action });
    set((s) => ({
      lists: s.lists.map((l) => ({
        ...l,
        tasks: (l.tasks || []).map((t) => (t._id === taskId ? data.task : t)),
      })),
    }));
    return data.task;
  },

  // ── Real-time Socket Listeners ─────────────────────────────────────────────
  setupSocketListeners: (_boardId) => {
    const socket = getSocket();

    // ── task:created ──────────────────────────────────────────────────────
    // The server broadcasts this to ALL clients in the room, including the
    // one who created the task. We skip it if WE created it (already in state).
    socket.on("task:created", ({ task, listId }) => {
      const pending = get()._pendingTaskIds;

      if (pending.has(task._id)) {
        // This echo is from our own createTask — discard and clear the flag
        pending.delete(task._id);
        return;
      }

      // Another user created this task — add it if not already present
      set((s) => {
        const alreadyExists = s.lists.some((l) =>
          l.tasks?.some((t) => t._id === task._id),
        );
        if (alreadyExists) return s;
        return {
          lists: s.lists.map((l) =>
            l._id === listId ? { ...l, tasks: [...(l.tasks || []), task] } : l,
          ),
        };
      });
    });

    socket.on("task:updated", (task) => {
      set((s) => ({
        lists: s.lists.map((l) => ({
          ...l,
          tasks: (l.tasks || []).map((t) => (t._id === task._id ? task : t)),
        })),
      }));
    });

    socket.on("task:deleted", ({ taskId, listId }) => {
      set((s) => ({
        lists: s.lists.map((l) =>
          l._id === listId
            ? { ...l, tasks: (l.tasks || []).filter((t) => t._id !== taskId) }
            : l,
        ),
      }));
    });

    socket.on("task:moved", ({ task, sourceListId, targetListId }) => {
      set((s) => ({
        lists: s.lists.map((l) => {
          if (l._id === sourceListId)
            return {
              ...l,
              tasks: (l.tasks || []).filter((t) => t._id !== task._id),
            };
          if (l._id === targetListId) {
            const exists = l.tasks?.some((t) => t._id === task._id);
            return {
              ...l,
              tasks: exists
                ? (l.tasks || []).map((t) => (t._id === task._id ? task : t))
                : [...(l.tasks || []), task],
            };
          }
          return l;
        }),
      }));
    });

    socket.on("list:created", (list) => {
      set((s) => {
        if (s.lists.some((l) => l._id === list._id)) return s;
        return { lists: [...s.lists, { ...list, tasks: [] }] };
      });
    });

    socket.on("list:updated", (list) => {
      set((s) => ({
        lists: s.lists.map((l) => (l._id === list._id ? { ...l, ...list } : l)),
      }));
    });

    socket.on("list:deleted", ({ listId }) => {
      set((s) => ({ lists: s.lists.filter((l) => l._id !== listId) }));
    });

    socket.on("lists:reordered", ({ lists }) => {
      set((s) => {
        const taskMap = {};
        s.lists.forEach((l) => {
          taskMap[l._id] = l.tasks || [];
        });
        return {
          lists: lists.map((l) => ({ ...l, tasks: taskMap[l._id] || [] })),
        };
      });
    });

    socket.on("board:updated", (board) => {
      set({ currentBoard: board });
    });

    socket.on("member:added", ({ board }) => {
      set({ currentBoard: board });
    });

    socket.on("board:active-users", (users) => {
      set({ activeUsers: users });
    });

    socket.on("user:joined", ({ activeUsers }) => {
      set({ activeUsers });
    });

    socket.on("user:left", ({ activeUsers }) => {
      set({ activeUsers });
    });
  },

  teardownSocketListeners: () => {
    const socket = getSocket();
    // Clear any pending task IDs when leaving a board
    get()._pendingTaskIds.clear();
    [
      "task:created",
      "task:updated",
      "task:deleted",
      "task:moved",
      "list:created",
      "list:updated",
      "list:deleted",
      "lists:reordered",
      "board:updated",
      "member:added",
      "board:active-users",
      "user:joined",
      "user:left",
    ].forEach((e) => socket.off(e));
  },
}));
