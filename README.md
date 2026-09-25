# Filewhile ⚡

> Instant, zero-login temporary sharing workspace for corporate teams (HR, Sales, BDEs, Ops, Accounts).

Drop files, collaborative text notes, and screenshots with **20-minute user-visible countdown**, **22-minute automated cloud purge**, a strict **65 MB capacity limit**, and a resizable 3-box layout.

---

## 🚀 Features

- **Zero-Login Quick Start**:
  - Enter any custom room name (e.g. `/deals-q3` or `/interview-notes`).
  - Or click to generate a secure, readable random room (e.g. `/swift-falcon-42`).
- **3 Resizable Workspace Panels**:
  - **Box 1 (Notes & Texts)**: Real-time collaborative notepad with corner tools (Copy all, Word/Char count, Download `.txt`/`.md`, Case converters, Markdown preview toggle).
  - **Box 2 (Files)**: Drag & drop documents (PDF, DOCX, XLSX, ZIP, code); download individual files or "Download All as ZIP".
  - **Box 3 (Images & Screenshots)**: Visual thumbnail gallery with global clipboard paste (`Ctrl+V`), hover actions, and interactive Lightbox preview modal.
- **Persistent Panel Layout**: Drag dividers horizontally and vertically; layout split percentages save to `localStorage`.
- **Strict 65 MB Room Limit**: Server and client prevent uploads exceeding the 65 MB cap with real-time capacity progress meter.
- **20-Minute TTL Expiry**: Displays a 20-minute countdown to peers; background sweeper automatically purges cloud storage and server memory after 22 minutes (2-minute buffer).
- **Mobile QR Code Sync**: Tap "Mobile Sync" in the header to open the same room on your phone and drop camera photos straight to desktop.
- **Unified Production Serving**: The Express server can serve the compiled frontend (`frontend/dist/`) directly on a single port for zero-cost deployment.

---

## 🛠️ Development Setup

### 1. Install Dependencies
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. Run Locally
```bash
npm run dev
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## ☁️ Cloud Storage Options

### Option A: Supabase Storage (Configured & Recommended)
Zero credit card required with free tier. In `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_key_here
SUPABASE_BUCKET_NAME=filewhile
```

### Option B: Local Ephemeral Disk Storage
If no cloud credentials are provided, Filewhile will automatically store files in `backend/uploads/{roomId}/` and delete them after 22 minutes.

---

## 🚢 Production Deployment

Filewhile is configured for single-port deployment on **Render**, **Railway**, **Fly.io**, or any VPS:

1. **Build Command**: `npm run build`
2. **Start Command**: `npm start`
3. **Environment Variables**:
   - `PORT`: (Provided automatically by host, or `5000`)
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SECRET_KEY`: Your Supabase service key
   - `SUPABASE_BUCKET_NAME`: `filewhile`
