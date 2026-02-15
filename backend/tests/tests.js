// =============================================================================
// tests.js — All Jest test suites in one file
// Sections: SETUP | AUTH TESTS | BOARD TESTS | LIST & TASK TESTS
// =============================================================================

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const { app } = require("../src/server");

// =============================================================================
// GLOBAL TEST SETUP
// =============================================================================

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-secret-key-for-jest";
  process.env.NODE_ENV = "test";
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({});
  }
});

// ── Helper: register a user and return token ─────────────────────────────────
const makeUser = async (email = "user@test.com", name = "Test User") => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "password123" });
  return res.body.token;
};

// =============================================================================
// AUTH TESTS
// =============================================================================

describe("Auth — POST /api/auth/register", () => {
  it("registers a new user and returns token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alice",
        email: "alice@test.com",
        password: "password123",
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("email", "alice@test.com");
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("rejects duplicate email", async () => {
    const data = {
      name: "Alice",
      email: "dup@test.com",
      password: "password123",
    };
    await request(app).post("/api/auth/register").send(data);
    const res = await request(app).post("/api/auth/register").send(data);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already/i);
  });

  it("rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "x@x.com" });
    expect(res.status).toBe(400);
  });

  it("rejects password shorter than 6 chars", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Bob", email: "bob@test.com", password: "123" });
    expect(res.status).toBe(400);
  });
});

describe("Auth — POST /api/auth/login", () => {
  beforeEach(() => makeUser("login@test.com"));

  it("logs in with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  it("rejects unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@test.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});

describe("Auth — GET /api/auth/me", () => {
  it("returns current user with valid token", async () => {
    const token = await makeUser("me@test.com");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("me@test.com");
  });

  it("rejects request without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// BOARD TESTS
// =============================================================================

describe("Boards", () => {
  let token;
  beforeEach(async () => {
    token = await makeUser("board@test.com");
  });

  it("creates a board", async () => {
    const res = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Board", description: "Test" });
    expect(res.status).toBe(201);
    expect(res.body.board.title).toBe("My Board");
  });

  it("gets all boards", async () => {
    await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "B1" });
    await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "B2" });
    const res = await request(app)
      .get("/api/boards")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.boards.length).toBe(2);
  });

  it("gets a board with its lists", async () => {
    const createRes = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "B1" });
    const res = await request(app)
      .get(`/api/boards/${createRes.body.board._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("lists");
  });

  it("rejects board creation without title", async () => {
    const res = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("updates a board", async () => {
    const {
      body: { board },
    } = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Old" });
    const res = await request(app)
      .put(`/api/boards/${board._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New" });
    expect(res.status).toBe(200);
    expect(res.body.board.title).toBe("New");
  });

  it("deletes a board", async () => {
    const {
      body: { board },
    } = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Del" });
    const res = await request(app)
      .delete(`/api/boards/${board._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// =============================================================================
// LIST & TASK TESTS
// =============================================================================

describe("Lists and Tasks", () => {
  let token, boardId, listId;

  beforeEach(async () => {
    token = await makeUser("listuser@test.com");
    const bRes = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Board" });
    boardId = bRes.body.board._id;
    const lRes = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "To Do", boardId });
    listId = lRes.body.list._id;
  });

  it("creates a list", async () => {
    const res = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "In Progress", boardId });
    expect(res.status).toBe(201);
    expect(res.body.list.title).toBe("In Progress");
  });

  it("updates a list", async () => {
    const res = await request(app)
      .put(`/api/lists/${listId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Renamed" });
    expect(res.status).toBe(200);
    expect(res.body.list.title).toBe("Renamed");
  });

  it("creates a task", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Task", listId, priority: "high" });
    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe("My Task");
    expect(res.body.task.priority).toBe("high");
  });

  it("updates a task", async () => {
    const {
      body: { task },
    } = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Original", listId });
    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe("Updated");
  });

  it("deletes a task", async () => {
    const {
      body: { task },
    } = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Delete Me", listId });
    const res = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("deletes a list", async () => {
    const res = await request(app)
      .delete(`/api/lists/${listId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("moves a task to another list", async () => {
    const {
      body: { task },
    } = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", listId });
    const {
      body: { list: list2 },
    } = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Done", boardId });
    const res = await request(app)
      .put(`/api/tasks/${task._id}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetListId: list2._id, position: 0 });
    expect(res.status).toBe(200);
    expect(res.body.task.list).toBe(list2._id);
  });
});
