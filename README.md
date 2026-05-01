# ⬡ ProjectFlow

A full-stack project management app with role-based access control.

## Tech Stack

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React + Vite + React Router
- **Auth**: JWT (7-day tokens)
- **DB**: SQLite (zero-config, file-based — perfect for Railway)

## Features

- 🔐 JWT Authentication (signup/login)
- 📁 Project creation & management
- 👥 Team members with **Admin / Member** roles
- ✅ Task CRUD with status (Todo / In Progress / Done), priority, assignee, due date
- 📊 Dashboard with stats, progress bars, overdue tracking
- 🗂 Kanban board + list view per project
- 🔒 Role-based access control throughout

## Role Permissions

| Action | Owner | Admin | Member |
|---|---|---|---|
| Create project | ✅ | — | — |
| Delete project | ✅ | ❌ | ❌ |
| Edit project | ✅ | ✅ | ❌ |
| Add/remove members | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ✅ |
| Edit any task | ✅ | ✅ | ❌ |
| Edit own/assigned tasks | ✅ | ✅ | ✅ |
| Delete tasks | ✅ | ✅ | Own only |

## Local Development

### 1. Backend

```bash
cd backend
cp .env.example .env     # edit JWT_SECRET
npm install
npm run dev              # runs on :3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev              # runs on :5173, proxies /api to :3001
```

## Deploy to Railway

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/projectflow.git
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo

### Step 3 — Set environment variables in Railway

```
NODE_ENV=production
JWT_SECRET=your_long_random_secret_here
PORT=3001
DB_PATH=/app/data/projectflow.db
```

> **Tip**: For a persistent DB on Railway, add a Volume and mount it at `/app/data`. Without a volume the DB resets on redeploy (fine for testing).

### Step 4 — Deploy

Railway auto-detects the `railway.toml` and runs:
- Build: `npm run build` (installs deps + builds React)
- Start: `npm start` (serves both API and static frontend from Express)

### Adding a Volume (recommended for production)

1. Railway Dashboard → your service → Volumes → Add Volume
2. Mount path: `/app/data`
3. Set `DB_PATH=/app/data/projectflow.db`

## API Reference

### Auth
- `POST /api/auth/signup` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me` — requires auth

### Projects
- `GET /api/projects`
- `POST /api/projects` — `{ name, description? }`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/members` — `{ email, role }`
- `PUT /api/projects/:id/members/:userId` — `{ role }`
- `DELETE /api/projects/:id/members/:userId`

### Tasks
- `GET /api/projects/:projectId/tasks?status=&priority=&assignee=`
- `POST /api/projects/:projectId/tasks`
- `PUT /api/projects/:projectId/tasks/:taskId`
- `DELETE /api/projects/:projectId/tasks/:taskId`

### Dashboard
- `GET /api/dashboard`

All authenticated endpoints require `Authorization: Bearer <token>`.
