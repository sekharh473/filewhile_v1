import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste
} from 'lucide-react';
import { formatBytes, formatRelativeTime } from '../utils/formatters';
import { useToast } from './Toast';

export function ImagesBox({
  images = [],
  onUploadFiles,
  onDeleteFile,
  roomId,
  isMaximized = false,
  onToggleMaximize,
  isUploading = false
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copiedImgId, setCopiedImgId] = useState(null);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  // Global Clipboard Paste (Ctrl+V) listener for screenshots
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedImageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            // Generate friendly filename if none exists
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const renamed = new File([file], `screenshot-${timestamp}.png`, { type: file.type });
            pastedImageFiles.push(renamed);
          }
        }
      }

      if (pastedImageFiles.length > 0) {
        e.preventDefault();
        onUploadFiles(pastedImageFiles);
        addToast(`Pasted ${pastedImageFiles.length} screenshot(s) from clipboard!`, 'success');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onUploadFiles, addToast]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        nextLightbox();
      } else if (e.key === 'ArrowLeft') {
        prevLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, images.length]);

  const closeLightbox = () => {
    setLightboxIndex(null);
    setZoomLevel(1);
  };

  const nextLightbox = () => {
    if (lightboxIndex !== null && images.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
      setZoomLevel(1);
    }
  };

  const prevLightbox = () => {
    if (lightboxIndex !== null && images.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
      setZoomLevel(1);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const validateAndUpload = (fileList) => {
    const MAX_BYTES = 65 * 1024 * 1024;
    const validImages = [];

    for (const file of fileList) {
      if (file.size > MAX_BYTES) {
        addToast(`"${file.name}" exceeds the 65 MB room limit (${formatBytes(file.size)}). Please choose a smaller photo.`, 'error', 5500);
        continue;
      }
      if (file.size === 0) {
        addToast(`"${file.name}" is an empty file (0 bytes).`, 'error', 4000);
        continue;
      }
      validImages.push(file);
    }

    if (validImages.length > 0) {
      onUploadFiles(validImages);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      validateAndUpload(droppedFiles);
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      validateAndUpload(selected);
    }
    e.target.value = '';
  };

  const handleCopyLink = async (img, e) => {
    e?.stopPropagation();
    const url = `${window.location.origin}/api/room/${roomId}/download/${img.id}?view=inline`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedImgId(img.id);
      addToast('Image direct link copied!', 'success');
      setTimeout(() => setCopiedImgId(null), 2000);
    } catch {
      addToast('Failed to copy image link', 'error');
    }
  };

  const activeLightboxImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <section
      className={`pane-container box-images glass-card ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Pane Header */}
      <div className="pane-header">
        <div className="pane-title-group">
          <div className="pane-icon-badge image-accent">
            <ImageIcon size={16} />
          </div>
          <div>
            <h2 className="pane-heading">Image Gallery & Screenshots</h2>
            <span className="pane-subheading">{images.length} {images.length === 1 ? 'image' : 'images'} · Ctrl+V to paste</span>
          </div>
        </div>

        <div className="pane-actions-group">
          {/* Clipboard tip pill */}
          <div className="paste-tip-badge" title="Press Ctrl+V anywhere on this page to upload screenshots directly">
            <ClipboardPaste size={13} />
            <span>Paste (Ctrl+V)</span>
          </div>

          {/* Upload Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload images"
          >
            <Upload size={14} />
            <span>Upload</span>
          </button>

          {/* Maximize Toggle */}
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => onToggleMaximize('images')}
            title={isMaximized ? 'Restore Split View' : 'Maximize Gallery'}
            aria-label="Maximize Gallery"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Gallery Body */}
      <div className="pane-body custom-scrollbar">
        {images.length === 0 ? (
          <div
            className="empty-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-icon-ring ring-images">
              <ImageIcon size={24} className="dropzone-icon text-cyan" />
            </div>
            <h3 className="dropzone-title">Drop images or paste screenshots</h3>
            <p className="dropzone-desc">
              PNG, JPG, SVG, WebP, GIF. Press <strong>Ctrl+V</strong> to paste from clipboard anytime.
            </p>
            <button className="btn btn-secondary btn-sm mt-2">
              Browse Photos
            </button>
          </div>
        ) : (
          <div className="images-grid">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="image-card"
                onClick={() => setLightboxIndex(idx)}
              >
                <div className="image-thumb-wrapper">
                  <img
                    src={`/api/room/${roomId}/download/${img.id}?view=inline`}
                    alt={img.filename}
                    loading="lazy"
                    className="image-thumb"
                  />
                  {/* Hover Overlay */}
                  <div className="image-hover-overlay">
                    <div className="image-hover-actions">
                      <button
                        className="btn btn-glass btn-icon-sm"
                        onClick={(e) => handleCopyLink(img, e)}
                        title="Copy direct link"
                        aria-label="Copy direct link"
                      >
                        {copiedImgId === img.id ? (
                          <Check size={13} className="text-success" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>

                      <a
                        href={`/api/room/${roomId}/download/${img.id}`}
                        download={img.filename}
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-glass btn-icon-sm"
                        title="Download image"
                        aria-label="Download image"
                      >
                        <Download size={13} />
                      </a>

                      <button
                        className="btn btn-glass btn-icon-sm text-danger-hover"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(img.id);
                        }}
                        title="Delete image"
                        aria-label="Delete image"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="image-hover-name">
                      <span>{img.filename}</span>
                    </div>
                  </div>
                </div>

                <div className="image-card-footer">
                  <span className="img-title" title={img.filename}>{img.filename}</span>
                  <span className="img-size">{formatBytes(img.size)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Lightbox Modal */}
      {activeLightboxImage && (
        <div className="lightbox-backdrop" onClick={closeLightbox} role="dialog" aria-modal="true">
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            {/* Lightbox Topbar */}
            <div className="lightbox-topbar">
              <div className="lightbox-meta">
                <span className="lightbox-filename">{activeLightboxImage.filename}</span>
                <span className="lightbox-stats">
                  {formatBytes(activeLightboxImage.size)} · {lightboxIndex + 1} of {images.length}
                </span>
              </div>

              <div className="lightbox-controls">
                <button
                  className="btn btn-glass btn-icon-sm"
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                  title="Zoom In (+)"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  className="btn btn-glass btn-icon-sm"
                  onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                  title="Zoom Out (-)"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  className="btn btn-glass btn-icon-sm"
                  onClick={() => setZoomLevel(1)}
                  title="Reset Zoom (1:1)"
                >
                  <RotateCcw size={15} />
                </button>
                <a
                  href={`/api/room/${roomId}/download/${activeLightboxImage.id}`}
                  download={activeLightboxImage.filename}
                  className="btn btn-glass btn-icon-sm"
                  title="Download Image"
                >
                  <Download size={15} />
                </a>
                <button
                  className="btn btn-glass btn-icon-sm"
                  onClick={closeLightbox}
                  title="Close (Esc)"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Lightbox Stage */}
            <div className="lightbox-stage">
              {images.length > 1 && (
                <button
                  className="lightbox-nav-arrow left"
                  onClick={prevLightbox}
                  title="Previous image (Left Arrow)"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              <div className="lightbox-img-wrap">
                <img
                  src={`/api/room/${roomId}/download/${activeLightboxImage.id}?view=inline`}
                  alt={activeLightboxImage.filename}
                  className="lightbox-img"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </div>

              {images.length > 1 && (
                <button
                  className="lightbox-nav-arrow right"
                  onClick={nextLightbox}
                  title="Next image (Right Arrow)"
                  aria-label="Next image"
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
