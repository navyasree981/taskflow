// =============================================================================
// controllers.js — All route handlers in one file
// Sections: AUTH | BOARDS | LISTS | TASKS | ACTIVITY | USERS
//
// KEY FIX: All broadcast calls now use io.broadcastToBoard() which excludes
// the originating socket. This prevents the client that made the API call
// from receiving its own socket echo and creating duplicates.
//
// The client sends its socket ID via the "x-socket-id" request header.
// See services.js where the axios interceptor attaches it automatically.
// =============================================================================

const User = require("./models");
const { Board, List, Task, Activity } = require("./models");
const { generateToken } = require("./utils");
const { logActivity } = require("./utils");

// Helper: get the socket ID the request came from (set by client axios interceptor)
const senderSocketId = (req) => req.headers["x-socket-id"] || null;

// =============================================================================
// AUTH CONTROLLERS
// =============================================================================

const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res
      .status(400)
      .json({ message: "Name, email and password are required" });
  if (password.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing)
    return res.status(400).json({ message: "Email already registered" });

  const user = await User.create({ name, email, password });
  const token = generateToken(user._id);
  res.status(201).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      color: user.color,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );
  if (!user)
    return res.status(401).json({ message: "Invalid email or password" });

  const isMatch = await user.comparePassword(password);
  if (!isMatch)
    return res.status(401).json({ message: "Invalid email or password" });

  const token = generateToken(user._id);
  res.json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      color: user.color,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  });
};

const getMe = async (req, res) => res.json({ user: req.user });
const updateMe = async (req, res) => {
  const { name, color } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (color) updates.color = color;
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  res.json({ user });
};

// =============================================================================
// BOARD CONTROLLERS
// =============================================================================

const getBoards = async (req, res) => {
  const boards = await Board.find({
    $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
    isArchived: false,
  })
    .populate("owner", "name email color avatar")
    .populate("members.user", "name email color avatar")
    .sort({ updatedAt: -1 });
  res.json({ boards });
};

const createBoard = async (req, res) => {
  const { title, description, color, background } = req.body;
  if (!title) return res.status(400).json({ message: "Title is required" });

  const board = await Board.create({
    title,
    description,
    color: color || "#6366f1",
    background,
    owner: req.user._id,
    members: [],
  });
  await board.populate("owner", "name email color avatar");

  await logActivity(req.app, {
    boardId: board._id,
    userId: req.user._id,
    type: "board.created",
    entity: "board",
    entityId: board._id,
    entityTitle: board.title,
    description: `created board "${board.title}"`,
  });

  // Board creator is the only member — no need to exclude anyone
  req.app.get("io").to(`board:${board._id}`).emit("board:updated", board);
  res.status(201).json({ board });
};

const getBoard = async (req, res) => {
  const board = await Board.findById(req.params.id)
    .populate("owner", "name email color avatar")
    .populate("members.user", "name email color avatar");
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.isMember(req.user._id))
    return res.status(403).json({ message: "Access denied" });

  const lists = await List.find({ board: board._id, isArchived: false }).sort({
    position: 1,
  });
  const tasks = await Task.find({ board: board._id, isArchived: false })
    .populate("assignees", "name email color avatar")
    .populate("createdBy", "name email color avatar")
    .sort({ position: 1 });

  const tasksByList = {};
  tasks.forEach((t) => {
    const id = t.list.toString();
    if (!tasksByList[id]) tasksByList[id] = [];
    tasksByList[id].push(t);
  });

  const listsWithTasks = lists.map((l) => ({
    ...l.toObject(),
    tasks: tasksByList[l._id.toString()] || [],
  }));

  res.json({ board, lists: listsWithTasks });
};

const updateBoard = async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const { title, description, color, background } = req.body;
  if (title !== undefined) board.title = title;
  if (description !== undefined) board.description = description;
  if (color !== undefined) board.color = color;
  if (background !== undefined) board.background = background;

  await board.save();
  await board.populate("owner", "name email color avatar");
  await board.populate("members.user", "name email color avatar");

  await logActivity(req.app, {
    boardId: board._id,
    userId: req.user._id,
    type: "board.updated",
    entity: "board",
    entityId: board._id,
    entityTitle: board.title,
    description: `updated board "${board.title}"`,
  });

  // Broadcast to others — sender already has the updated board from the API response
  req.app
    .get("io")
    .broadcastToBoard(
      `board:${board._id}`,
      "board:updated",
      board,
      senderSocketId(req),
    );
  res.json({ board });
};

