# Filewhile — Future Roadmap & Architecture Plans

---

## 1. Feedback Module (Priority Milestone)

### 1.1 Objective
Empower users to report issues, suggest features, and rate their experience directly within Filewhile without compromising the app's core principle: **Zero Login, Zero Friction, and Privacy-First Design**.

### 1.2 User Interface & Experience
- **Unobtrusive Trigger**:
  - A subtle floating trigger button in the bottom corner (`Feedback 💬`) or an entry in the top navbar menu.
  - Sits outside active workspace drop zones to prevent drag-and-drop interference.
- **Lightweight Modal / Drawer**:
  - **1-Click Sentiment Rating**: Fast 5-point emoji scale (😍 Loved it, 🙂 Good, 😐 Okay, 🙁 Confused, 😡 Frustrated).
  - **Category Selectors**:
    - 🐛 Bug Report
    - 💡 Feature Idea
    - 🎨 UI / Design Feedback
    - 💬 General Feedback
  - **Message Box**: Minimal text area with character counter.
  - **Optional Follow-Up Email**: Completely optional for users who want replies (anonymous by default).
  - **Diagnostic Telemetry**: Automatic, anonymized capture of client metadata (Browser, OS, Screen Resolution, Active Theme, Room ID) to speed up bug reproduction.

### 1.3 Backend & Delivery Architecture
- **API Route**: `POST /api/feedback`
  - Input validation and sanitization.
  - Rate limiting (max 3 submissions per IP per 15 minutes) + hidden honeypot field against bots.
- **Dispatch Channels**:
  - **Discord / Slack Webhooks**: Instant rich embed message posted to a private developer channel.
  - **Email Alerts**: Sent via Resend or Nodemailer for high-priority bug reports.
  - **Database Persistence**: Stored in a lightweight Supabase / PostgreSQL table (`feedback_logs`):
    ```sql
    CREATE TABLE feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      rating INT,
      category TEXT,
      message TEXT NOT NULL,
      email TEXT,
      metadata JSONB,
      status TEXT DEFAULT 'new' -- 'new', 'in_progress', 'resolved'
    );
    ```

---

## 2. Additional Future Roadmap Items

### 2.1 End-to-End Encryption (E2EE) Mode
- Optional zero-knowledge client-side encryption using the **Web Crypto API (AES-GCM-256)**.
- Encryption key stored strictly in the URL hash (`#key=...`), never reaching the server or database.

### 2.2 Flexible Room Expiration Timers
- Allow room creators to configure custom self-destruct windows:
  - `5 minutes` (ultra-ephemeral sensitive exchanges)
  - `20 minutes` (default)
  - `1 hour` / `2 hours` (longer meeting sessions)

### 2.3 Progressive Web App (PWA) & Native Share Target
- Enable **Install to Home Screen** on Android and iOS.
- Implement **Web Share Target API**: drop photos and files directly into a Filewhile room from the mobile phone's native system Share menu.

### 2.4 Quick Voice Memos & Audio Drops
- In-browser microphone recording for quick 30-second voice notes that sync across peers alongside text notes and files.

### 2.5 Live Google AdSense Activation
- Seamless transition from placeholder ad slots to live Google AdSense ad units (`ca-pub-xxx`) once account approval is received, maintaining zero layout shift and non-intrusive user experience.
