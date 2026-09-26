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
  CheckCheck,
  Code2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  ListOrdered,
  List,
  TextQuote,
  Undo2,
  Redo2
} from 'lucide-react';
import { marked } from 'marked';
import { getWordAndCharCount } from '../utils/formatters';
import { useToast } from './Toast';
import { formatCodeSnippet } from '../utils/codeFormatter';

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
  const [isFormatting, setIsFormatting] = useState(false);
  const [activeFormatMode, setActiveFormatMode] = useState(null); // 'selection' | 'page' | null
  
  // Custom Undo/Redo History
  const [history, setHistory] = useState([text]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const { addToast } = useToast();

  // Debounce user typing into history
  useEffect(() => {
    if (text !== history[historyIndex]) {
      const timer = setTimeout(() => {
        setHistory(prev => {
          if (prev[historyIndex] === text) return prev;
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(text);
          if (newHistory.length > 50) newHistory.shift();
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [text, historyIndex]);

  const saveToHistory = (newText) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newText);
      if (newHistory.length > 50) newHistory.shift();
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
    onChangeText(newText);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChangeText(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChangeText(history[newIndex]);
    }
  };

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
    saveToHistory(transformed);
    addToast(`Transformed to ${type}case`, 'info');
    setShowToolsMenu(false);
  };

  const handleClear = () => {
    saveToHistory('');
    setShowClearConfirm(false);
    setShowToolsMenu(false);
    addToast('Notepad cleared', 'info');
  };

  const handleFormatText = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = start !== end;
    const selected = hasSelection ? text.substring(start, end) : '';

    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = hasSelection ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = hasSelection ? replacement.length : 1;
        break;
      case 'underline':
        replacement = `<u>${selected || 'underlined text'}</u>`;
        cursorOffset = hasSelection ? replacement.length : 3;
        break;
      case 'strike':
        replacement = `~~${selected || 'strikethrough text'}~~`;
        cursorOffset = hasSelection ? replacement.length : 2;
        break;
      case 'link':
        replacement = `[${selected || 'link title'}](https://)`;
        cursorOffset = hasSelection ? replacement.length - 1 : 1;
        break;
      case 'ordered-list': {
        if (!hasSelection) {
          replacement = '1. ';
          cursorOffset = 3;
        } else {
          const lines = selected.split('\n');
          const allNumbered = lines.every(l => /^\d+\.\s/.test(l));
          if (allNumbered) {
            replacement = lines.map(l => l.replace(/^\d+\.\s*/, '')).join('\n');
          } else {
            replacement = lines.map((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s*/, '')}`).join('\n');
          }
          cursorOffset = replacement.length;
        }
        break;
      }
      case 'bullet-list': {
        if (!hasSelection) {
          replacement = '- ';
          cursorOffset = 2;
        } else {
          const lines = selected.split('\n');
          const allBulleted = lines.every(l => /^[-*]\s/.test(l));
          if (allBulleted) {
            replacement = lines.map(l => l.replace(/^[-*]\s*/, '')).join('\n');
          } else {
            replacement = lines.map(l => `- ${l.replace(/^[-*]\s*/, '')}`).join('\n');
          }
          cursorOffset = replacement.length;
        }
        break;
      }
      case 'quote': {
        if (!hasSelection) {
          replacement = '> ';
          cursorOffset = 2;
        } else {
          const lines = selected.split('\n');
          const allQuoted = lines.every(l => /^>\s/.test(l));
          if (allQuoted) {
            replacement = lines.map(l => l.replace(/^>\s*/, '')).join('\n');
          } else {
            replacement = lines.map(l => `> ${l.replace(/^>\s*/, '')}`).join('\n');
          }
          cursorOffset = replacement.length;
        }
        break;
      }
      default:
        return;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    saveToHistory(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 20);
  };

  // 1. Format selected code snippet
  const handleFormatSelectedCode = async (forcedLang = 'auto') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = start !== end;

    if (!hasSelection) {
      addToast('Please highlight the code snippet you want to format', 'info');
      return;
    }

    const selectedSnippet = text.substring(start, end);
    setIsFormatting(true);
    setActiveFormatMode('selection');

    try {
      const result = await formatCodeSnippet(selectedSnippet, forcedLang);
      if (result.success) {
        const newText = text.substring(0, start) + result.formatted + text.substring(end);
        saveToHistory(newText);
        addToast(`Formatted selection (${result.detected})`, 'success');
        setTimeout(() => {
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(start, start + result.formatted.length);
          }
        }, 30);
      } else {
        addToast(`Format failed: ${result.error || 'Syntax error'}`, 'error');
      }
    } finally {
      setIsFormatting(false);
      setTimeout(() => setActiveFormatMode(null), 2500);
    }
  };

  // 2. Format whole document/page
  const handleFormatWholePage = async (forcedLang = 'auto') => {
    if (!text || !text.trim()) {
      addToast('Text notepad is empty, nothing to format', 'info');
      return;
    }

    setIsFormatting(true);
    setActiveFormatMode('page');

    try {
      const result = await formatCodeSnippet(text, forcedLang);
      if (result.success) {
        saveToHistory(result.formatted);
        addToast(`Formatted whole document (${result.detected})`, 'success');
      } else {
        addToast(`Format failed: ${result.error || 'Syntax error'}`, 'error');
      }
    } finally {
      setIsFormatting(false);
      setTimeout(() => setActiveFormatMode(null), 2500);
    }
  };

  const handleKeyDown = (e) => {
    // Formatting shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      handleFormatText('bold');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      handleFormatText('italic');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      handleFormatText('underline');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleFormatText('link');
      return;
    }

    // Shift + Alt + F or Alt + Shift + F: Prettier shortcut
    if (e.shiftKey && e.altKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
        handleFormatSelectedCode('auto');
      } else {
        handleFormatWholePage('auto');
      }
      return;
    }

    // Tab key: insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '  ';

      const updated = text.substring(0, start) + spaces + text.substring(end);
      saveToHistory(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }
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

          {/* Prettier Code Formatter */}
          <button
            className={`btn btn-secondary btn-icon ${isFormatting ? 'is-active' : ''}`}
            onClick={() => {
              const textarea = textareaRef.current;
              if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
                handleFormatSelectedCode('auto');
              } else {
                handleFormatWholePage('auto');
              }
            }}
            title="Format Code (Prettier · Shift+Alt+F)"
            aria-label="Format Code with Prettier"
            disabled={isFormatting}
          >
            <Code2 size={14} />
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
                <div className="menu-group-label">Code Formatter (Prettier)</div>
                <button className="menu-item" onClick={() => handleFormatWholePage('auto')}>
                  <Code2 size={13} />
                  <span>Format Whole Document (Shift+Alt+F)</span>
                </button>
                <button className="menu-item" onClick={() => handleFormatSelectedCode('auto')}>
                  <Code2 size={13} />
                  <span>Format Selected Text</span>
                </button>
                <button className="menu-item" onClick={() => handleFormatWholePage('json')}>
                  <Code2 size={13} />
                  <span>Format JSON</span>
                </button>
                <button className="menu-item" onClick={() => handleFormatWholePage('javascript')}>
                  <Code2 size={13} />
                  <span>Format JavaScript / TS</span>
                </button>
                <button className="menu-item" onClick={() => handleFormatWholePage('html')}>
                  <Code2 size={13} />
                  <span>Format HTML</span>
                </button>
                <button className="menu-item" onClick={() => handleFormatWholePage('css')}>
                  <Code2 size={13} />
                  <span>Format CSS</span>
                </button>
                <button className="menu-item" onClick={() => handleFormatWholePage('markdown')}>
                  <Code2 size={13} />
                  <span>Format Markdown</span>
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
        {/* Text & Code Formatting Toolbar */}
        {!isPreview && (
          <div className="editor-formatting-toolbar" role="toolbar" aria-label="Editor Formatting Toolbar">
            <button
              type="button"
              className="fmt-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              className="fmt-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 size={15} />
            </button>
            <span className="fmt-sep" />
            <button
              type="button"
              className="fmt-btn"
              onClick={() => handleFormatText('bold')}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              className="fmt-btn"
              onClick={() => handleFormatText('italic')}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              className="fmt-btn"
              onClick={() => handleFormatText('underline')}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
            >
              <Underline size={15} />
            </button>
            <button
              type="button"
              className="fmt-btn"
              onClick={() => handleFormatText('strike')}
              title="Strikethrough"
              aria-label="Strikethrough"
            >
              <Strikethrough size={15} />
            </button>

            <span className="fmt-sep" />

            <button
              type="button"
              className="fmt-btn"
              onClick={() => handleFormatText('link')}
              title="Insert Link (Ctrl+K)"
              aria-label="Insert Link"
            >
              <LinkIcon size={15} />
            </button>
            <button
              type="button"
              className="fmt-btn"
              onClick={() => handleFormatText('ordered-list')}
              title="Numbered List"
              aria-label="Numbered List"
            >
              <ListOrdered size={15} />
            </button>
            <button
              type="button"
              className="fmt-btn"
              onClick={() => handleFormatText('bullet-list')}
              title="Bullet List"
              aria-label="Bullet List"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              className="fmt-btn"
              onClick={() => handleFormatText('quote')}
              title="Blockquote"
              aria-label="Blockquote"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5v14" />
                <path d="M9 7h11" />
                <path d="M9 12h11" />
                <path d="M9 17h11" />
              </svg>
            </button>

            <span className="fmt-sep" />

            {/* Format Selection Code Button */}
            <button
              type="button"
              className={`fmt-btn fmt-code-btn ${activeFormatMode === 'selection' ? 'is-active' : ''}`}
              onClick={() => handleFormatSelectedCode('auto')}
              title="Format Selection (Prettier · Highlight code & click)"
              aria-label="Format Selection"
              disabled={isFormatting}
            >
              <Code2 size={15} />
            </button>

            {/* Format Whole Page Code Button */}
            <button
              type="button"
              className={`fmt-btn fmt-code-btn ${activeFormatMode === 'page' ? 'is-active' : ''}`}
              onClick={() => handleFormatWholePage('auto')}
              title="Format Entire Page (Prettier · Shift+Alt+F)"
              aria-label="Format Entire Page"
              disabled={isFormatting}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
                <path d="m8.5 10.5-1.5 1.5 1.5 1.5" />
                <path d="m11 9.5 1.5 5" />
                <path d="m13.5 10.5 1.5 1.5-1.5 1.5" />
              </svg>
            </button>
          </div>
        )}

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
            onKeyDown={handleKeyDown}
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
