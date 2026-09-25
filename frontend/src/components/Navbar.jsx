import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  QrCode,
  Users,
  Clock,
  HardDrive,
  ArrowLeft,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { formatBytes, formatTimeRemaining } from '../utils/formatters';
import { useToast } from './Toast';

export function Navbar({
  roomId,
  peersCount = 1,
  totalBytes = 0,
  maxBytes = 65 * 1024 * 1024,
  expiresAt = null,
  onOpenQr,
  onNavigateHome
}) {
  const [copied, setCopied] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const { addToast } = useToast();

  // Tick countdown timer every second
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const diff = Math.max(0, expiresAt - Date.now());
      setRemainingMs(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      addToast('Room link copied! Anyone with this link can join.', 'success');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      addToast('Failed to copy room link', 'error');
    }
  };

  const percentUsed = Math.min(100, Number(((totalBytes / maxBytes) * 100).toFixed(1)));
  const isStorageWarning = percentUsed > 75;
  const isStorageCritical = percentUsed > 90;
  const isExpiringSoon = remainingMs > 0 && remainingMs < 5 * 60 * 1000; // < 5 min remaining

  return (
    <header className="app-navbar glass-panel">
      {/* Brand & Room Breadcrumb */}
      <div className="navbar-left">
        <button
          className="brand-link"
          onClick={onNavigateHome}
          title="Back to Filewhile Home"
        >
          <div className="brand-logo-icon">
            <Sparkles size={18} className="logo-sparkle" />
          </div>
          <span className="brand-title">Filewhile</span>
        </button>

        {roomId && (
          <div className="room-badge-wrap">
            <span className="room-divider">/</span>
            <div className="room-pill">
              <span className="room-pill-name">{roomId}</span>
              <button
                className="room-copy-btn"
                onClick={handleCopyLink}
                title="Copy shareable room link"
                aria-label="Copy shareable link"
              >
                {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Stats & Badges */}
      {roomId && (
        <div className="navbar-right">
          {/* Storage Quota Meter */}
          <div
            className={`stat-pill storage-pill ${isStorageCritical ? 'is-critical' : isStorageWarning ? 'is-warning' : ''}`}
            title={`Room capacity: ${formatBytes(totalBytes)} of ${formatBytes(maxBytes)} used`}
          >
            <HardDrive size={14} className="stat-icon" />
            <div className="storage-text-wrap">
              <span className="stat-val">{formatBytes(totalBytes)}</span>
              <span className="stat-max">/ {formatBytes(maxBytes)}</span>
            </div>
            <div className="storage-mini-bar">
              <div
                className="storage-mini-fill"
                style={{ width: `${Math.max(3, percentUsed)}%` }}
              />
            </div>
          </div>

          {/* Room Expiry Countdown */}
          <div
            className={`stat-pill expiry-pill ${isExpiringSoon ? 'is-urgent' : ''}`}
            title="Auto-expires when timer hits zero"
          >
            <Clock size={14} className="stat-icon" />
            <span className="stat-label">Expires:</span>
            <span className="stat-val stat-mono">{formatTimeRemaining(remainingMs)}</span>
          </div>

          {/* Active Connected Peers */}
          <div className="stat-pill peers-pill" title={`${peersCount} device(s) currently connected to this room`}>
            <span className="peer-pulse-dot" />
            <Users size={14} className="stat-icon" />
            <span className="stat-val">{peersCount} {peersCount === 1 ? 'peer' : 'peers'}</span>
          </div>

          {/* QR Code Action */}
          <button
            className="btn btn-secondary btn-icon-label"
            onClick={onOpenQr}
            title="Scan QR Code to open on mobile"
          >
            <QrCode size={15} />
            <span className="btn-label-desktop">Mobile Sync</span>
          </button>
        </div>
      )}
    </header>
  );
}
