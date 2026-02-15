// =============================================================================
// components.jsx — All UI components in one file
// Sections: UI PRIMITIVES | BOARD COMPONENTS | TASK COMPONENTS
// Visual fixes: list column bg, task card surface, proper padding, no bleeding
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, formatDistanceToNow } from "date-fns";
import { useAuthStore, useBoardStore } from "../store/stores";
import { tasksAPI, usersAPI, activityAPI } from "../services/services";
import { getSocket } from "../services/services";

// =============================================================================
// UI PRIMITIVES
// =============================================================================

// ── UserAvatar ────────────────────────────────────────────────────────────────
export function UserAvatar({ user, size = "md", tooltip = false }) {
  if (!user) return null;
  const sizeClass = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-7 h-7 text-[11px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  }[size];
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none border-2 border-[var(--bg-primary)]`}
      style={{ background: user.color || "#6366f1" }}
      title={tooltip ? user.name : undefined}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ children, onClose, title, size = "md" }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className={`w-full ${sizeClass} animate-scale-in`}
        style={{
          background: "#161326",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          boxShadow:
            "0 32px 96px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
          padding: "24px",
        }}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white text-base">{title}</h3>
            <button
              onClick={onClose}
              className="btn-ghost p-1.5 text-[var(--text-muted)] hover:text-white"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

// ── PriorityBadge ─────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  urgent: {
    label: "Urgent",
    bg: "bg-red-500/20",
    text: "text-red-400",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    bg: "bg-slate-500/20",
    text: "text-slate-400",
    dot: "bg-slate-500",
  },
};

export function PriorityBadge({ priority, showLabel = false }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span
      className={`inline-flex items-center gap-1 ${showLabel ? `px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}` : ""}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {showLabel && cfg.label}
    </span>
  );
}

// =============================================================================
// BOARD COMPONENTS
// =============================================================================

