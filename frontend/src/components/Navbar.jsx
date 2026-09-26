import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  QrCode,
  Users,
  Clock,
  HardDrive,
  ArrowLeft,
  FileDown,
  ShieldCheck
} from 'lucide-react';
import { formatBytes, formatTimeRemaining } from '../utils/formatters';
import { useToast } from './Toast';

export function Navbar({
  roomId,
  peersCount = 1,
  totalBytes = 0,
  maxBytes = 65 * 1024 * 1024,
  onOpenQr,
  onNavigateHome,
  theme = 'light',
  onToggleTheme
}) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="logo-filedown">
              <defs>
                <linearGradient id="navbarPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#navbarPurpleGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" stroke="url(#navbarPurpleGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="18" x2="12" y2="12" stroke="url(#navbarPurpleGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="9 15 12 18 15 15" stroke="url(#navbarPurpleGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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

      {/* Center: Interactive Ceiling Lamp Theme Switcher */}
      {onToggleTheme && (
        <div className="navbar-center">
          <button
            className={`header-lamp-switch ${theme === 'light' ? 'is-on' : 'is-off'}`}
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Click lamp to turn ON the lights (Light Mode)' : 'Click lamp to turn OFF the lights (Dark Mode)'}
            aria-label="Toggle ceiling lamp lights"
          >
            <div className="lamp-fixture">
              <div className="lamp-mount" />
              <div className="lamp-shade" />
              <div className="lamp-bulb" />
            </div>
          </button>
        </div>
      )}

      {/* Actions & Room Stats */}
      <div className="navbar-right">
        {roomId && (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}