const deleteBoard = async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.owner.equals(req.user._id))
    return res
      .status(403)
      .json({ message: "Only the owner can delete a board" });

  await Task.deleteMany({ board: board._id });
  await List.deleteMany({ board: board._id });
  await Board.findByIdAndDelete(board._id);

  // Tell everyone (including sender — they need to redirect away)
  req.app
    .get("io")
    .to(`board:${board._id}`)
    .emit("board:deleted", { boardId: board._id });
  res.json({ message: "Board deleted successfully" });
};

const addMember = async (req, res) => {
  const { email, role = "member" } = req.body;
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user)
    return res.status(404).json({ message: "User not found with that email" });
  if (board.owner.equals(user._id))
    return res.status(400).json({ message: "User is already the board owner" });
  if (board.members.find((m) => m.user.equals(user._id)))
    return res.status(400).json({ message: "User is already a member" });

  board.members.push({ user: user._id, role });
  await board.save();
  await board.populate("owner", "name email color avatar");
  await board.populate("members.user", "name email color avatar");

  await logActivity(req.app, {
    boardId: board._id,
    userId: req.user._id,
    type: "board.member_added",
    entity: "board",
    entityId: board._id,
    entityTitle: board.title,
    meta: { addedUser: { name: user.name, email: user.email } },
    description: `added ${user.name} to the board`,
  });

  // Broadcast to everyone in the room (sender gets it from API response)
  req.app
    .get("io")
    .broadcastToBoard(
      `board:${board._id}`,
      "member:added",
      { board },
      senderSocketId(req),
    );
  res.json({ board });
};

const removeMember = async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  board.members = board.members.filter(
    (m) => !m.user.equals(req.params.userId),
  );
  await board.save();
  await board.populate("owner", "name email color avatar");
  await board.populate("members.user", "name email color avatar");

  req.app
    .get("io")
    .broadcastToBoard(
      `board:${board._id}`,
      "board:updated",
      board,
      senderSocketId(req),
    );
  res.json({ board });
};

// =============================================================================
// LIST CONTROLLERS
// =============================================================================

const createList = async (req, res) => {
  const { title, boardId, color } = req.body;
  if (!title || !boardId)
    return res.status(400).json({ message: "Title and boardId are required" });

  const board = await Board.findById(boardId);
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const lastList = await List.findOne({ board: boardId }).sort({
    position: -1,
  });
  const position = lastList ? lastList.position + 1 : 0;
  const list = await List.create({ title, board: boardId, position, color });

  await logActivity(req.app, {
    boardId,
    userId: req.user._id,
    type: "list.created",
    entity: "list",
    entityId: list._id,
    entityTitle: list.title,
    description: `created list "${list.title}"`,
  });

  // Exclude sender — they already have the list from optimistic update
  req.app
    .get("io")
    .broadcastToBoard(
      `board:${boardId}`,
      "list:created",
      list,
      senderSocketId(req),
    );
  res.status(201).json({ list });
};

const updateList = async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) return res.status(404).json({ message: "List not found" });

  const board = await Board.findById(list.board);
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const { title, color } = req.body;
  if (title !== undefined) list.title = title;
  if (color !== undefined) list.color = color;
  await list.save();

  await logActivity(req.app, {
    boardId: list.board,
    userId: req.user._id,
    type: "list.updated",
    entity: "list",
    entityId: list._id,
    entityTitle: list.title,
    description: `updated list "${list.title}"`,
  });

  req.app
    .get("io")
    .broadcastToBoard(
      `board:${list.board}`,
      "list:updated",
      list,
      senderSocketId(req),
    );
  res.json({ list });
};

const deleteList = async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) return res.status(404).json({ message: "List not found" });

  const board = await Board.findById(list.board);
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const boardId = list.board.toString();
  const listId = list._id;
  const listTitle = list.title;

  await Task.deleteMany({ list: listId });
  await List.findByIdAndDelete(listId);

  await logActivity(req.app, {
    boardId,
    userId: req.user._id,
    type: "list.deleted",
    entity: "list",
    entityId: listId,
    entityTitle: listTitle,
    description: `deleted list "${listTitle}"`,
  });

  req.app
    .get("io")
    .broadcastToBoard(
      `board:${boardId}`,
      "list:deleted",
      { listId, boardId },
      senderSocketId(req),
    );
  res.json({ message: "List deleted" });
};

