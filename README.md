# Filewhile ⚡

> Instant, zero-login temporary sharing workspace for corporate teams (HRs, Sales, BDEs, Ops, Accounts).

Drop files, text notes, and images with **2-hour auto-expiry**, a strict **65 MB capacity limit**, and a resizable 3-panel layout matching your workflow.

---

## 🚀 Features

- **2-Step Quick Start**:
  - Enter any custom room name (e.g. `/sales-pitch` or `/deal-notes`).
  - Or click to generate a secure random room (e.g. `/swift-deal-42`).
- **3 Resizable Panels (As designed)**:
  - **For Texts**: Live collaborative notes with corner tools (Copy all, Word/Char count, Download .txt/.md, Case converters, Markdown preview toggle).
  - **for Files**: Drag & drop any document, spreadsheet, or archive; download individual files or "ZIP All".
  - **For images**: Thumbnail gallery with clipboard screenshot paste (`Ctrl+V`), hover actions, and full lightbox preview.
- **Persistent Panel Sizing**: Resizing dividers save panel dimensions in `localStorage`. Zero text or files are ever stored locally.
- **Strict 65 MB Room Limit**: Server prevents uploads exceeding the 65 MB cap with real-time capacity progress meter.
- **2-Hour Auto-Expiry**: Rooms and all contents are permanently wiped from the server/cloud when the 2-hour countdown expires.
- **Mobile QR Code Sync**: Tap "QR Code" in the header to open the same room on mobile to drop camera photos.

---

## 🛠️ Quick Start

### 1. Run Both Servers (One Command)
From the project root:
```bash
npm run dev
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## ☁️ Storage Options

### Out of the Box (Local Disk Ephemeral)
Works immediately with **zero accounts or keys needed**. Files are stored in `backend/uploads/{roomId}/` and purged when the 2-hour timer completes.

### Connect Backblaze B2 (10 GB Free Forever)
When you have your Backblaze B2 credentials ready, add them to `backend/.env`:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

B2_APPLICATION_KEY_ID=your_key_id_here
B2_APPLICATION_KEY=your_secret_application_key_here
B2_BUCKET_NAME=your_bucket_name_here
B2_ENDPOINT=s3.us-east-005.backblazeb2.com
```

The backend will automatically detect the credentials and stream uploads/downloads through Backblaze B2!
