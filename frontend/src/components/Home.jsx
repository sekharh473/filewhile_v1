import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Shuffle,
  Clock,
  History,
  Trash2,
  ShieldCheck,
  Zap,
  Layers,
  FileText,
  FolderArchive,
  Image as ImageIcon,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { generateRandomRoomSlug } from '../utils/words';
import { getRecentRooms, removeRecentRoom } from '../utils/storage';
import { formatRelativeTime } from '../utils/formatters';

export function Home({ onJoinRoom }) {
  const [customRoom, setCustomRoom] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setRecentRooms(getRecentRooms());
  }, []);

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const cleaned = customRoom.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleaned) {
      setErrorMsg('Please enter a room name');
      return;
    }
    setErrorMsg('');
    onJoinRoom(cleaned);
  };

  const handleRandomRoom = () => {
    const randomSlug = generateRandomRoomSlug();
    onJoinRoom(randomSlug);
  };

  const handleRemoveRecent = (e, roomId) => {
    e.stopPropagation();
    const updated = removeRecentRoom(roomId);
    setRecentRooms(updated);
  };

  return (
    <div className="home-container">
      {/* Background Ambient Glows */}
      <div className="ambient-glow glow-top-left" />
      <div className="ambient-glow glow-bottom-right" />

      {/* Hero Section */}
      <header className="home-hero">
        <div className="hero-badge">
          <Sparkles size={14} className="badge-sparkle" />
          <span>Corporate & Team Temporary Workspace</span>
        </div>

        <h1 className="hero-title">
          Frictionless temporary sharing <br />
          <span className="gradient-text">with zero logins.</span>
        </h1>

        <p className="hero-description">
          Instantly transfer files, paste screenshots, and collaborate on shared notes between
          your desktop, mobile, and teammates. Auto-expires cleanly after 20 minutes.
        </p>

        {/* 2-Step Quick Start Card */}
        <div className="quickstart-card glass-card">
          <div className="quickstart-tabs">
            {/* Step 1: Custom Room Input */}
            <div className="quickstart-section">
              <label className="section-label">
                <span className="step-num">1</span>
                <span>Enter a Custom Room Name</span>
              </label>

              <form onSubmit={handleCustomSubmit} className="room-input-form">
                <div className="room-input-wrapper">
                  <span className="input-prefix">filewhile.com/</span>
                  <input
                    type="text"
                    className="room-name-input"
                    placeholder="deals-q3 or interview-notes"
                    value={customRoom}
                    onChange={(e) => {
                      setCustomRoom(e.target.value);
                      setErrorMsg('');
                    }}
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-join">
                  <span>Enter Room</span>
                  <ArrowRight size={16} />
                </button>
              </form>
              {errorMsg && <p className="input-error-msg">{errorMsg}</p>}
            </div>

            <div className="quickstart-divider">
              <span>OR</span>
            </div>

            {/* Step 2: Random Room Generator */}
            <div className="quickstart-section">
              <label className="section-label">
                <span className="step-num">2</span>
                <span>Create an Instant Random Room</span>
              </label>

              <button
                type="button"
                className="btn btn-secondary btn-random"
                onClick={handleRandomRoom}
              >
                <Shuffle size={16} />
                <span>Create Random Room</span>
              </button>
              <p className="random-hint">
                Generates a secure, human-readable slug like <code>swift-falcon-42</code>
              </p>
            </div>
          </div>
        </div>

        {/* Recent Rooms Pills */}
        {recentRooms.length > 0 && (
          <div className="recent-rooms-section">
            <div className="recent-rooms-header">
              <History size={14} className="text-muted" />
              <span>Recently Visited Rooms on this Browser:</span>
            </div>
            <div className="recent-pills-list">
              {recentRooms.map((r) => (
                <div
                  key={r.roomId}
                  className="recent-room-pill"
                  onClick={() => onJoinRoom(r.roomId)}
                  title={`Jump to /${r.roomId} (${formatRelativeTime(r.visitedAt)})`}
                >
                  <span className="pill-prefix">/</span>
                  <span className="pill-name">{r.roomId}</span>
                  <button
                    className="pill-remove-btn"
                    onClick={(e) => handleRemoveRecent(e, r.roomId)}
                    title="Remove from history"
                    aria-label="Remove from history"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Feature Highlights Grid */}
      <section className="features-grid">
        <div className="feature-card glass-panel">
          <div className="feature-icon-box text-accent">
            <Zap size={22} />
          </div>
          <h3 className="feature-title">Zero Friction & Zero Login</h3>
          <p className="feature-desc">
            No registration, passwords, or emails. Anyone with the URL can immediately view,
            drop files, or contribute notes.
          </p>
        </div>

        <div className="feature-card glass-panel">
          <div className="feature-icon-box text-cyan">
            <Layers size={22} />
          </div>
          <h3 className="feature-title">Triple Split Layout</h3>
          <p className="feature-desc">
            Box 1 for collaborative text notes, Box 2 for documents & archives, and Box 3
            for instant screenshot paste gallery.
          </p>
        </div>

        <div className="feature-card glass-panel">
          <div className="feature-icon-box text-emerald">
            <ShieldCheck size={22} />
          </div>
          <h3 className="feature-title">Auto-Expiring & Ephemeral</h3>
          <p className="feature-desc">
            All rooms automatically self-destruct after 20 minutes. File storage is purged from
            cloud and memory automatically.
          </p>
        </div>

        <div className="feature-card glass-panel">
          <div className="feature-icon-box text-amber">
            <HardDrive size={22} />
          </div>
          <h3 className="feature-title">Mobile Pairing & Zip Export</h3>
          <p className="feature-desc">
            Scan the on-screen QR code to drop mobile photos into your desktop, and download
            all files in one click as a ZIP.
          </p>
        </div>
      </section>

      {/* Target Audiences / Use Cases */}
      <section className="use-cases-strip glass-card">
        <h3 className="strip-heading">Built for High-Speed Corporate Workflows</h3>
        <div className="strip-grid">
          <div className="strip-item">
            <CheckCircle2 size={16} className="text-accent" />
            <span><strong>HR & Recruiters:</strong> Quick candidate resume drop without email clutter</span>
          </div>
          <div className="strip-item">
            <CheckCircle2 size={16} className="text-cyan" />
            <span><strong>Sales & BDEs:</strong> Share temporary pitch decks and one-pagers with clients</span>
          </div>
          <div className="strip-item">
            <CheckCircle2 size={16} className="text-emerald" />
            <span><strong>Devs & Ops:</strong> Fast cross-device snippet & server log exchange</span>
          </div>
          <div className="strip-item">
            <CheckCircle2 size={16} className="text-amber" />
            <span><strong>Accounts & Ops:</strong> Collect signed receipts and invoices for the afternoon</span>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>Filewhile - Fast, Temporary Sharing & Drop Space. Auto-purged after 20 minutes.</p>
      </footer>
    </div>
  );
}