// ── BoardHeader ───────────────────────────────────────────────────────────────
export function BoardHeader({ board, onBack, onToggleActivity, showActivity }) {
  const { activeUsers } = useBoardStore();
  const { user } = useAuthStore();
  const [showMembers, setShowMembers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const uniqueUsers = activeUsers.filter(
    (u, i, arr) => arr.findIndex((x) => x.userId === u.userId) === i,
  );

  return (
    <>
      <header
        className="border-b border-[var(--border)] flex-shrink-0"
        style={{
          background: "rgba(15,13,26,0.92)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="px-4 h-13 flex items-center gap-3 py-2.5">
          <Link
            to="/"
            className="btn-ghost p-2 text-[var(--text-muted)] hover:text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="w-px h-5 bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: board.color }}
            />
            <h1 className="font-semibold text-white text-sm">{board.title}</h1>
          </div>
          <div className="flex-1" />
          {uniqueUsers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-[var(--text-muted)]">
                {uniqueUsers.length} online
              </span>
              <div className="flex -space-x-1.5 ml-1">
                {uniqueUsers.slice(0, 4).map((u) => (
                  <div
                    key={u.socketId}
                    title={u.userName}
                    className="w-6 h-6 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center text-[10px] font-bold text-white bg-indigo-600"
                  >
                    {u.userName?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="w-px h-5 bg-[var(--border)]" />
          <button
            onClick={() => setShowSearch(true)}
            className="btn-ghost p-2 text-[var(--text-muted)] hover:text-white"
            title="Search"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <button
            onClick={() => setShowMembers(true)}
            className="btn-ghost p-2 text-[var(--text-muted)] hover:text-white"
            title="Members"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </button>
          <button
            onClick={onToggleActivity}
            className={`btn-ghost p-2 ${showActivity ? "text-indigo-400" : "text-[var(--text-muted)] hover:text-white"}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <UserAvatar user={user} size="sm" />
        </div>
      </header>
      {showMembers && (
        <MembersModal board={board} onClose={() => setShowMembers(false)} />
      )}
      {showSearch && (
        <SearchModal boardId={board._id} onClose={() => setShowSearch(false)} />
      )}
    </>
  );
}

// ── ListColumn ────────────────────────────────────────────────────────────────
export function ListColumn({ list, boardId, onTaskClick }) {
  const { updateList, deleteList } = useBoardStore();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list._id, data: { type: "list", list } });

  const { setNodeRef: setDropRef } = useDroppable({
    id: list._id,
    data: { type: "list", listId: list._id },
  });

  const setRef = (el) => {
    setSortableRef(el);
    setDropRef(el);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const tasks = list.tasks || [];

  const handleTitleSave = async () => {
    if (title.trim() && title !== list.title)
      await updateList(list._id, { title: title.trim() });
    else setTitle(list.title);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete list "${list.title}" and all its tasks?`))
      await deleteList(list._id);
    setShowMenu(false);
  };

  return (
    <div
      ref={setRef}
      style={{
        ...style,
        background: "#131122",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "14px",
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}
      className="w-72 flex-shrink-0 flex flex-col max-h-[calc(100vh-120px)]"
      {...attributes}
    >
      {/* ── Column Header ── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing flex-shrink-0"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.03)",
        }}
        {...listeners}
      >
        {list.color && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: list.color }}
          />
        )}
        {isEditing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") {
                setTitle(list.title);
                setIsEditing(false);
              }
            }}
            className="input flex-1 py-0.5 px-1.5 text-sm font-medium h-6"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-sm font-semibold text-white cursor-pointer hover:text-indigo-300 transition-colors truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {list.title}
          </span>
        )}

        {/* Task count badge */}
        <span
          className="text-xs flex-shrink-0 font-semibold"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.45)",
            padding: "1px 8px",
            borderRadius: "999px",
            fontSize: "11px",
          }}
        >
          {tasks.length}
        </span>

        {/* 3-dot menu */}
        <div
          className="relative flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-7 w-36 z-20 py-1 animate-slide-in"
              style={{
                background: "#1e1b33",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}
            >
              <button
                className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
              >
                Rename
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                onClick={handleDelete}
              >
                Delete list
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Task List ── */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-2"
        style={{ background: "transparent" }}
      >
        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              listId={list._id}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="py-6 text-center text-xs text-[var(--text-muted)] select-none">
            Drop tasks here
          </div>
        )}
      </div>

      {/* ── Add Task Footer ── */}
      <div
        className="p-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {showAddTask ? (
          <AddTaskForm
            listId={list._id}
            boardId={boardId}
            onDone={() => setShowAddTask(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

// ── AddListForm ───────────────────────────────────────────────────────────────
export function AddListForm({ boardId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const { createList } = useBoardStore();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createList(title.trim(), boardId);
    setTitle("");
    setIsAdding(false);
  };

  if (!isAdding)
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-72 flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-indigo-500/50 hover:bg-indigo-500/5 text-[var(--text-muted)] hover:text-indigo-400 transition-all text-sm font-medium"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add list
      </button>
    );

  return (
    <div
      className="w-72 flex-shrink-0 p-3"
      style={{
        background: "#161326",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "14px",
      }}
    >
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="List name..."
          className="input text-sm mb-3"
          onKeyDown={(e) => e.key === "Escape" && setIsAdding(false)}
        />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1 py-1.5 text-sm">
            Add list
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setTitle("");
            }}
            className="btn-ghost p-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// ── CreateBoardModal ──────────────────────────────────────────────────────────
const BOARD_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#eab308",
  "#ef4444",
];

export function CreateBoardModal({ onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [loading, setLoading] = useState(false);
  const { createBoard } = useBoardStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const board = await createBoard({
        title: title.trim(),
        description,
        color,
      });
      navigate(`/board/${board._id}`);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Create a new board">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Preview banner */}
        <div
          className="h-20 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${color}33, ${color}66)`,
            border: `1px solid ${color}44`,
          }}
        >
          <span className="font-semibold text-white text-lg px-4 truncate">
            {title || "Board name"}
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Board title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Product Roadmap"
            className="input"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this board for?"
            rows={2}
            className="input resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
            Color
          </label>
          <div className="flex gap-2">
            {BOARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: color === c ? "3px solid white" : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="btn-primary flex-1"
          >
            {loading ? "Creating..." : "Create board"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── MembersModal ──────────────────────────────────────────────────────────────
export function MembersModal({ board, onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { addMember, removeMember } = useBoardStore();
  const { user } = useAuthStore();
  const isOwner = board.owner._id === user._id;

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await addMember(board._id, email, role);
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const allMembers = [
    { user: board.owner, role: "owner" },
    ...(board.members || []),
  ];

  return (
    <Modal onClose={onClose} title="Board Members">
      <div className="space-y-4">
        <div className="space-y-1">
          {allMembers.map((m) => (
            <div
              key={m.user._id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <UserAvatar user={m.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {m.user.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {m.user.email}
                </p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full capitalize"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {m.role}
              </span>
              {isOwner && m.role !== "owner" && (
                <button
                  onClick={() => removeMember(board._id, m.user._id)}
                  className="p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div
            className="pt-4 mt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <h4 className="text-sm font-medium text-white mb-3">
              Invite member
            </h4>
            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                {error}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-3">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
                required
                className="input text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input text-sm flex-1"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-4"
                >
                  {loading ? "..." : "Invite"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── SearchModal ───────────────────────────────────────────────────────────────
export function SearchModal({ boardId, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [priority, setPriority] = useState("");
  const inputRef = useRef(null);
  const debouncer = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    clearTimeout(debouncer.current);
    if (!query.trim() && !priority) {
      setResults([]);
      setPagination(null);
      return;
    }
    debouncer.current = setTimeout(() => doSearch(1), 300);
  }, [query, priority]);

  const doSearch = async (p = 1) => {
    setLoading(true);
    try {
      const params = { boardId, page: p, limit: 10 };
      if (query.trim()) params.q = query.trim();
      if (priority) params.priority = priority;
      const { data } = await tasksAPI.search(params);
      setResults(data.tasks);
      setPagination(data.pagination);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Search Tasks" size="lg">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks..."
              className="input pl-9"
            />
          </div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="input w-32"
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-[var(--text-muted)] text-sm">
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && (query || priority) && (
            <div className="py-8 text-center text-[var(--text-muted)] text-sm">
              No tasks found
            </div>
          )}
          {!loading && !query && !priority && (
            <div className="py-8 text-center text-[var(--text-muted)] text-sm">
              Type to search tasks
            </div>
          )}
          {results.map((task) => (
            <div
              key={task._id}
              className="p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <p className="text-sm font-medium text-white truncate">
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <PriorityBadge priority={task.priority} showLabel />
                {task.dueDate && (
                  <span className="text-xs text-[var(--text-muted)]">
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {pagination && pagination.pages > 1 && (
          <div
            className="flex items-center justify-between pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="text-xs text-[var(--text-muted)]">
              {pagination.total} results · Page {page}/{pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => doSearch(page - 1)}
                className="btn-secondary py-1 px-2 text-xs"
              >
                Prev
              </button>
              <button
                disabled={page === pagination.pages}
                onClick={() => doSearch(page + 1)}
                className="btn-secondary py-1 px-2 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── ActivityPanel ─────────────────────────────────────────────────────────────
export function ActivityPanel({ boardId, onClose }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await activityAPI.getByBoard(boardId, { limit: 50 });
        setActivities(data.activities);
      } finally {
        setLoading(false);
      }
    })();
    const socket = getSocket();
    socket.on("activity:new", (a) => setActivities((prev) => [a, ...prev]));
    return () => socket.off("activity:new");
  }, [boardId]);

  return (
    <div
      className="w-72 flex-shrink-0 flex flex-col"
      style={{
        background: "var(--bg-secondary)",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <h3 className="text-sm font-semibold text-white">Activity</h3>
        <button
          onClick={onClose}
          className="btn-ghost p-1 text-[var(--text-muted)] hover:text-white"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-[var(--bg-card)] rounded w-3/4" />
                <div className="h-2 bg-[var(--bg-card)] rounded w-1/2" />
              </div>
            </div>
          ))}
        {!loading && activities.length === 0 && (
          <p className="text-center text-sm text-[var(--text-muted)]">
            No activity yet
          </p>
        )}
        {activities.map((a) => (
          <div key={a._id} className="flex gap-2.5 animate-fade-in">
            <UserAvatar user={a.user} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <span className="text-white font-medium">{a.user?.name}</span>{" "}
                {a.description}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {formatDistanceToNow(new Date(a.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TASK COMPONENTS
// =============================================================================

// ── TaskCard ──────────────────────────────────────────────────────────────────
export function TaskCard({ task, listId, onClick, isDragging: isDragOverlay }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { type: "task", task, listId } });

  const overdue = task.dueDate && new Date(task.dueDate) < new Date();
  const completedItems = task.checklist?.filter((c) => c.completed).length || 0;
  const totalItems = task.checklist?.length || 0;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: isDragging ? "#211e36" : "#1c1830",
        border: isDragging
          ? "1px solid rgba(99,102,241,0.5)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
        padding: "10px 12px",
        opacity: isDragging ? 0.5 : 1,
        cursor: "pointer",
        userSelect: "none",
        transition: isDragging
          ? undefined
          : "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease",
      }}
      className={`group relative select-none ${isDragOverlay ? "rotate-2 shadow-2xl" : ""}`}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.background = "#211e36";
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.background = "#1c1830";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform =
            CSS.Transform.toString(transform) || "";
        }
      }}
    >
      {task.cover && (
        <div
          className="h-8 rounded-md mb-2 -mx-1 -mt-1"
          style={{ background: task.cover }}
        />
      )}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((l, i) => (
            <span
              key={i}
              className="h-1.5 w-8 rounded-full"
              style={{ background: l.color }}
              title={l.text}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-white font-medium leading-snug break-words">
        {task.title}
      </p>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${overdue ? "bg-red-500/20 text-red-400" : "bg-white/8 text-[var(--text-muted)]"}`}
            style={!overdue ? { background: "rgba(255,255,255,0.06)" } : {}}
          >
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
        {totalItems > 0 && (
          <span
            className={`text-[10px] flex items-center gap-0.5 ${completedItems === totalItems ? "text-green-400" : "text-[var(--text-muted)]"}`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            {completedItems}/{totalItems}
          </span>
        )}
      </div>

      {task.assignees?.length > 0 && (
        <div className="flex -space-x-1.5 mt-2.5">
          {task.assignees.slice(0, 4).map((u) => (
            <UserAvatar key={u._id} user={u} size="xs" tooltip />
          ))}
          {task.assignees.length > 4 && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span className="text-[8px] text-[var(--text-muted)]">
                +{task.assignees.length - 4}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AddTaskForm ───────────────────────────────────────────────────────────────
export function AddTaskForm({ listId, boardId, onDone }) {
  const [title, setTitle] = useState("");
  const { createTask } = useBoardStore();
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask({ title: title.trim(), listId, boardId });
    setTitle("");
    onDone();
  };

  return (
    <div
      style={{
        background: "#1c1830",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "10px",
      }}
    >
      <form onSubmit={handleSubmit}>
        <textarea
          ref={ref}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          rows={2}
          className="input text-sm resize-none mb-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
            if (e.key === "Escape") onDone();
          }}
        />
        <div className="flex gap-1.5">
          <button type="submit" className="btn-primary flex-1 py-1.5 text-xs">
            Add
          </button>
          <button type="button" onClick={onDone} className="btn-ghost p-1.5">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// ── TaskModal ─────────────────────────────────────────────────────────────────
const PRIORITIES = ["urgent", "high", "medium", "low"];
const COVER_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#ef4444",
  "#eab308",
  null,
];

export function TaskModal({ taskId, boardId, board, onClose }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [newItem, setNewItem] = useState("");
  const { updateTask, deleteTask } = useBoardStore();
  const { user } = useAuthStore();

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      const { data } = await tasksAPI.getById(taskId);
      setTask(data.task);
      setTitle(data.task.title);
      setDesc(data.task.description || "");
    } finally {
      setLoading(false);
    }
  };

  const save = async (updates) => {
    setSaving(true);
    try {
      const updated = await updateTask(taskId, updates);
      setTask(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleSave = async () => {
    if (title.trim() !== task.title) await save({ title: title.trim() });
    setEditingTitle(false);
  };

  const handleDescSave = async () => {
    if (desc !== task.description) await save({ description: desc });
    setEditingDesc(false);
  };

  const handleCheckItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    await save({
      checklist: [
        ...(task.checklist || []),
        { text: newItem.trim(), completed: false },
      ],
    });
    setNewItem("");
    await loadTask();
  };

  const toggleCheck = async (id, completed) => {
    await save({
      checklist: task.checklist.map((c) =>
        c._id === id ? { ...c, completed: !completed } : c,
      ),
    });
    await loadTask();
  };

  const removeCheck = async (id) => {
    await save({ checklist: task.checklist.filter((c) => c._id !== id) });
    await loadTask();
  };

  const handleAssign = async (userId, action) => {
    const { data } = await tasksAPI.assign(taskId, { userId, action });
    setTask(data.task);
    await updateTask(taskId, {});
    setTask(data.task);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this task?")) return;
    await deleteTask(taskId, task.list);
    onClose();
  };

  const isAssigned = (uid) => task?.assignees?.some((a) => a._id === uid);
  const allMembers = board
    ? [board.owner, ...(board.members || []).map((m) => m.user)]
    : [];
  const completedItems =
    task?.checklist?.filter((c) => c.completed).length || 0;
  const totalItems = task?.checklist?.length || 0;
  const checkProgress =
    totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  if (loading || !task)
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)" }}
      >
        <div className="card p-8 text-[var(--text-muted)] text-sm">
          Loading...
        </div>
      </div>
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        style={{
          background: "#161326",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          boxShadow:
            "0 32px 96px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {task.cover && (
          <div
            className="h-16 flex-shrink-0 rounded-t-[15px]"
            style={{ background: task.cover }}
          />
        )}

        {/* ── Header ── */}
        <div
          className="flex items-start gap-3 p-5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTitleSave();
                  }
                  if (e.key === "Escape") {
                    setTitle(task.title);
                    setEditingTitle(false);
                  }
                }}
                className="input w-full text-base font-semibold resize-none"
                rows={2}
                autoFocus
              />
            ) : (
              <h2
                className="text-base font-semibold text-white cursor-pointer hover:text-indigo-300 transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {saving && (
              <span className="text-xs text-[var(--text-muted)]">
                Saving...
              </span>
            )}
            <button
              onClick={handleDelete}
              className="btn-ghost p-1.5 text-[var(--text-muted)] hover:text-red-400"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="btn-ghost p-1.5 text-[var(--text-muted)] hover:text-white"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto flex min-h-0">
          {/* Main content */}
          <div className="flex-1 p-5 space-y-5 overflow-y-auto">
            {/* Description */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Description
              </label>
              {editingDesc ? (
                <div>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="input w-full resize-none text-sm"
                    rows={4}
                    autoFocus
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleDescSave}
                      className="btn-primary py-1 text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setDesc(task.description);
                        setEditingDesc(false);
                      }}
                      className="btn-ghost py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className="text-sm text-[var(--text-secondary)] cursor-pointer p-3 rounded-lg hover:bg-white/5 min-h-[60px] transition-all"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "transparent")
                  }
                >
                  {task.description || (
                    <span className="text-[var(--text-muted)] italic">
                      Click to add description...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Checklist{" "}
                  {totalItems > 0 && `(${completedItems}/${totalItems})`}
                </label>
              </div>
              {totalItems > 0 && (
                <div
                  className="mb-3 h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${checkProgress}%` }}
                  />
                </div>
              )}
              <div className="space-y-1 mb-2">
                {task.checklist?.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-2 group px-1 py-0.5 rounded hover:bg-white/3"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleCheck(item._id, item.completed)}
                      className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer flex-shrink-0"
                    />
                    <span
                      className={`flex-1 text-sm ${item.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-secondary)]"}`}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => removeCheck(item._id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-red-400 transition-opacity"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCheckItem} className="flex gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Add item..."
                  className="input text-sm flex-1 py-1.5"
                />
                <button
                  type="submit"
                  className="btn-secondary py-1 px-3 text-xs"
                >
                  Add
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div
            className="w-48 flex-shrink-0 p-4 space-y-4 overflow-y-auto"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Priority */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <div className="space-y-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => save({ priority: p })}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      task.priority === p
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "text-[var(--text-muted)] hover:bg-white/5"
                    }`}
                  >
                    <PriorityBadge priority={p} />
                    <span className="capitalize">{p}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={
                  task.dueDate
                    ? format(new Date(task.dueDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(e) => save({ dueDate: e.target.value || null })}
                className="input text-xs py-1.5"
              />
            </div>

            {/* Cover */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Cover
              </label>
              <div className="flex flex-wrap gap-1">
                {COVER_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => save({ cover: c })}
                    className={`w-6 h-4 rounded transition-transform hover:scale-110 ${task.cover === c ? "ring-1 ring-white ring-offset-1 ring-offset-[#161326]" : ""}`}
                    style={{
                      background: c || "transparent",
                      border: c ? "none" : "1px dashed rgba(255,255,255,0.2)",
                    }}
                  >
                    {!c && (
                      <svg
                        className="w-3 h-3 mx-auto text-[var(--text-muted)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Assignees
              </label>
              <div className="space-y-1 mb-2">
                {task.assignees?.map((a) => (
                  <div key={a._id} className="flex items-center gap-1.5 group">
                    <UserAvatar user={a} size="xs" />
                    <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">
                      {a.name}
                    </span>
                    <button
                      onClick={() => handleAssign(a._id, "unassign")}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-opacity"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {allMembers
                  .filter((m) => !isAssigned(m._id))
                  .slice(0, 4)
                  .map((m) => (
                    <button
                      key={m._id}
                      onClick={() => handleAssign(m._id, "assign")}
                      className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                      <UserAvatar user={m} size="xs" />
                      <span className="text-xs truncate">{m.name}</span>
                      <svg
                        className="w-3 h-3 ml-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </button>
                  ))}
              </div>
            </div>

            {/* Created by */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Created by
              </label>
              <div className="flex items-center gap-1.5">
                <UserAvatar user={task.createdBy} size="xs" />
                <span className="text-xs text-[var(--text-muted)]">
                  {task.createdBy?.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
