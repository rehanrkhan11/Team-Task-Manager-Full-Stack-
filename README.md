# ⬡ ProjectFlow

A clean, full-stack project management tool designed for teams that need role-based control without the bloat. 

## 🛠 Tech Stack

*   **Backend**: Node.js + Express + SQLite (via `better-sqlite3`)
*   **Frontend**: React + Vite + React Router
*   **Auth**: JWT with 7-day expiration
*   **Database**: SQLite — zero-config and file-based, making it perfect for quick Railway deployments

## ✨ Features

*   🔐 **Secure Auth**: Full signup and login flow using JSON Web Tokens.
*   📁 **Project Hub**: Create and manage multiple workstreams in one place.
*   👥 **Team Management**: Invite members and assign **Admin** or **Member** roles.
*   ✅ **Task Tracking**: Full CRUD support for tasks with status (Todo/In Progress/Done), priority levels, assignees, and due dates.
*   📊 **Visual Insights**: A dashboard featuring progress bars, stats, and overdue task tracking.
*   🗂 **Flexible Views**: Switch between a Kanban board and a standard list view for every project.
*   🔒 **Permission Layers**: Built-in role-based access control (RBAC) to keep data secure.

---

## 🚦 Role Permissions

| Action | Owner | Admin | Member |
| :--- | :---: | :---: | :---: |
| Create project | ✅ | — | — |
| Delete project | ✅ | ❌ | ❌ |
| Edit project | ✅ | ✅ | ❌ |
| Add/remove members | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ✅ |
| Edit any task | ✅ | ✅ | ❌ |
| Edit own/assigned tasks | ✅ | ✅ | ✅ |
| Delete tasks | ✅ | ✅ | Own only |



---

## 💻 Local Development

### 1. Spin up the Backend
```bash
cd backend
cp .env.example .env     # Remember to set your JWT_SECRET
npm install
npm run dev              # Server runs on port 3001
```


### 2. Launch the Frontend
```bash
cd frontend
npm install
npm run dev              # Runs on port 5173 (proxies /api requests to 3001)
```


---

## 🚀 Deploying to Railway

### Step 1: Push to GitHub
Initialize your repo and push your code to a new GitHub repository.

### Step 2: Connect to Railway
1. Go to [railway.app](https://railway.app).
2. Start a **New Project** and select **Deploy from GitHub**.
3. Choose your `projectflow` repository.

### Step 3: Configure Environment Variables
Add these in the Railway dashboard:
*   `NODE_ENV=production`
*   `JWT_SECRET=your_secret_string`
*   `PORT=3001`
*   `DB_PATH=/app/data/projectflow.db`


### Step 4: Persistent Storage (Important!)
By default, Railway filesystems are ephemeral. To save your data between deployments:
1. Go to your service settings and **Add Volume**.
2. Set the mount path to `/app/data`.
3. Ensure your `DB_PATH` variable points to this directory.

---

## 📖 API Quick Reference

### Auth
*   `POST /api/auth/signup` — Register a new user.
*   `POST /api/auth/login` — Get your access token.
*   `GET /api/auth/me` — Verify your session.

### Projects & Members
*   `GET /api/projects` — List all accessible projects.
*   `POST /api/projects` — Start a new project.
*   `POST /api/projects/:id/members` — Add someone to your team.

### Tasks
*   `GET /api/projects/:projectId/tasks` — Fetch tasks (supports status/priority filters).
*   `PUT /api/projects/:projectId/tasks/:taskId` — Update task progress or details.

> **Note**: All protected routes require an `Authorization: Bearer <token>` header.