const reorderLists = async (req, res) => {
  const { boardId, orderedIds } = req.body;
  if (!boardId || !orderedIds)
    return res.status(400).json({ message: "boardId and orderedIds required" });

  const board = await Board.findById(boardId);
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  await Promise.all(
    orderedIds.map((id, index) =>
      List.findByIdAndUpdate(id, { position: index }),
    ),
  );
  const lists = await List.find({ board: boardId, isArchived: false }).sort({
    position: 1,
  });

  req.app
    .get("io")
    .broadcastToBoard(
      `board:${boardId}`,
      "lists:reordered",
      { boardId, lists },
      senderSocketId(req),
    );
  res.json({ lists });
};

// =============================================================================
// TASK CONTROLLERS
// =============================================================================

const createTask = async (req, res) => {
  const { title, description, listId, priority, dueDate, assignees } = req.body;
  if (!title || !listId)
    return res.status(400).json({ message: "Title and listId are required" });

  const list = await List.findById(listId);
  if (!list) return res.status(404).json({ message: "List not found" });

  const board = await Board.findById(list.board);
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const lastTask = await Task.findOne({ list: listId }).sort({ position: -1 });
  const position = lastTask ? lastTask.position + 1 : 0;

  const task = await Task.create({
    title,
    description: description || "",
    list: listId,
    board: list.board,
    position,
    priority: priority || "medium",
    dueDate: dueDate || null,
    assignees: assignees || [],
    createdBy: req.user._id,
  });
  await task.populate("assignees", "name email color avatar");
  await task.populate("createdBy", "name email color avatar");

  await logActivity(req.app, {
    boardId: list.board,
    userId: req.user._id,
    type: "task.created",
    entity: "task",
    entityId: task._id,
    entityTitle: task.title,
    meta: { listTitle: list.title },
    description: `created task "${task.title}" in "${list.title}"`,
  });

  // ── DUPLICATE FIX (server-side) ─────────────────────────────────────────
  // Exclude the socket that made this request — they already added the task
  // via optimistic update in createTask() in stores.js.
  // Other users in the room still receive the event for real-time sync.
  req.app
    .get("io")
    .broadcastToBoard(
      `board:${list.board}`,
      "task:created",
      { task, listId },
      senderSocketId(req),
    );
  res.status(201).json({ task });
};

const getTask = async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate("assignees", "name email color avatar")
    .populate("createdBy", "name email color avatar");
  if (!task) return res.status(404).json({ message: "Task not found" });

  const board = await Board.findById(task.board);
  if (!board.isMember(req.user._id))
    return res.status(403).json({ message: "Access denied" });
  res.json({ task });
};

const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const board = await Board.findById(task.board);
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const { title, description, priority, dueDate, labels, checklist, cover } =
    req.body;
  const oldPriority = task.priority;

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (labels !== undefined) task.labels = labels;
  if (checklist !== undefined) task.checklist = checklist;
  if (cover !== undefined) task.cover = cover;

  await task.save();
  await task.populate("assignees", "name email color avatar");
  await task.populate("createdBy", "name email color avatar");

  const activityType =
    priority && priority !== oldPriority
      ? "task.priority_changed"
      : "task.updated";
  const desc =
    priority && priority !== oldPriority
      ? `changed priority of "${task.title}" from ${oldPriority} to ${priority}`
      : `updated task "${task.title}"`;

  await logActivity(req.app, {
    boardId: task.board,
    userId: req.user._id,
    type: activityType,
    entity: "task",
    entityId: task._id,
    entityTitle: task.title,
    description: desc,
  });

  req.app
    .get("io")
    .broadcastToBoard(
      `board:${task.board}`,
      "task:updated",
      task,
      senderSocketId(req),
    );
  res.json({ task });
};

const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const board = await Board.findById(task.board);
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const boardId = task.board.toString();
  const listId = task.list.toString();
  const taskId = task._id.toString();
  const taskTitle = task.title;

  await Task.findByIdAndDelete(taskId);
  await logActivity(req.app, {
    boardId,
    userId: req.user._id,
    type: "task.deleted",
    entity: "task",
    entityId: taskId,
    entityTitle: taskTitle,
    description: `deleted task "${taskTitle}"`,
  });

  // Sender already removed it optimistically — only tell others
  req.app
    .get("io")
    .broadcastToBoard(
      `board:${boardId}`,
      "task:deleted",
      { taskId, listId, boardId },
      senderSocketId(req),
    );
  res.json({ message: "Task deleted" });
};

