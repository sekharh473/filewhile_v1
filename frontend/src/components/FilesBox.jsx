import React, { useState, useRef } from 'react';
import {
  FolderArchive,
  Upload,
  Download,
  Trash2,
  Copy,
  Check,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileArchive,
  Search,
  Maximize2,
  Minimize2,
  HardDriveDownload,
  AlertCircle
} from 'lucide-react';
import { formatBytes, formatRelativeTime } from '../utils/formatters';
import { useToast } from './Toast';

/**
 * Return an appropriate icon based on filename extension
 */
function getFileIcon(filename = '') {
  const ext = filename.split('.').pop().toLowerCase();
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive size={16} className="ext-icon zip" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet size={16} className="ext-icon sheet" />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText size={16} className="ext-icon pdf" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp', 'sql'].includes(ext)) {
    return <FileCode size={16} className="ext-icon code" />;
  }
  return <File size={16} className="ext-icon default" />;
}

export function FilesBox({
  files = [],
  onUploadFiles,
  onDeleteFile,
  roomId,
  isMaximized = false,
  onToggleMaximize,
  isUploading = false
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFileId, setCopiedFileId] = useState(null);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

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
    const validFiles = [];

    for (const file of fileList) {
      if (file.size > MAX_BYTES) {
        addToast(`"${file.name}" exceeds the 65 MB room limit (${formatBytes(file.size)}). Please choose a smaller file.`, 'error', 5500);
        continue;
      }
      if (file.size === 0) {
        addToast(`"${file.name}" is an empty file (0 bytes).`, 'error', 4000);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onUploadFiles(validFiles);
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
    e.target.value = ''; // Reset input
  };

  const handleCopyFileLink = async (file) => {
    const downloadUrl = `${window.location.origin}/api/room/${roomId}/download/${file.id}`;
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopiedFileId(file.id);
      addToast(`Direct download link for "${file.filename}" copied!`, 'success');
      setTimeout(() => setCopiedFileId(null), 2000);
    } catch {
      addToast('Failed to copy file link', 'error');
    }
  };

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <section
      className={`pane-container box-files glass-card ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Pane Header */}
      <div className="pane-header">
        <div className="pane-title-group">
          <div className="pane-icon-badge file-accent">
            <FolderArchive size={16} />
          </div>
          <div>
            <h2 className="pane-heading">Documents & Files</h2>
            <span className="pane-subheading">{files.length} {files.length === 1 ? 'file' : 'files'} shared</span>
          </div>
        </div>

        <div className="pane-actions-group">
          {/* Download All as ZIP */}
          {files.length > 0 && (
            <a
              href={`/api/room/${roomId}/download-zip`}
              download
              className="btn btn-secondary btn-sm"
              title="Download all room files in a single .zip"
            >
              <HardDriveDownload size={14} />
              <span className="btn-label-desktop">Download ZIP</span>
            </a>
          )}

          {/* Upload Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload files"
          >
            <Upload size={14} />
            <span>Upload</span>
          </button>

          {/* Maximize Toggle */}
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => onToggleMaximize('files')}
            title={isMaximized ? 'Restore Split View' : 'Maximize Files'}
            aria-label="Maximize Files"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Search Bar if > 3 files */}
      {files.length > 3 && (
        <div className="pane-search-bar">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search uploaded files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Pane Body / Files List */}
      <div className="pane-body custom-scrollbar">
        {isUploading && (
          <div className="upload-progress-banner">
            <div className="spinner-border" />
            <span>Uploading file(s) to room...</span>
          </div>
        )}

        {files.length === 0 ? (
          <div
            className="empty-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-icon-ring">
              <Upload size={24} className="dropzone-icon" />
            </div>
            <h3 className="dropzone-title">Drop documents or archives here</h3>
            <p className="dropzone-desc">
              PDFs, DOCX, XLSX, ZIP, presentation slides, or code files.
            </p>
            <button className="btn btn-secondary btn-sm mt-2">
              Browse Files from Computer
            </button>
          </div>
        ) : (
          <div className="files-list">
            {filteredFiles.map((file) => (
              <div key={file.id} className="file-item-card glass-panel-hover">
                <div className="file-info-left">
                  <div className="file-type-icon-wrapper">
                    {getFileIcon(file.filename)}
                  </div>
                  <div className="file-meta">
                    <span className="file-name" title={file.filename}>
                      {file.filename}
                    </span>
                    <div className="file-submeta">
                      <span className="file-size-badge">{formatBytes(file.size)}</span>
                      <span className="file-time-badge">{formatRelativeTime(file.uploadedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="file-actions-right">
                  {/* Copy Link */}
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => handleCopyFileLink(file)}
                    title="Copy direct download link"
                    aria-label="Copy direct download link"
                  >
                    {copiedFileId === file.id ? (
                      <Check size={14} className="text-success" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>

                  {/* Direct Download */}
                  <a
                    href={`/api/room/${roomId}/download/${file.id}`}
                    download={file.filename}
                    className="btn btn-ghost btn-icon"
                    title="Download file"
                    aria-label="Download file"
                  >
                    <Download size={14} />
                  </a>

                  {/* Delete File */}
                  <button
                    className="btn btn-ghost btn-icon text-danger-hover"
                    onClick={() => onDeleteFile(file.id)}
                    title="Delete file"
                    aria-label="Delete file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {filteredFiles.length === 0 && files.length > 0 && (
              <div className="empty-search-state">
                <AlertCircle size={20} className="text-muted" />
                <p>No files match "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
