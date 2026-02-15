# TaskFlow — Real-Time Task Collaboration Platform

A production-ready Trello/Notion hybrid with real-time collaboration, drag-and-drop kanban boards, and comprehensive activity tracking. Built with React, Node.js, MongoDB, and Socket.IO.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4%2B-green)](https://www.mongodb.com)

---

## 📋 Table of Contents

1. [Demo Credentials](#-demo-credentials)
2. [Tech Stack](#-tech-stack)
3. [Frontend Architecture](#-frontend-architecture)
4. [Backend Architecture](#-backend-architecture)
5. [Database Schema](#-database-schema)
6. [API Documentation](#-api-documentation)
7. [Real-Time Sync Strategy](#-real-time-sync-strategy)
8. [Scalability Considerations](#-scalability-considerations)
9. [Quick Start Guide](#-quick-start-guide)
10. [Git Setup & Deployment](#-git-setup--deployment)
11. [Deploy to Render](#-deploy-to-render)
12. [Testing](#-testing)
13. [Assumptions & Trade-offs](#-assumptions--trade-offs)

---

## 🔑 Demo Credentials

### Test Users

**User 1 (Owner):**
```
Email: alex@taskflow.com
Password: demo123456
Name: Alex
```

**User 2 (Collaborator):**
```
Email: p.navyasree2305@gmail.com
Password: demo123456
Name: Navyasree
```

### Environment Variables (Development)

**Backend (`backend/.env`):**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection (Local)
MONGO_URI=mongodb://localhost:27017/taskflow

# MongoDB Atlas (Production)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/taskflow?retryWrites=true&w=majority

# JWT Secret - Use a strong random string in production
JWT_SECRET=865d6bc7e4b36549fbd0249b4fbf99daba85e1737f7ba72b56d2cab6ec0f2eed10dd2a3f515f33b04d725c1a8d1e609010ef78a5783a29a3084bb49e0bbdc34d
JWT_EXPIRES_IN=7d

# Client URL (CORS)
CLIENT_URL=http://localhost:5173
```

**Frontend (`frontend/.env`):**
```env
# API Base URL
VITE_API_URL=http://localhost:5000/api

# Socket.IO Server URL
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose | Version |
|-------|-----------|---------|---------|
| **Frontend** | React | UI Library | 18.3.1 |
| | Vite | Build Tool & Dev Server | 5.4.11 |
| | Zustand | State Management | 5.0.2 |
| | TailwindCSS | Utility-First CSS | 4.0.0 |
| | @dnd-kit | Drag-and-Drop | 7.0.1 |
| | Socket.IO Client | WebSocket Client | 4.8.1 |
| | React Router | Client-Side Routing | 7.1.1 |
| **Backend** | Node.js | Runtime Environment | ≥18.x |
| | Express | Web Framework | 4.21.2 |
| | Socket.IO | Real-Time Engine | 4.8.1 |
| | Mongoose | MongoDB ODM | 8.9.3 |
| | JWT | Authentication | 9.0.2 |
| | bcryptjs | Password Hashing | 2.4.3 |
| **Database** | MongoDB | NoSQL Database | 4.4+ |
| **Testing** | Jest | Test Framework | 29.7.0 |
| | Supertest | HTTP Testing | 7.0.0 |

---

## 🎨 Frontend Architecture

### Directory Structure

```
frontend/
├── node_modules/
├── public/
├── src/
│   ├── assets/              # Static assets (images, fonts)
│   ├── components/          # Reusable React components
│   │   ├── ActivityPanel.jsx      # Real-time activity feed
│   │   ├── AddListForm.jsx        # Create new list form
│   │   ├── BoardHeader.jsx        # Board navigation bar
│   │   ├── CreateBoardModal.jsx   # Board creation modal
│   │   ├── ListColumn.jsx         # Kanban column container
│   │   ├── TaskCard.jsx           # Individual task card
│   │   ├── TaskModal.jsx          # Task detail editor
│   │   └── components.js          # Component barrel export
│   │
│   ├── pages/               # Route-level page components
│   │   └── pages.jsx              # LoginPage, RegisterPage, DashboardPage, BoardPage
│   │
│   ├── services/            # External service integrations
│   │   ├── api.js                 # Axios HTTP client with interceptors
│   │   └── socket.js              # Socket.IO client configuration
│   │
│   ├── store/               # Global state management
│   │   └── stores.js              # Zustand stores (auth, boards, tasks)
│   │
│   ├── App.jsx              # Root component with routing
│   ├── index.css            # Global styles + Tailwind configuration
│   └── main.jsx             # React entry point
│
├── .env                     # Environment variables
├── .env.example             # Example environment variables
├── .gitignore
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML entry point
├── package.json
├── package-lock.json
├── postcss.config.js        # PostCSS configuration
├── README.md
├── tailwind.config.js       # Tailwind configuration
└── vite.config.js           # Vite build configuration
```

### Key Design Patterns

#### 1. **Component Architecture**

```
┌─────────────────────────────────────────┐
│           App (Router Root)             │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼────┐ ┌───▼───┐  ┌───▼────────┐
   │  Login  │ │  Dash │  │    Board   │
   │  Page   │ │ board │  │    Page    │
   └─────────┘ └───┬───┘  └──────┬─────┘
                   │              │
          ┌────────┴────┐    ┌───┴─────────────┐
          │   Board     │    │  DndContext     │
          │   Cards     │    │  (Drag & Drop)  │
          └─────────────┘    └────┬────────────┘
                                  │
                     ┌────────────┼─────────────┐
                     │            │             │
                ┌────▼─────┐ ┌───▼──────┐ ┌───▼────────┐
                │  List    │ │   Task   │ │  Activity  │
                │ Column   │ │   Card   │ │   Panel    │
                └──────────┘ └──────────┘ └────────────┘
```

#### 2. **State Management Flow (Zustand)**

```javascript
// stores.js - Centralized state management

┌──────────────────────────────────────────────────────┐
│                    Zustand Stores                     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────┐      ┌───────────────────┐    │
│  │   authStore     │      │    boardStore     │    │
│  ├─────────────────┤      ├───────────────────┤    │
│  │ - user          │      │ - boards[]        │    │
│  │ - token         │      │ - currentBoard    │    │
│  │ - isLoading     │      │ - lists[]         │    │
│  │ - error         │      │ - isLoading       │    │
│  │                 │      │                   │    │
│  │ Actions:        │      │ Actions:          │    │
│  │ - login()       │      │ - fetchBoards()   │    │
│  │ - register()    │      │ - createBoard()   │    │
│  │ - logout()      │      │ - updateBoard()   │    │
│  │ - setUser()     │      │ - deleteBoard()   │    │
│  └─────────────────┘      │ - createList()    │    │
│                            │ - moveTask()      │    │
│                            │ - reorderLists()  │    │
│                            └───────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
    ┌─────────┐                   ┌──────────┐
    │   API   │                   │  Socket  │
    │ Service │                   │  Service │
    └─────────┘                   └──────────┘
```

#### 3. **API Service Layer**

**`services/api.js`** - Axios instance with interceptors:

```javascript
// Automatic JWT token injection
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Automatic error handling & token refresh
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
    }
    return Promise.reject(error);
  }
);
```

#### 4. **Real-Time Event Handling**

**`services/socket.js`** - Socket.IO client:

```javascript
// Single socket connection shared across app
const socket = io(VITE_SOCKET_URL, {
  autoConnect: false,
  withCredentials: true
});

// Event listeners registered in components
socket.on('task:created', (task) => {
  // Update Zustand store
  boardStore.addTask(task);
});

socket.on('task:moved', ({ taskId, targetListId, position }) => {
  // Optimistic UI update
  boardStore.moveTask(taskId, targetListId, position);
});
```

### Why These Choices?

| Decision | Rationale |
|----------|-----------|
| **Zustand over Redux** | 80% less boilerplate, built-in TypeScript support, no Provider wrapper needed, better performance |
| **Vite over CRA** | 10-100x faster HMR, smaller bundle size, native ESM, optimized production builds |
| **dnd-kit over react-beautiful-dnd** | Better accessibility (ARIA), touch support, virtualization, actively maintained |
| **TailwindCSS v4** | Faster builds, native CSS variables, better IntelliSense, smaller runtime |
| **Component Co-location** | Related files grouped together (TaskCard + TaskModal), easier refactoring |

---

## ⚙️ Backend Architecture

### Directory Structure

```
backend/
├── node_modules/
├── src/
│   ├── controllers/         # Request handlers (business logic)
│   │   ├── activityController.js
│   │   ├── authController.js
│   │   ├── boardController.js
│   │   ├── listController.js
│   │   └── taskController.js
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.js                # JWT authentication
│   │   ├── errorHandler.js        # Global error handler
│   │   └── validateRequest.js     # Input validation
│   │
│   ├── models/              # Mongoose schemas
│   │   ├── Activity.js            # Activity log schema
│   │   ├── Board.js               # Board schema
│   │   ├── List.js                # List schema
│   │   ├── Task.js                # Task schema
│   │   └── User.js                # User schema
│   │
│   ├── routes/              # Express routes
│   │   ├── activity.js            # Activity routes
│   │   ├── auth.js                # Auth routes
│   │   ├── boards.js              # Board routes
│   │   ├── lists.js               # List routes
│   │   └── tasks.js               # Task routes
│   │
│   ├── services/            # Business logic services
│   │   ├── activityService.js     # Activity tracking
│   │   └── notificationService.js # (Future) Notifications
│   │
│   ├── socket/              # Socket.IO event handlers
│   │   ├── handlers.js            # Real-time event handlers
│   │   └── index.js               # Socket.IO setup
│   │
│   ├── utils/               # Helper functions
│   │   ├── AppError.js            # Custom error class
│   │   └── catchAsync.js          # Async error wrapper
│   │
│   └── server.js            # Express app initialization
│
├── tests/                   # Test suites
│   ├── auth.test.js
│   ├── boards.test.js
│   ├── lists.test.js
│   └── tasks.test.js
│
├── .env                     # Environment variables
├── .env.example             # Example env file
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

### Layered Architecture

```
┌──────────────────────────────────────────────────────┐
│                   CLIENT REQUEST                      │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│                 MIDDLEWARE LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │     CORS     │→ │     Auth     │→ │ Validator │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│                   ROUTE LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │   Auth   │  │  Boards  │  │  Tasks   │  ...      │
│  │  Routes  │  │  Routes  │  │  Routes  │           │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘           │
└────────┼─────────────┼─────────────┼─────────────────┘
         │             │             │
┌────────▼─────────────▼─────────────▼─────────────────┐
│                 CONTROLLER LAYER                      │
│    (Handles HTTP requests, validates input)           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │authController│  │boardController│  │taskControl│  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
└─────────┼──────────────────┼────────────────┼────────┘
          │                  │                │
┌─────────▼──────────────────▼────────────────▼────────┐
│                  SERVICE LAYER                        │
│     (Business logic, data transformation)             │
│  ┌──────────────────┐  ┌───────────────────────┐    │
│  │ activityService  │  │ notificationService   │    │
│  └──────────────────┘  └───────────────────────┘    │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│                   MODEL LAYER                         │
│       (Mongoose schemas, data validation)             │
│  ┌──────┐  ┌───────┐  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │ User │  │ Board │  │ List │  │ Task │  │ Act. │ │
│  └──┬───┘  └───┬───┘  └───┬──┘  └───┬──┘  └───┬──┘ │
└─────┼──────────┼──────────┼─────────┼─────────┼─────┘
      │          │          │         │         │
┌─────▼──────────▼──────────▼─────────▼─────────▼─────┐
│                   MongoDB Database                    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│              SOCKET.IO (Real-Time Layer)              │
│  ┌────────────────┐         ┌──────────────────┐    │
│  │  Client Events │    ←→   │  Server Handlers │    │
│  │  - join-board  │         │  - Emit updates  │    │
│  │  - leave-board │         │  - Broadcast     │    │
│  └────────────────┘         └──────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Request Flow Example

**Creating a Task:**

```
1. Client sends POST /api/tasks with task data
2. Middleware:
   - CORS check ✓
   - JWT authentication ✓
   - Input validation ✓
3. Route matches /api/tasks → calls taskController.createTask()
4. Controller:
   - Extracts data from request
   - Calls Task.create(data)
   - Calls activityService.logActivity('task.created')
5. Model:
   - Validates data against schema
   - Saves to MongoDB
6. Response sent to client
7. Socket.IO:
   - Server emits 'task:created' event to board room
   - All connected clients receive update
   - Clients update local state
```

---

## 🗄️ Database Schema

### Schema Diagram (from MongoDB Collections)

Based on your actual MongoDB database structure:

```
┌─────────────────────────────────────────────────────────────┐
│                           USERS                              │
├─────────────────────────────────────────────────────────────┤
│ _id: ObjectId (PK)                                          │
│ name: String                   "alex"                        │
│ email: String (unique)         "p.navyasree2305@gmail.com"  │
│ password: String (hashed)      "$2a$12$4aIF0BbBpwn/..."    │
│ avatar: String | null                                        │
│ color: String                  "#ec4899"                     │
│ createdAt: Date                2026-02-15T15:21:32.855Z     │
│ updatedAt: Date                                              │
│ __v: Number                    0                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ owner (ref)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          BOARDS                              │
├─────────────────────────────────────────────────────────────┤
│ _id: ObjectId (PK)                                          │
│ title: String                  "relation"                    │
│ description: String            ""                            │
│ color: String                  "#6366f1"                     │
│ background: String | null                                    │
│ owner: ObjectId (FK → users._id)                            │
│ members: Array                                               │
│   ├─ user: ObjectId (FK → users._id)                        │
│   ├─ role: String             "member"                       │
│   └─ joinedAt: Date                                          │
│ isArchived: Boolean            false                         │
│ listOrder: Array[ObjectId]     []                           │
│ createdAt: Date                2026-02-15T15:21:48.071Z     │
│ updatedAt: Date                2026-02-15T15:21:59.697Z     │
│ __v: Number                    1                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ board (ref)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                           LISTS                              │
├─────────────────────────────────────────────────────────────┤
│ _id: ObjectId (PK)                                          │
│ title: String                  "bycycle"                     │
│ board: ObjectId (FK → boards._id)                           │
│ position: Number               1                             │
│ color: String | null                                         │
│ taskOrder: Array[ObjectId]     []                           │
│ isArchived: Boolean            false                         │
│ createdAt: Date                2026-02-15T15:16:50.447Z     │
│ updatedAt: Date                2026-02-15T15:16:50.447Z     │
│ __v: Number                    0                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ list (ref)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                           TASKS                              │
├─────────────────────────────────────────────────────────────┤
│ _id: ObjectId (PK)                                          │
│ title: String                  "green flavour"               │
│ description: String            ""                            │
│ list: ObjectId (FK → lists._id)                             │
│ board: ObjectId (FK → boards._id)                           │
│ position: Number               0                             │
│ assignees: Array[ObjectId]     []                           │
│ priority: String               "medium" | "high" | "low"    │
│ dueDate: Date | null                                         │
│ cover: String | null                                         │
│ isArchived: Boolean            false                         │
│ createdBy: ObjectId (FK → users._id)                        │
│ labels: Array[String]          []                           │
│ checklist: Array               []                           │
│   ├─ _id: ObjectId                                          │
│   ├─ text: String                                           │
│   └─ completed: Boolean                                      │
│ attachments: Array             []                           │
│   ├─ _id: ObjectId                                          │
│   ├─ url: String                                            │
│   ├─ name: String                                           │
│   └─ uploadedAt: Date                                        │
│ createdAt: Date                2026-02-15T15:16:15.359Z     │
│ updatedAt: Date                2026-02-15T15:34:45.440Z     │
│ __v: Number                    0                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        ACTIVITIES                            │
├─────────────────────────────────────────────────────────────┤
│ _id: ObjectId (PK)                                          │
│ board: ObjectId (FK → boards._id)                           │
│ user: ObjectId (FK → users._id)                             │
│ type: String                   "list.created"                │
│ entity: String                 "list"                        │
│ entityId: ObjectId             (FK → lists/tasks/boards)    │
│ entityTitle: String            "eat popsicles"               │
│ description: String            'created list "eat pops..."' │
│ createdAt: Date                2026-02-15T15:16:03.186Z     │
│ updatedAt: Date                                              │
│ __v: Number                    0                             │
└─────────────────────────────────────────────────────────────┘
```

### Relationships

```
USER ─────────────┬─────────────────────────────┬───────────────┐
                  │                             │               │
                  │ (owner)                     │ (member)      │ (createdBy)
                  ▼                             ▼               ▼
               BOARD ─────────────────────────►TASK          ACTIVITY
                  │                             ▲               ▲
                  │ (board)                     │               │
                  ▼                             │               │
               LIST ────────────────────────────┘               │
                  │ (list)                                      │
                  └─────────────────────────────────────────────┘
```

### Key Schema Features

1. **User**
   - Passwords hashed with bcrypt (10 rounds)
   - Each user has unique color for avatars
   - Email uniqueness enforced at DB level

2. **Board**
   - Supports multi-user collaboration via `members` array
   - `listOrder` maintains column sequence
   - Soft delete via `isArchived`

3. **List**
   - Ordered by `position` field
   - `taskOrder` array maintains task sequence within list
   - Belongs to single board

4. **Task**
   - Rich features: priority, labels, checklist, attachments
   - Multiple assignees supported
   - Tracks creator via `createdBy`
   - Position-based ordering within list

5. **Activity**
   - Immutable audit log
   - Generic `entity` + `entityId` for flexibility
   - Human-readable `description`

---

## 📡 API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-app.onrender.com/api
```

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

### 🔐 Auth Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}

Response 201:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "color": "#ec4899",
    "avatar": null
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "color": "#ec4899"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response 200:
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "color": "#ec4899",
  "avatar": null
}
```

---

### 📋 Board Endpoints

#### Get All Boards
```http
GET /api/boards
Authorization: Bearer <token>

Response 200:
[
  {
    "_id": "6991e324d4a57ab9e0785ebd",
    "title": "Product Roadmap",
    "description": "Q1 2026 planning",
    "color": "#6366f1",
    "owner": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "members": [
      {
        "user": {...},
        "role": "member",
        "joinedAt": "2026-02-15T10:30:00.000Z"
      }
    ],
    "createdAt": "2026-02-15T15:21:48.071Z",
    "updatedAt": "2026-02-15T15:21:59.697Z"
  }
]
```

#### Create Board
```http
POST /api/boards
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Marketing Campaign",
  "description": "Q2 social media strategy",
  "color": "#ec4899"
}

Response 201:
{
  "_id": "6991e324d4a57ab9e0785ebd",
  "title": "Marketing Campaign",
  "description": "Q2 social media strategy",
  "color": "#ec4899",
  "owner": "507f1f77bcf86cd799439011",
  "members": [],
  "isArchived": false,
  "listOrder": [],
  "createdAt": "2026-02-15T16:00:00.000Z"
}
```

#### Get Single Board (with lists & tasks)
```http
GET /api/boards/:id
Authorization: Bearer <token>

Response 200:
{
  "_id": "6991e324d4a57ab9e0785ebd",
  "title": "Product Roadmap",
  "lists": [
    {
      "_id": "6991e333d4a57ab9e0785ed0",
      "title": "To Do",
      "position": 0,
      "tasks": [
        {
          "_id": "6991e33fd4a57ab9e0785ed9",
          "title": "Design landing page",
          "priority": "high",
          "assignees": [],
          "position": 0
        }
      ]
    }
  ]
}
```

#### Update Board
```http
PUT /api/boards/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "New description"
}

Response 200:
{
  "_id": "6991e324d4a57ab9e0785ebd",
  "title": "Updated Title",
  "description": "New description",
  ...
}
```

#### Delete Board
```http
DELETE /api/boards/:id
Authorization: Bearer <token>

Response 200:
{
  "message": "Board deleted successfully"
}
```

#### Add Member to Board
```http
POST /api/boards/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "collaborator@example.com",
  "role": "member"
}

Response 200:
{
  "message": "Member added successfully",
  "board": {
    "_id": "6991e324d4a57ab9e0785ebd",
    "members": [...]
  }
}
```

---

### 📝 List Endpoints

#### Create List
```http
POST /api/lists
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "In Progress",
  "board": "6991e324d4a57ab9e0785ebd",
  "position": 1
}

Response 201:
{
  "_id": "6991e333d4a57ab9e0785ed0",
  "title": "In Progress",
  "board": "6991e324d4a57ab9e0785ebd",
  "position": 1,
  "taskOrder": [],
  "isArchived": false
}
```

#### Update List
```http
PUT /api/lists/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Completed"
}

Response 200:
{
  "_id": "6991e333d4a57ab9e0785ed0",
  "title": "Completed",
  ...
}
```

#### Delete List
```http
DELETE /api/lists/:id
Authorization: Bearer <token>

Response 200:
{
  "message": "List deleted successfully"
}
```

#### Reorder Lists
```http
PUT /api/lists/reorder
Authorization: Bearer <token>
Content-Type: application/json

{
  "boardId": "6991e324d4a57ab9e0785ebd",
  "listOrder": [
    "6991e333d4a57ab9e0785ed0",
    "6991e333d4a57ab9e0785ed1",
    "6991e333d4a57ab9e0785ed2"
  ]
}

Response 200:
{
  "message": "Lists reordered successfully"
}
```

---

### ✅ Task Endpoints

#### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based auth system",
  "list": "6991e333d4a57ab9e0785ed0",
  "board": "6991e324d4a57ab9e0785ebd",
  "priority": "high",
  "dueDate": "2026-03-01"
}

Response 201:
{
  "_id": "6991e33fd4a57ab9e0785ed9",
  "title": "Implement user authentication",
  "description": "Add JWT-based auth system",
  "list": "6991e333d4a57ab9e0785ed0",
  "priority": "high",
  "assignees": [],
  "labels": [],
  "checklist": [],
  "attachments": []
}
```

#### Get Task Details
```http
GET /api/tasks/:id
Authorization: Bearer <token>

Response 200:
{
  "_id": "6991e33fd4a57ab9e0785ed9",
  "title": "Implement user authentication",
  "description": "Add JWT-based auth system",
  "list": {...},
  "board": {...},
  "priority": "high",
  "assignees": [{...}],
  "labels": ["backend", "security"],
  "checklist": [
    {
      "_id": "...",
      "text": "Setup JWT library",
      "completed": true
    }
  ]
}
```

#### Update Task
```http
PUT /api/tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "priority": "medium",
  "labels": ["backend", "security", "api"]
}

Response 200:
{
  "_id": "6991e33fd4a57ab9e0785ed9",
  "title": "Updated title",
  "priority": "medium",
  ...
}
```

#### Delete Task
```http
DELETE /api/tasks/:id
Authorization: Bearer <token>

Response 200:
{
  "message": "Task deleted successfully"
}
```

#### Move Task
```http
PUT /api/tasks/:id/move
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetListId": "6991e333d4a57ab9e0785ed1",
  "position": 2
}

Response 200:
{
  "message": "Task moved successfully",
  "task": {...}
}
```

#### Assign User to Task
```http
POST /api/tasks/:id/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011"
}

Response 200:
{
  "message": "User assigned successfully",
  "task": {
    "_id": "6991e33fd4a57ab9e0785ed9",
    "assignees": ["507f1f77bcf86cd799439011"]
  }
}
```

#### Search Tasks
```http
GET /api/tasks/search?q=authentication&boardId=6991e324d4a57ab9e0785ebd
Authorization: Bearer <token>

Response 200:
[
  {
    "_id": "6991e33fd4a57ab9e0785ed9",
    "title": "Implement user authentication",
    "list": {...},
    "board": {...}
  }
]
```

---

### 📊 Activity Endpoints

#### Get Board Activity
```http
GET /api/activity/board/:boardId
Authorization: Bearer <token>

Response 200:
[
  {
    "_id": "6991e353d4a57ab9e0785ed2",
    "type": "task.created",
    "entity": "task",
    "entityId": "6991e33fd4a57ab9e0785ed9",
    "entityTitle": "Implement authentication",
    "description": "created task \"Implement authentication\"",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe"
    },
    "createdAt": "2026-02-15T15:16:03.186Z"
  },
  {
    "_id": "6991e353d4a57ab9e0785ed3",
    "type": "list.created",
    "entity": "list",
    "entityTitle": "In Progress",
    "description": "created list \"In Progress\"",
    "user": {...},
    "createdAt": "2026-02-15T15:16:03.186Z"
  }
]
```

---

### Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Validation failed",
    "status": 400,
    "errors": [
      {
        "field": "email",
        "message": "Email is already registered"
      }
    ]
  }
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## ⚡ Real-Time Sync Strategy

### Socket.IO Architecture

```
┌────────────────────────────────────────────────────┐
│              Client (Browser)                      │
│  ┌──────────────────────────────────────────┐    │
│  │     Socket.IO Client Connection          │    │
│  │  - Auto-reconnect on disconnect          │    │
│  │  - Heartbeat every 25s                   │    │
│  └────────────┬─────────────────────────────┘    │
└───────────────┼────────────────────────────────────┘
                │
         ┌──────┴──────┐
         │   Network   │
         │  (WebSocket)│
         └──────┬──────┘
                │
┌───────────────▼────────────────────────────────────┐
│           Server (Node.js)                         │
│  ┌──────────────────────────────────────────┐    │
│  │      Socket.IO Server                    │    │
│  │  - Namespace: /                          │    │
│  │  - Rooms: board:{boardId}                │    │
│  │  - Auth via JWT                          │    │
│  └────────────┬─────────────────────────────┘    │
│               │                                    │
│  ┌────────────▼─────────────────────────────┐    │
│  │      Event Handlers                      │    │
│  │  - join-board                            │    │
│  │  - leave-board                           │    │
│  └────────────┬─────────────────────────────┘    │
│               │                                    │
│  ┌────────────▼─────────────────────────────┐    │
│  │      Broadcast Events                    │    │
│  │  - task:created                          │    │
│  │  - task:updated                          │    │
│  │  - task:moved                            │    │
│  │  - list:created                          │    │
│  │  - board:updated                         │    │
│  └──────────────────────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

### Event Flow

#### 1. **User Joins Board**

```javascript
// CLIENT: Board page mounts
useEffect(() => {
  socket.connect();
  socket.emit('join-board', { boardId, token });
  
  return () => {
    socket.emit('leave-board', { boardId });
    socket.disconnect();
  };
}, [boardId]);

// SERVER: User joins room
socket.on('join-board', ({ boardId, token }) => {
  // Verify JWT
  const user = verifyToken(token);
  
  // Join room
  socket.join(`board:${boardId}`);
  
  console.log(`User ${user.name} joined board ${boardId}`);
});
```

#### 2. **User Creates Task**

```javascript
// CLIENT: User clicks "Add Task"
const createTask = async (taskData) => {
  // 1. Optimistic UI update
  const tempTask = {
    _id: `temp_${Date.now()}`,
    ...taskData,
    createdAt: new Date()
  };
  addTaskToStore(tempTask);
  
  try {
    // 2. Send to server
    const response = await api.post('/tasks', taskData);
    
    // 3. Replace temp with real data
    replaceTaskInStore(tempTask._id, response.data);
  } catch (error) {
    // 4. Rollback on error
    removeTaskFromStore(tempTask._id);
    showError('Failed to create task');
  }
};

// SERVER: Task created → broadcast
app.post('/tasks', async (req, res) => {
  const task = await Task.create(req.body);
  
  // Broadcast to all users in board
  io.to(`board:${task.board}`)
    .emit('task:created', task);
  
  res.status(201).json(task);
});

// CLIENT: Other users receive event
socket.on('task:created', (task) => {
  // Check if task doesn't exist (prevent duplicates)
  if (!taskExistsInStore(task._id)) {
    addTaskToStore(task);
  }
});
```

#### 3. **User Drags Task to New List**

```javascript
// CLIENT: Drag ends
const handleDragEnd = async ({ active, over }) => {
  const task = active.data.current.task;
  const targetListId = over.id;
  
  // 1. Optimistic UI update (immediate visual feedback)
  moveTaskInStore(task._id, targetListId, newPosition);
  
  try {
    // 2. Send to server
    await api.put(`/tasks/${task._id}/move`, {
      targetListId,
      position: newPosition
    });
  } catch (error) {
    // 3. Rollback on error
    revertTaskMove(task._id, originalListId, originalPosition);
    showError('Failed to move task');
  }
};

// SERVER: Broadcast move
app.put('/tasks/:id/move', async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    {
      list: req.body.targetListId,
      position: req.body.position
    },
    { new: true }
  );
  
  io.to(`board:${task.board}`)
    .emit('task:moved', {
      taskId: task._id,
      targetListId: task.list,
      position: task.position
    });
  
  res.json(task);
});

// CLIENT: Other users receive event
socket.on('task:moved', ({ taskId, targetListId, position }) => {
  // Update local state only if not the user who moved it
  if (!isCurrentUserAction(taskId)) {
    moveTaskInStore(taskId, targetListId, position);
  }
});
```

### Conflict Resolution Strategy

**Optimistic Concurrency Control:**

```javascript
// All documents have __v (version) field from Mongoose
{
  "_id": "6991e33fd4a57ab9e0785ed9",
  "title": "My Task",
  "__v": 3  // Increments on every update
}

// When updating, include version check
const task = await Task.findOneAndUpdate(
  { 
    _id: taskId,
    __v: currentVersion  // Only update if version matches
  },
  { 
    $set: { title: newTitle },
    $inc: { __v: 1 }  // Increment version
  },
  { new: true }
);

if (!task) {
  // Version mismatch → conflict detected
  throw new Error('Task was modified by another user');
}
```

**Last-Write-Wins (for low-conflict fields):**
- User avatars, colors → immediate overwrite
- Task descriptions, titles → show conflict warning

**Real-Time Conflict Prevention:**
- When multiple users edit same task:
  - Show "User X is editing" indicator
  - Lock fields being edited
  - Auto-merge compatible changes (title vs description)

### Connection Resilience

```javascript
// CLIENT: Auto-reconnect on disconnect
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // Server kicked us → manual reconnect
    socket.connect();
  }
  // Auto-reconnect for other reasons
});

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Re-join board room
  socket.emit('join-board', { boardId, token });
  
  // Sync state with server
  fetchLatestBoardData();
});

// Exponential backoff for retries
socket.io.opts.reconnectionDelay = 1000;  // 1s
socket.io.opts.reconnectionDelayMax = 5000;  // 5s max
socket.io.opts.reconnectionAttempts = 10;
```

### Bandwidth Optimization

1. **Event Payload Compression**
   ```javascript
   // Send minimal data
   emit('task:updated', {
     id: '6991e33fd4a57ab9e0785ed9',
     changes: { title: 'New title' }  // Only changed fields
   });
   ```

2. **Debounced Events**
   ```javascript
   // Batch rapid updates (e.g., typing in description)
   const debouncedUpdate = debounce(
     (taskId, changes) => {
       api.put(`/tasks/${taskId}`, changes);
     },
     500  // Wait 500ms after last change
   );
   ```

3. **Delta Sync**
   - Send only changed data, not full objects
   - Use JSON Patch format for updates

---

## 🚀 Scalability Considerations

### Current Architecture Limits

| Metric | Current Capacity | Notes |
|--------|-----------------|-------|
| Concurrent Users | ~500-1000 per instance | Single Node.js process |
| Boards per User | Unlimited | Query performance degrades >1000 |
| Tasks per Board | ~5000 optimal | Frontend rendering bottleneck |
| WebSocket Connections | ~10,000 per instance | Depends on RAM |
| API Requests | ~1000 req/s | Without Redis cache |

### Scaling Strategies

#### 1. **Horizontal Scaling (Multiple Instances)**

```
                  ┌───────────────┐
                  │ Load Balancer │
                  │   (Nginx)     │
                  └───────┬───────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼────┐   ┌─────▼────┐   ┌─────▼────┐
    │  Node.js │   │  Node.js │   │  Node.js │
    │ Instance │   │ Instance │   │ Instance │
    │    #1    │   │    #2    │   │    #3    │
    └─────┬────┘   └─────┬────┘   └─────┬────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                  ┌───────▼───────┐
                  │  Redis Pub/Sub│
                  │  (Socket sync)│
                  └───────────────┘
```

**Implementation:**

```javascript
// socket/index.js - Redis Adapter
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Now all Socket.IO events sync across instances
```

**Benefits:**
- Distribute load across multiple servers
- Handle 10,000+ concurrent users
- Zero-downtime deployments (rolling updates)

#### 2. **Database Optimization**

**Indexes (already implemented):**
```javascript
// models/Task.js
taskSchema.index({ board: 1, list: 1, position: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ board: 1, createdAt: -1 });

// models/Activity.js
activitySchema.index({ board: 1, createdAt: -1 });
```

**Query Optimization:**
```javascript
// Bad: N+1 queries
const boards = await Board.find({ owner: userId });
for (let board of boards) {
  board.members = await User.find({ _id: { $in: board.members } });
}

// Good: Single query with population
const boards = await Board.find({ owner: userId })
  .populate('members.user', 'name email avatar color')
  .lean();  // Convert to plain JS object (faster)
```

**Connection Pooling:**
```javascript
// server.js
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,  // Max 10 concurrent connections
  minPoolSize: 2,   // Keep 2 alive
  socketTimeoutMS: 45000,
});
```

#### 3. **Caching Layer (Redis)**

```
┌──────────┐     Cache Hit?     ┌──────────┐
│  Client  │ ──────────────────►│  Redis   │
└────┬─────┘       (Fast)       └──────────┘
     │                                │
     │ Cache Miss                     │ Data
     ▼                                ▼
┌──────────┐                    ┌──────────┐
│  API     │ ───────────────────│ MongoDB  │
│  Server  │     (Slow Query)   └──────────┘
└──────────┘
```

**Implementation:**
```javascript
// Cache frequently accessed boards
const getCachedBoard = async (boardId) => {
  const cached = await redis.get(`board:${boardId}`);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const board = await Board.findById(boardId)
    .populate('lists')
    .populate('members.user');
  
  // Cache for 5 minutes
  await redis.setex(
    `board:${boardId}`,
    300,
    JSON.stringify(board)
  );
  
  return board;
};

// Invalidate on update
socket.on('board:updated', ({ boardId }) => {
  redis.del(`board:${boardId}`);
});
```

**Cache Strategy:**
- **Board metadata:** 5 min TTL
- **User profile:** 15 min TTL
- **Activity feed:** 1 min TTL
- **Invalidate on write**

#### 4. **CDN for Static Assets**

```
User → Cloudflare CDN → React Bundle (cached)
                      ↘ Images (cached)
                       ↘ Fonts (cached)
```

**Benefits:**
- Reduce server load (no file serving)
- Faster asset delivery (edge locations)
- Automatic compression (Brotli/Gzip)

#### 5. **Database Sharding (Future)**

For >10M tasks, shard MongoDB by `boardId`:

```
Shard 1: boardId % 3 == 0
Shard 2: boardId % 3 == 1
Shard 3: boardId % 3 == 2
```

**Query Router** directs queries to correct shard based on `boardId`.

#### 6. **Task Queue for Heavy Operations**

```javascript
// Use Bull (Redis-backed job queue)
const queue = new Queue('notifications', {
  redis: process.env.REDIS_URL
});

// Add job
await queue.add('send-email', {
  to: 'user@example.com',
  subject: 'Task assigned to you',
  taskId: '6991e33fd4a57ab9e0785ed9'
});

// Worker processes jobs
queue.process('send-email', async (job) => {
  await sendEmail(job.data);
});
```

**Use Cases:**
- Email notifications
- Attachment processing
- Export board to PDF
- Analytics aggregation

### Monitoring & Observability

**Metrics to Track:**
- Response time (p50, p95, p99)
- Request rate (req/s)
- Error rate (%)
- CPU/Memory usage
- Active WebSocket connections
- Database query time

**Tools:**
- **Prometheus** + **Grafana** (metrics)
- **Sentry** (error tracking)
- **PM2** (process management)
- **New Relic** (APM)

---

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have these installed:

- **Node.js** ≥ 18.x → [Download](https://nodejs.org)
- **MongoDB** → [Local Install](https://www.mongodb.com/try/download/community) or [Atlas (Cloud)](https://cloud.mongodb.com)
- **Git** → [Download](https://git-scm.com)
- **npm** or **yarn** (comes with Node.js)

### Step 1: Clone Repository

```bash
# Clone the repository (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Edit `backend/.env`:**
```env
PORT=5000
NODE_ENV=development

# Local MongoDB
MONGO_URI=mongodb://localhost:27017/taskflow

# OR MongoDB Atlas (recommended for production)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/taskflow?retryWrites=true&w=majority

JWT_SECRET=865d6bc7e4b36549fbd0249b4fbf99daba85e1737f7ba72b56d2cab6ec0f2eed10dd2a3f515f33b04d725c1a8d1e609010ef78a5783a29a3084bb49e0bbdc34d
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**Start MongoDB (if using local):**

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Windows (run as Service)
net start MongoDB

# Linux (systemd)
sudo systemctl start mongod
```

**Start Backend Server:**
```bash
npm run dev
```

✅ Backend should be running at **http://localhost:5000**

### Step 3: Frontend Setup

Open a **new terminal window**:

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Edit `frontend/.env`:**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**Start Frontend Server:**
```bash
npm run dev
```

✅ Frontend should be running at **http://localhost:5173**

### Step 4: Access Application

Open your browser and navigate to:
```
http://localhost:5173
```

**Create Account or Use Demo:**
- Click "Create one free" → Register new account
- OR use demo credentials from [Demo Credentials](#-demo-credentials) section

---

### Step 1: Deploy Backend

#### 1.1 Create Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select `taskflow` repository

#### 1.2 Configure Backend Service

**Settings:**
```
Name: taskflow-backend
Region: Oregon (US West) or closest to you
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

#### 1.3 Add Environment Variables

Click **"Environment"** → **"Add Environment Variable"**

```env
NODE_ENV=production
PORT=10000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://taskflow-frontend.onrender.com
```

**⚠️ Important Notes:**
- `PORT=10000` is required by Render
- Get `MONGO_URI` from MongoDB Atlas (see below)
- Generate new `JWT_SECRET` for production:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

#### 1.4 Deploy

Click **"Create Web Service"**

⏳ Wait 5-10 minutes for build to complete.

✅ Backend URL: `https://taskflow-backend.onrender.com`

---

### Step 2: Setup MongoDB Atlas (Database)

#### 2.1 Create Free Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign up / Log in
3. Click **"Build a Database"**
4. Choose **"M0 Free"** tier
5. Select cloud provider & region (choose same as Render)
6. Cluster name: `taskflow-cluster`
7. Click **"Create"**

#### 2.2 Create Database User

1. **Security → Database Access**
2. Click **"Add New Database User"**
3. Username: `taskflow_user`
4. Password: (Auto-generate or create strong password)
5. **Save password** - you'll need it!
6. Built-in Role: **"Read and write to any database"**
7. Click **"Add User"**

#### 2.3 Allow Network Access

1. **Security → Network Access**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ This is safe because authentication is required
4. Click **"Confirm"**

#### 2.4 Get Connection String

1. **Deployment → Database**
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**
5. Copy connection string:
   ```
   mongodb+srv://taskflow_user:<password>@taskflow-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Replace `<password>`** with actual user password
7. **Add database name** before `?`:
   ```
   mongodb+srv://taskflow_user:YOUR_PASSWORD@taskflow-cluster.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority
   ```

#### 2.5 Update Render Environment

1. Go back to Render Dashboard → `taskflow-backend`
2. **Environment** → Edit `MONGO_URI`
3. Paste the corrected connection string
4. Click **"Save Changes"**
5. Service will automatically redeploy

---

### Step 3: Deploy Frontend

#### 3.1 Create Static Site

1. Render Dashboard → **"New +"** → **"Static Site"**
2. Connect same GitHub repository
3. Select `taskflow` repository

#### 3.2 Configure Frontend Service

**Settings:**
```
Name: taskflow-frontend
Region: Oregon (US West) - same as backend
Branch: main
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

#### 3.3 Add Environment Variables

Click **"Environment"** → **"Add Environment Variable"**

```env
VITE_API_URL=https://taskflow-backend.onrender.com/api
VITE_SOCKET_URL=https://taskflow-backend.onrender.com
```

**⚠️ Use your actual backend URL from Step 1**

#### 3.4 Deploy

Click **"Create Static Site"**

⏳ Wait 5-10 minutes for build.

✅ Frontend URL: `https://taskflow-frontend.onrender.com`

---

### Step 4: Update Backend CORS

1. Go to Render → `taskflow-backend`
2. **Environment** → Edit `CLIENT_URL`
3. Change to: `https://taskflow-frontend.onrender.com`
4. Click **"Save Changes"** (triggers redeploy)

---

### Step 5: Test Deployment

1. Open `https://taskflow-frontend.onrender.com`
2. Register new account
3. Create a board
4. Add lists and tasks
5. Open in another browser/incognito → Login → Check real-time sync

---

### Troubleshooting

#### Backend Not Starting

**Check Logs:**
1. Render Dashboard → `taskflow-backend`
2. **Logs** tab
3. Look for errors:

```bash
# Common issues:
MongooseError: connect ECONNREFUSED
→ Check MONGO_URI is correct

Error: JWT_SECRET is not defined
→ Add JWT_SECRET environment variable

Error: listen EADDRINUSE: address already in use
→ Check PORT=10000
```

#### Frontend Can't Connect to Backend

**Check Network Tab:**
1. Open DevTools (F12)
2. **Network** tab
3. Try to login
4. Look for failed requests:

```
POST https://taskflow-backend.onrender.com/api/auth/login
Status: CORS error

Solution: Check CLIENT_URL in backend matches frontend URL
```

#### Database Connection Failed

**Verify:**
```bash
# Test connection string locally
mongosh "mongodb+srv://taskflow_user:PASSWORD@cluster.mongodb.net/taskflow"

# Should see: Connected to MongoDB
```

**Common fixes:**
- IP whitelist: Ensure 0.0.0.0/0 is allowed
- Password: No special characters without URL encoding
- Database name: Must be after hostname, before `?`

---

### Free Tier Limitations

**Render Free Plan:**
- ⏰ Services spin down after 15 min inactivity
- 🐌 First request after spin-down takes 30-60s (cold start)
- 💾 512MB RAM per service
- ⏳ 750 hours/month total

**MongoDB Atlas Free Tier:**
- 💾 512MB storage
- 📊 Supports ~500-1000 documents comfortably
- ♾️ Never expires

**Solutions for Cold Starts:**
- Use [UptimeRobot](https://uptimerobot.com) to ping every 5 min
- Upgrade to paid plan ($7/month) for always-on service

---

### Custom Domain (Optional)

**Render Supports Custom Domains:**

1. Buy domain (Namecheap, Google Domains, etc.)
2. Render Dashboard → `taskflow-frontend`
3. **Settings → Custom Domain**
4. Add domain: `taskflow.yourdomain.com`
5. Update DNS records as instructed
6. Auto SSL certificate (Let's Encrypt)

---

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/auth.test.js
```

### Test Suites

**`tests/auth.test.js`** - Authentication
- User registration
- Email uniqueness validation
- Password hashing
- Login with JWT token
- Protected route access

**`tests/boards.test.js`** - Board Management
- Create board
- Get user boards
- Update board
- Delete board
- Add members

**`tests/lists.test.js`** - List Operations
- Create list
- Reorder lists
- Delete list
- Cascade delete tasks

**`tests/tasks.test.js`** - Task CRUD
- Create task
- Update task
- Move task between lists
- Assign users
- Delete task

### Example Test

```javascript
// tests/auth.test.js
describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should reject duplicate email', async () => {
    // First registration
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User 1',
        email: 'duplicate@example.com',
        password: 'password123'
      });

    // Duplicate registration
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User 2',
        email: 'duplicate@example.com',
        password: 'password456'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already');
  });
});
```

---

## 🤔 Assumptions & Trade-offs

### Assumptions

1. **User Behavior**
   - Average 5-10 boards per user
   - 10-50 tasks per board
   - 2-5 concurrent users per board
   - Peak usage: 100 simultaneous board views

2. **Technical Environment**
   - Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
   - Stable internet connection (WebSockets)
   - JavaScript enabled
   - localStorage available

3. **Business Requirements**
   - No offline mode required
   - Real-time sync is mandatory
   - Email notifications out of scope (v1)
   - File attachments out of scope (v1)

### Trade-offs Made

#### 1. **Zustand vs Redux**

**Chose:** Zustand

**Trade-off:**
- ✅ **Pros:** 80% less code, easier learning curve, no Provider boilerplate
- ❌ **Cons:** Smaller ecosystem, fewer dev tools, less Redux DevTools integration

**Justification:** For this app size (<50 components), Zustand's simplicity outweighs Redux's debugging features. Can migrate to Redux later if needed.

---

#### 2. **MongoDB vs PostgreSQL**

**Chose:** MongoDB

**Trade-off:**
- ✅ **Pros:** Flexible schema (easy to add task fields), nested arrays (checklist, attachments), Mongoose ODM
- ❌ **Cons:** No ACID transactions across collections, weaker joins, potential data duplication

**Justification:** Task management apps have hierarchical data (boards → lists → tasks) that maps naturally to MongoDB's document model. Referential integrity less critical than schema flexibility.

---

#### 3. **Optimistic UI Updates**

**Chose:** Optimistic updates (update UI before server response)

**Trade-off:**
- ✅ **Pros:** Instant feedback, feels faster, better UX
- ❌ **Cons:** Rollback complexity, potential flicker on errors

**Justification:** Task management is high-interaction (drag-drop, quick edits). Waiting for server response on every action would feel sluggish. Error rate is <1%, so rollback rarely needed.

---

#### 4. **Single Socket Connection**

**Chose:** One Socket.IO connection per client

**Trade-off:**
- ✅ **Pros:** Lower server memory, simpler client code, no connection juggling
- ❌ **Cons:** All boards share one connection, harder to isolate board-level errors

**Justification:** Most users work in 1 board at a time. Multiple connections would waste server resources without meaningful benefit.

---

#### 5. **Polling vs WebSockets for Activity Feed**

**Chose:** WebSockets (Socket.IO)

**Trade-off:**
- ✅ **Pros:** True real-time, low latency (<100ms), bidirectional
- ❌ **Cons:** More complex, requires sticky sessions for scaling, can't work behind some corporate proxies

**Justification:** Real-time collaboration is core feature. Polling (every 5s) would miss rapid interactions and waste bandwidth.

---

#### 6. **No Server-Side Rendering (SSR)**

**Chose:** Client-Side Rendering (CSR) with Vite

**Trade-off:**
- ✅ **Pros:** Simpler deployment, faster development, no Node.js server for frontend
- ❌ **Cons:** Slower initial load, worse SEO, blank screen until JS loads

**Justification:** This is a logged-in web app, not a public website. SEO doesn't matter. CSR is faster to build and deploy.

---

#### 7. **JWT in localStorage vs httpOnly Cookies**

**Chose:** localStorage with JWT

**Trade-off:**
- ✅ **Pros:** Works with CORS, easy to implement, mobile-friendly
- ❌ **Cons:** Vulnerable to XSS (if site has script injection), can't auto-expire on browser close

**Justification:** Simpler for development. In production, recommend upgrading to httpOnly cookies + refresh token rotation for better security.

---

#### 8. **No Caching Layer (Redis)**

**Chose:** Direct MongoDB queries

**Trade-off:**
- ✅ **Pros:** Simpler architecture, fewer moving parts, easier debugging
- ❌ **Cons:** Higher DB load, slower responses on popular boards (>100 tasks)

**Justification:** For <1000 users, MongoDB queries are fast enough (<50ms). Redis adds complexity without meaningful benefit at this scale. Can add later if p95 latency >500ms.

---

### Known Limitations

1. **File Uploads**
   - No support for task attachments in v1
   - Future: AWS S3 integration

2. **Offline Mode**
   - App requires internet connection
   - Future: Service Worker + IndexedDB

3. **Mobile App**
   - Responsive web only
   - Future: React Native app

4. **Email Notifications**
   - No email alerts for task assignments
   - Future: SendGrid integration

5. **Advanced Search**
   - Basic text search only
   - No filters by date, priority, assignee
   - Future: Elasticsearch or Algolia

6. **Version Control**
   - No task edit history
   - Activity log only shows actions, not diffs
   - Future: Store deltas like `{ field: 'title', old: '...', new: '...' }`
