import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone, ExternalLink } from 'lucide-react';
import { useToast } from './Toast';

export function QrModal({ isOpen, onClose, roomUrl, roomId }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = React.useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && canvasRef.current && roomUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        roomUrl,
        {
          width: 230,
          margin: 2,
          color: {
            dark: '#0a0d14',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [isOpen, roomUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      addToast('Room link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy link', 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-badge-icon">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="modal-title">Connect Phone / Device</h3>
              <p className="modal-subtitle">Scan this code to instantly open room <strong>/{roomId}</strong></p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="qr-body">
          <div className="qr-canvas-wrapper">
            <canvas ref={canvasRef} className="qr-canvas" />
          </div>

          <div className="qr-url-box">
            <span className="qr-url-text" title={roomUrl}>{roomUrl}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <p className="qr-hint">
            Take photos or upload mobile documents - they will appear on this desktop screen immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
