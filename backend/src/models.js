// =============================================================================
// models.js — All Mongoose schemas in one file
// Sections: USER | BOARD | LIST | TASK | ACTIVITY
// =============================================================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// =============================================================================
// USER MODEL
// =============================================================================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    avatar: { type: String, default: null },
    color: {
      type: String,
      default: () => {
        const colors = [
          "#ef4444",
          "#f97316",
          "#eab308",
          "#22c55e",
          "#06b6d4",
          "#6366f1",
          "#a855f7",
          "#ec4899",
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      },
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model("User", userSchema);

// =============================================================================
// BOARD MODEL
// =============================================================================

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Board title is required"],
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    color: { type: String, default: "#6366f1" },
    background: { type: String, default: null },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["admin", "member", "viewer"],
          default: "member",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    isArchived: { type: Boolean, default: false },
    listOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "List" }],
  },
  { timestamps: true },
);

boardSchema.index({ owner: 1 });
boardSchema.index({ "members.user": 1 });
boardSchema.methods.isMember = function (userId) {
  return (
    this.owner.equals(userId) || this.members.some((m) => m.user.equals(userId))
  );
};
boardSchema.methods.canEdit = function (userId) {
  if (this.owner.equals(userId)) return true;
  const member = this.members.find((m) => m.user.equals(userId));
  return member && member.role !== "viewer";
};

const Board = mongoose.model("Board", boardSchema);

// =============================================================================
// LIST MODEL
// =============================================================================

const listSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "List title is required"],
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    position: { type: Number, required: true, default: 0 },
    color: { type: String, default: null },
    taskOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

listSchema.index({ board: 1, position: 1 });

const List = mongoose.model("List", listSchema);

// =============================================================================
// TASK MODEL
// =============================================================================

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true },
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    list: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    position: { type: Number, default: 0 },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    labels: [{ text: String, color: String }],
    dueDate: { type: Date, default: null },
    checklist: [checklistItemSchema],
    attachments: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    cover: { type: String, default: null },
    isArchived: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

taskSchema.index({ list: 1, position: 1 });
taskSchema.index({ board: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ title: "text", description: "text" });

const Task = mongoose.model("Task", taskSchema);

// =============================================================================
// ACTIVITY MODEL
// =============================================================================

const activitySchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "board.created",
        "board.updated",
        "board.member_added",
        "list.created",
        "list.updated",
        "list.deleted",
        "task.created",
        "task.updated",
        "task.deleted",
        "task.moved",
        "task.assigned",
        "task.unassigned",
        "task.completed",
        "task.due_date_set",
        "task.priority_changed",
        "task.checklist_item_completed",
      ],
    },
    entity: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityTitle: String,
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    description: String,
  },
  { timestamps: true },
);

activitySchema.index({ board: 1, createdAt: -1 });
activitySchema.index({ entityId: 1 });

const Activity = mongoose.model("Activity", activitySchema);

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = User; // default export for auth middleware convenience
module.exports.User = User;
module.exports.Board = Board;
module.exports.List = List;
module.exports.Task = Task;
module.exports.Activity = Activity;
