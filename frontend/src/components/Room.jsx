import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { TextBox } from './TextBox';
import { FilesBox } from './FilesBox';
import { ImagesBox } from './ImagesBox';
import { useLocalStorageLayout } from '../useLocalStorageLayout';

export function Room({ roomId, onUpdateRoomMeta }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    leftWidthPercent,
    topFilesHeightPercent,
    updateLeftWidth,
    updateTopFilesHeight
  } = useLocalStorageLayout();

  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);

  const socketRef = useRef(null);
  const workspaceRef = useRef(null);
  const rightContainerRef = useRef(null);
  const textDebounceRef = useRef(null);

  // Fetch initial room snapshot
  const fetchRoomData = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${roomId}`);
      if (!res.ok) throw new Error('Failed to load room');
      const data = await res.json();
      setText(data.text || '');
      setFiles(data.files || []);
      setImages(data.images || []);
      onUpdateRoomMeta({
        totalBytes: data.totalBytes,
        maxBytes: data.maxBytes,
        remainingSeconds: data.remainingSeconds,
        percentUsed: data.percentUsed
      });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setLoading(false);
    }
  }, [roomId, onUpdateRoomMeta]);

  // Socket.io initialization & event listeners
  useEffect(() => {
    fetchRoomData();

    const socket = io('/', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('room:join', { roomId });

    socket.on('room:text-updated', ({ text: newText, totalBytes }) => {
      setText(newText);
      onUpdateRoomMeta(prev => ({ ...prev, totalBytes }));
    });

    socket.on('room:files-updated', ({ files: newFiles, images: newImages, totalBytes, percentUsed }) => {
      setFiles(newFiles || []);
      setImages(newImages || []);
      onUpdateRoomMeta(prev => ({ ...prev, totalBytes, percentUsed }));
    });

    socket.on('room:peers-count', ({ count }) => {
      onUpdateRoomMeta(prev => ({ ...prev, peersCount: count }));
    });

    socket.on('room:expired', () => {
      alert('This temporary room has expired after 2 hours. Redirecting to home...');
      window.location.pathname = '/';
    });

    socket.on('room:error', ({ message }) => {
      alert(`Room notice: ${message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, fetchRoomData, onUpdateRoomMeta]);

  // Text change handler with live socket broadcast & debounce
  const handleTextChange = (newText) => {
    setText(newText);

    if (socketRef.current) {
      socketRef.current.emit('room:text-change', { roomId, text: newText });
    }

    if (textDebounceRef.current) {
      clearTimeout(textDebounceRef.current);
    }

    textDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/room/${roomId}/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newText })
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to sync text');
        }
      } catch (err) {
        console.error('Text save error', err);
      }
    }, 400);
  };

  // Upload handler for files & images
  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);

    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    try {
      const res = await fetch(`/api/room/${roomId}/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setFiles(data.room.files || []);
      setImages(data.room.images || []);
      onUpdateRoomMeta({
        totalBytes: data.room.totalBytes,
        maxBytes: data.room.maxBytes,
        percentUsed: data.room.percentUsed,
        remainingSeconds: data.room.remainingSeconds
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete file or image handler
  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this item from the room?')) return;
    try {
      const res = await fetch(`/api/room/${roomId}/file/${fileId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
    } catch (err) {
      alert(err.message);
    }
  };

  // Resizable Horizontal Splitter (Left vs Right)
  const handleHorizontalMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingHorizontal(true);
  };

  // Resizable Vertical Splitter (Files vs Images)
  const handleVerticalMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingVertical(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingHorizontal && workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        updateLeftWidth(percent);
      } else if (isDraggingVertical && rightContainerRef.current) {
        const rect = rightContainerRef.current.getBoundingClientRect();
        const percent = ((e.clientY - rect.top) / rect.height) * 100;
        updateTopFilesHeight(percent);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingHorizontal(false);
      setIsDraggingVertical(false);
    };

    if (isDraggingHorizontal || isDraggingVertical) {
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingHorizontal, isDraggingVertical, updateLeftWidth, updateTopFilesHeight]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', color: 'var(--text-muted)' }}>
        Loading room /{roomId}...
      </div>
    );
  }

  return (
    <div 
      className="workspace-wrapper" 
      ref={workspaceRef} 
      style={{ padding: '8px', gap: '4px' }}
    >
      {/* Box 1: For Texts */}
      <div style={{ width: `${leftWidthPercent}%`, height: '100%', minWidth: '220px' }}>
        <TextBox 
          text={text} 
          onTextChange={handleTextChange} 
        />
      </div>

      {/* Horizontal Draggable Divider */}
      <div 
        className={`gutter-horizontal ${isDraggingHorizontal ? 'dragging' : ''}`}
        onMouseDown={handleHorizontalMouseDown}
        title="Drag to resize Text panel width"
      />

      {/* Right Container: Files & Images */}
      <div 
        ref={rightContainerRef}
        style={{ 
          flex: 1, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: '240px',
          gap: '4px'
        }}
      >
        {/* Box 2: for Files */}
        <div style={{ height: `${topFilesHeightPercent}%`, minHeight: '120px' }}>
          <FilesBox 
            files={files} 
            onUpload={handleUpload} 
            onDelete={handleDelete}
            roomId={roomId}
            isUploading={isUploading}
          />
        </div>

        {/* Vertical Draggable Divider */}
        <div 
          className={`gutter-vertical ${isDraggingVertical ? 'dragging' : ''}`}
          onMouseDown={handleVerticalMouseDown}
          title="Drag to resize Files & Images panel height"
        />

        {/* Box 3: For Images */}
        <div style={{ flex: 1, minHeight: '120px' }}>
          <ImagesBox 
            images={images} 
            onUpload={handleUpload} 
            onDelete={handleDelete}
            roomId={roomId}
            isUploading={isUploading}
          />
        </div>
      </div>
    </div>
  );
}