const moveTask = async (req, res) => {
  const { targetListId, position } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const board = await Board.findById(task.board);
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const targetList = await List.findById(targetListId);
  if (!targetList)
    return res.status(404).json({ message: "Target list not found" });

  const sourceListId = task.list.toString();
  const oldListTitle =
    sourceListId !== targetListId
      ? (await List.findById(sourceListId))?.title
      : null;

  task.list = targetListId;
  task.position = position !== undefined ? position : task.position;
  await task.save();
  await task.populate("assignees", "name email color avatar");
  await task.populate("createdBy", "name email color avatar");

  if (position !== undefined) {
    const tasksInList = await Task.find({
      list: targetListId,
      _id: { $ne: task._id },
      isArchived: false,
    }).sort({ position: 1 });
    const reordered = [...tasksInList];
    reordered.splice(position, 0, task);
    await Promise.all(
      reordered.map((t, idx) =>
        Task.findByIdAndUpdate(t._id, { position: idx }),
      ),
    );
  }

  await logActivity(req.app, {
    boardId: task.board,
    userId: req.user._id,
    type: "task.moved",
    entity: "task",
    entityId: task._id,
    entityTitle: task.title,
    meta: { fromList: oldListTitle, toList: targetList.title },
    description: oldListTitle
      ? `moved "${task.title}" from "${oldListTitle}" to "${targetList.title}"`
      : `reordered "${task.title}" in "${targetList.title}"`,
  });

  // Sender already moved it optimistically
  req.app
    .get("io")
    .broadcastToBoard(
      `board:${task.board}`,
      "task:moved",
      { task, sourceListId, targetListId },
      senderSocketId(req),
    );
  res.json({ task });
};

const assignUser = async (req, res) => {
  const { userId, action = "assign" } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const board = await Board.findById(task.board);
  if (!board.canEdit(req.user._id))
    return res.status(403).json({ message: "Permission denied" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (action === "assign") {
    if (!task.assignees.includes(userId)) task.assignees.push(userId);
  } else {
    task.assignees = task.assignees.filter((a) => !a.equals(userId));
  }

  await task.save();
  await task.populate("assignees", "name email color avatar");
  await task.populate("createdBy", "name email color avatar");

  await logActivity(req.app, {
    boardId: task.board,
    userId: req.user._id,
    type: action === "assign" ? "task.assigned" : "task.unassigned",
    entity: "task",
    entityId: task._id,
    entityTitle: task.title,
    meta: { assignedUser: { name: user.name } },
    description:
      action === "assign"
        ? `assigned ${user.name} to "${task.title}"`
        : `unassigned ${user.name} from "${task.title}"`,
  });

  req.app
    .get("io")
    .broadcastToBoard(
      `board:${task.board}`,
      "task:updated",
      task,
      senderSocketId(req),
    );
  res.json({ task });
};

const searchTasks = async (req, res) => {
  const { q, boardId, priority, page = 1, limit = 20 } = req.query;
  if (!boardId) return res.status(400).json({ message: "boardId is required" });

  const board = await Board.findById(boardId);
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.isMember(req.user._id))
    return res.status(403).json({ message: "Access denied" });

  const filter = { board: boardId, isArchived: false };
  if (q) filter.$text = { $search: q };
  if (priority) filter.priority = priority;

  const total = await Task.countDocuments(filter);
  const tasks = await Task.find(filter)
    .populate("assignees", "name email color avatar")
    .populate("createdBy", "name email color avatar")
    .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    tasks,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
    },
  });
};

// =============================================================================
// ACTIVITY CONTROLLERS
// =============================================================================

const getBoardActivity = async (req, res) => {
  const { boardId } = req.params;
  const { page = 1, limit = 30 } = req.query;

  const board = await Board.findById(boardId);
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (!board.isMember(req.user._id))
    return res.status(403).json({ message: "Access denied" });

  const total = await Activity.countDocuments({ board: boardId });
  const activities = await Activity.find({ board: boardId })
    .populate("user", "name email color avatar")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    activities,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
    },
  });
};

// =============================================================================
// USER CONTROLLERS
// =============================================================================

const searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });

  const users = await User.find({
    $or: [
      { email: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
    ],
    _id: { $ne: req.user._id },
  })
    .select("name email color avatar")
    .limit(10);

  res.json({ users });
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
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
};
