# Face Recognition Attendance System

A MERN-based attendance system that recognizes registered students/employees from a webcam feed and automatically records their attendance.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Vite, Ant Design v6, react-router-dom v7, axios, dayjs, face-api.js (in-browser face detection & descriptor extraction)
- **Backend**: Node.js (ESM) + Express v5, MongoDB + Mongoose v9, JWT auth, bcryptjs, express-validator, multer, helmet, cors, morgan

Requires **Node.js >= 20.19** (Mongoose v9 uses runtime APIs not available in Node 18). If you use `nvm`, run `nvm use` in `server/` and `client/` — both have a `.nvmrc`.

## How it works

- Face matching runs in two stages: the browser loads `face-api.js` models and extracts a 128-value face descriptor from the webcam feed; the backend independently computes the closest match (Euclidean distance) against all enrolled members' stored descriptors and decides the identity server-side.
- Public registration (`/register`) only creates **admin** accounts, gated by an `ADMIN_SECRET` invite code from the server `.env`. Admins then add students/employees and enroll their face from the **Manage Users** screen.

## Setup

1. **Backend**
   ```
   cd server
   cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, ADMIN_SECRET, etc.
   npm install
   npm run dev
   ```
2. **Frontend**
   ```
   cd client
   cp .env.example .env   # optional, defaults to http://localhost:8000/api
   npm install
   npm run dev
   ```
3. Open the app, go to **Register**, and create the first admin account using the `ADMIN_SECRET` from `server/.env`.
4. Log in as admin → **Manage Users** → add a student/employee → **Enroll Face** (uses your webcam).
5. Go to **Mark Attendance** and stand in front of the camera to check in.

All credentials and secrets are read from environment variables only — nothing is hardcoded in the source.
