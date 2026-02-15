// =============================================================================
// pages.jsx — All route-level pages in one file
// Sections: LOGIN | REGISTER | DASHBOARD | BOARD
// =============================================================================

import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useAuthStore, useBoardStore } from "../store/stores";
import {
  TaskCard,
  ListColumn,
  AddListForm,
  BoardHeader,
  ActivityPanel,
  CreateBoardModal,
} from "../components/components";

// =============================================================================
// LOGIN PAGE
// =============================================================================

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate("/");
    } catch {}
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), var(--bg-primary)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <span className="font-display text-2xl font-bold text-white">
              TaskFlow
            </span>
          </div>
          <p className="text-[var(--text-muted)] text-sm">
            Real-time task collaboration
          </p>
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-white mb-1">
            Welcome back
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            Sign in to your workspace
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-center mt-4 text-sm text-[var(--text-muted)]">
          No account?{" "}
          <Link
            to="/register"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// REGISTER PAGE
// =============================================================================

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch {}
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), var(--bg-primary)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <span className="font-display text-2xl font-bold text-white">
              TaskFlow
            </span>
          </div>
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-white mb-1">
            Create your account
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            Start collaborating in minutes
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Alex Johnson"
                required
                minLength={2}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className="input"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>
        <p className="text-center mt-4 text-sm text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// DASHBOARD PAGE
// =============================================================================

export function DashboardPage() {
  const navigate = useNavigate();
  const { boards, fetchBoards, isLoading, deleteBoard } = useBoardStore();
  const { user, logout } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleDelete = async (e, boardId) => {
    e.stopPropagation();
    if (
      window.confirm("Delete this board? All lists and tasks will be removed.")
    )
      await deleteBoard(boardId);
    setMenuOpen(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="border-b border-[var(--border)] sticky top-0 z-40"
        style={{
          background: "rgba(15,13,26,0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <span className="font-display font-bold text-white">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)] hidden sm:block">
              {user?.email}
            </span>
            <UserAvatar user={user} size="sm" />
            <button onClick={logout} className="btn-ghost text-xs">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Good to see you, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm">
              {boards.length} board{boards.length !== 1 ? "s" : ""} in your
              workspace
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
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
            New Board
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-[var(--bg-card)] animate-pulse"
              />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[var(--text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-1">No boards yet</h3>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              Create your first board to get started
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Create a board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board._id}
                onClick={() => navigate(`/board/${board._id}`)}
                className="relative group card p-5 cursor-pointer hover:border-[var(--border-light)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                  style={{ background: board.color }}
                />
                <div className="flex items-start justify-between mt-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate mb-1">
                      {board.title}
                    </h3>
                    {board.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>
                  <div
                    className="relative ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === board._id ? null : board._id)
                      }
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-muted)] transition-all"
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
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>
                    {menuOpen === board._id && (
                      <div className="absolute right-0 top-8 w-36 card shadow-xl z-10 py-1 animate-slide-in">
                        {board.owner._id === user?._id && (
                          <button
                            onClick={(e) => handleDelete(e, board._id)}
                            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                          >
                            Delete board
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex -space-x-1.5">
                    <UserAvatar user={board.owner} size="xs" tooltip />
                    {board.members?.slice(0, 3).map((m) => (
                      <UserAvatar
                        key={m.user._id}
                        user={m.user}
                        size="xs"
                        tooltip
                      />
                    ))}
                    {board.members?.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center">
                        <span className="text-[9px] text-[var(--text-muted)] font-medium">
                          +{board.members.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            <button
              onClick={() => setShowCreate(true)}
              className="h-32 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-indigo-500/50 hover:bg-indigo-500/5 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:text-indigo-400 transition-all group"
            >
              <svg
                className="w-6 h-6 group-hover:scale-110 transition-transform"
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
              <span className="text-sm font-medium">New board</span>
            </button>
          </div>
        )}
      </main>

      {showCreate && <CreateBoardModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

// =============================================================================
// BOARD PAGE
// =============================================================================

export function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentBoard,
    lists,
    fetchBoard,
    leaveBoard,
    moveTask,
    reorderLists,
    isLoading,
  } = useBoardStore();

  const [activeTask, setActiveTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showActivity, setShowActivity] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (user) fetchBoard(boardId, user);
    return () => leaveBoard(boardId);
  }, [boardId]);

  const handleDragStart = ({ active }) => {
    if (active.data.current?.type === "task")
      setActiveTask(active.data.current.task);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over || active.id === over.id) return;
    const activeType = active.data.current?.type;

    if (activeType === "list") {
      const oldIdx = lists.findIndex((l) => l._id === active.id);
      const newIdx = lists.findIndex((l) => l._id === over.id);
      if (oldIdx !== newIdx)
        await reorderLists(
          boardId,
          arrayMove(lists, oldIdx, newIdx).map((l) => l._id),
        );
      return;
    }

    if (activeType === "task") {
      const task = active.data.current.task;
      const sourceListId = active.data.current.listId;
      const overType = over.data.current?.type;
      let targetListId = sourceListId;
      let targetPosition = 0;

      if (overType === "list") {
        targetListId = over.id;
        targetPosition =
          lists.find((l) => l._id === targetListId)?.tasks?.length || 0;
      } else if (overType === "task") {
        targetListId = over.data.current.listId;
        const tl = lists.find((l) => l._id === targetListId);
        targetPosition = Math.max(
          0,
          (tl?.tasks || []).findIndex((t) => t._id === over.id),
        );
      }
      await moveTask(task._id, sourceListId, targetListId, targetPosition);
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading board...
        </div>
      </div>
    );
  }

  if (!currentBoard) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <BoardHeader
        board={currentBoard}
        onBack={() => navigate("/")}
        onToggleActivity={() => setShowActivity((s) => !s)}
        showActivity={showActivity}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-6 h-full items-start min-w-max">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lists.map((l) => l._id)}
                strategy={horizontalListSortingStrategy}
              >
                {lists.map((list) => (
                  <ListColumn
                    key={list._id}
                    list={list}
                    boardId={boardId}
                    onTaskClick={(task) => setSelectedTask(task)}
                  />
                ))}
              </SortableContext>
              <DragOverlay
                dropAnimation={{
                  sideEffects: defaultDropAnimationSideEffects({
                    styles: { active: { opacity: "0.5" } },
                  }),
                }}
              >
                {activeTask && <TaskCard task={activeTask} isDragging />}
              </DragOverlay>
            </DndContext>
            <AddListForm boardId={boardId} />
          </div>
        </div>
        {showActivity && (
          <ActivityPanel
            boardId={boardId}
            onClose={() => setShowActivity(false)}
          />
        )}
      </div>

      {selectedTask && (
        <TaskModal
          taskId={selectedTask._id}
          boardId={boardId}
          board={currentBoard}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

// ── local imports used inside this file ──────────────────────────────────────
import { UserAvatar } from "../components/components";
import { TaskModal } from "../components/components";
