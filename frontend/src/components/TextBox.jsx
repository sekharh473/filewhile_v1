import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  Trash2,
  FileText,
  Eye,
  Edit3,
  CaseSensitive,
  Maximize2,
  Minimize2,
  MoreVertical,
  Type,
  CheckCheck
} from 'lucide-react';
import { marked } from 'marked';
import { getWordAndCharCount } from '../utils/formatters';
import { useToast } from './Toast';

// Configure marked for clean, safe rendering
marked.setOptions({
  gfm: true,
  breaks: true
});

export function TextBox({
  text,
  onChangeText,
  syncStatus = 'synced', // 'synced' | 'saving' | 'remote'
  isMaximized = false,
  onToggleMaximize,
  roomId
}) {
  const [copied, setCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const { addToast } = useToast();

  const { words, chars, lines } = useMemo(() => getWordAndCharCount(text), [text]);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    if (!text) {
      addToast('Text notepad is empty', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      addToast('Copied notes to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy text', 'error');
    }
  };

  const handleDownload = (format = 'txt') => {
    if (!text) {
      addToast('Nothing to download', 'info');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-${roomId || 'filewhile'}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`Downloaded as .${format}`, 'success');
    setShowToolsMenu(false);
  };

  const handleTransformCase = (type) => {
    if (!text) return;
    let transformed = text;
    if (type === 'upper') {
      transformed = text.toUpperCase();
    } else if (type === 'lower') {
      transformed = text.toLowerCase();
    } else if (type === 'title') {
      transformed = text.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    }
    onChangeText(transformed);
    addToast(`Transformed to ${type}case`, 'info');
    setShowToolsMenu(false);
  };

  const handleClear = () => {
    onChangeText('');
    setShowClearConfirm(false);
    setShowToolsMenu(false);
    addToast('Notepad cleared', 'info');
  };

  // Render markdown safely
  const renderedMarkdown = useMemo(() => {
    if (!text) return '<p class="empty-preview">No content yet. Switch to Editor to write notes or markdown.</p>';
    try {
      return marked.parse(text);
    } catch {
      return '<p class="error-preview">Error rendering Markdown preview.</p>';
    }
  }, [text]);

  return (
    <section className="pane-container box-texts glass-card">
      {/* Pane Header / Corner Toolbar */}
      <div className="pane-header">
        <div className="pane-title-group">
          <div className="pane-icon-badge text-accent">
            <FileText size={16} />
          </div>
          <div>
            <h2 className="pane-heading">Shared Notes & Text</h2>
            <span className="pane-subheading">Instant live sync across peers</span>
          </div>
        </div>

        {/* Floating Toolbar in Corner */}
        <div className="pane-actions-group">
          {/* Status Indicator */}
          <div className="text-sync-indicator" title={syncStatus === 'saving' ? 'Broadcasting...' : syncStatus === 'remote' ? 'Syncing peer update...' : 'All changes saved'}>
            <span className={`sync-dot ${syncStatus}`} />
            <span className="sync-label">
              {syncStatus === 'saving' ? 'Saving...' : syncStatus === 'remote' ? 'Peer typing...' : 'Live'}
            </span>
          </div>

          {/* Word / Char Count */}
          <div className="stat-counter-pill" title={`${chars} characters, ${words} words, ${lines} lines`}>
            <span>{words}w</span>
            <span className="counter-sep">·</span>
            <span>{chars}c</span>
          </div>

          {/* Quick Copy */}
          <button
            className={`btn btn-secondary btn-icon ${copied ? 'is-active' : ''}`}
            onClick={handleCopy}
            title="Copy all text"
            aria-label="Copy all text"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          </button>

          {/* Markdown Toggle */}
          <button
            className={`btn btn-secondary btn-icon ${isPreview ? 'is-active' : ''}`}
            onClick={() => setIsPreview(!isPreview)}
            title={isPreview ? 'Switch to Raw Editor' : 'Toggle Markdown Preview'}
            aria-label="Toggle Markdown Preview"
          >
            {isPreview ? <Edit3 size={14} /> : <Eye size={14} />}
          </button>

          {/* Maximize Toggle */}
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => onToggleMaximize('text')}
            title={isMaximized ? 'Restore Split View' : 'Maximize Notes'}
            aria-label="Maximize Notes"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Tools Dropdown Menu */}
          <div className="menu-dropdown-wrapper" ref={menuRef}>
            <button
              className={`btn btn-secondary btn-icon ${showToolsMenu ? 'is-active' : ''}`}
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              title="More Text Tools"
              aria-label="More Text Tools"
            >
              <MoreVertical size={14} />
            </button>

            {showToolsMenu && (
              <div className="menu-dropdown-pane glass-panel">
                <div className="menu-group-label">Export & Download</div>
                <button className="menu-item" onClick={() => handleDownload('txt')}>
                  <Download size={13} />
                  <span>Download as .txt</span>
                </button>
                <button className="menu-item" onClick={() => handleDownload('md')}>
                  <Download size={13} />
                  <span>Download as .md</span>
                </button>

                <div className="menu-divider" />
                <div className="menu-group-label">Case Converters</div>
                <button className="menu-item" onClick={() => handleTransformCase('upper')}>
                  <CaseSensitive size={13} />
                  <span>UPPERCASE</span>
                </button>
                <button className="menu-item" onClick={() => handleTransformCase('lower')}>
                  <Type size={13} />
                  <span>lowercase</span>
                </button>
                <button className="menu-item" onClick={() => handleTransformCase('title')}>
                  <CaseSensitive size={13} />
                  <span>Title Case</span>
                </button>

                <div className="menu-divider" />
                <button
                  className="menu-item text-danger"
                  onClick={() => setShowClearConfirm(true)}
                >
                  <Trash2 size={13} />
                  <span>Clear All Notes</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pane Content Area */}
      <div className="pane-body">
        {isPreview ? (
          <div
            className="markdown-preview-scrollable custom-scrollbar"
            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="shared-textarea custom-scrollbar"
            placeholder="Type or paste notes, code snippets, memos, instructions, meeting summaries... Everything typed here updates across all open tabs and devices instantly."
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            spellCheck="false"
          />
        )}
      </div>

      {/* Clear Confirmation Modal / Popover */}
      {showClearConfirm && (
        <div className="modal-backdrop-subtle" onClick={() => setShowClearConfirm(false)}>
          <div className="confirm-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <h4>Clear notepad?</h4>
            <p>This will erase all notes in this room for everyone currently connected.</p>
            <div className="confirm-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleClear}
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
