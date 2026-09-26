import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Navbar } from './components/Navbar';
import { Home } from './components/Home';
import { SplitPane } from './components/SplitPane';
import { TextBox } from './components/TextBox';
import { FilesBox } from './components/FilesBox';
import { ImagesBox } from './components/ImagesBox';
import { QrModal } from './components/QrModal';
import { ToastProvider, useToast } from './components/Toast';
import { addRecentRoom } from './utils/storage';
import { getInitialTheme, applyTheme } from './utils/theme';
import { AdSlot } from './components/AdSlot';

function AppContent() {
  // Routing state based on path
  const [currentRoomId, setCurrentRoomId] = useState(() => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    return path ? path.toLowerCase() : null;
  });

  // Room state
  const [roomData, setRoomData] = useState({
    text: '',
    files: [],
    images: [],
    totalBytes: 0,
    maxBytes: 65 * 1024 * 1024
  });

  const [peersCount, setPeersCount] = useState(1);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'saving' | 'remote'
  const [isUploading, setIsUploading] = useState(false);
  const [maximizedPane, setMaximizedPane] = useState(null); // 'text' | 'files' | 'images' | null
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  // Sync theme changes with DOM and storage
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);

  const socketRef = useRef(null);
  const textDebounceTimer = useRef(null);
  const isLocalTyping = useRef(false);
  const { addToast } = useToast();

  // Listen to browser navigation (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
      setCurrentRoomId(path ? path.toLowerCase() : null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToRoom = useCallback((roomId) => {
    const normalized = roomId.trim().toLowerCase();
    window.history.pushState({}, '', `/${normalized}`);
    setCurrentRoomId(normalized);
    addRecentRoom(normalized);
  }, []);

  const navigateToHome = useCallback(() => {
    window.history.pushState({}, '', '/');
    setCurrentRoomId(null);
    setMaximizedPane(null);
  }, []);

  const currentRoomIdRef = useRef(currentRoomId);

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
    if (socketRef.current?.connected && currentRoomId) {
      socketRef.current.emit('room:join', { roomId: currentRoomId });
    }
  }, [currentRoomId]);

  // Initialize and manage Socket.io connection once
  useEffect(() => {
    // In dev, Vite proxies /socket.io to backend; in prod, same origin or configured origin
    const socket = io('/', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to server, id:', socket.id);
      if (currentRoomIdRef.current) {
        socket.emit('room:join', { roomId: currentRoomIdRef.current });
      }
    });

    socket.on('room:peers-count', ({ count }) => {
      setPeersCount(count);
    });

    socket.on('room:text-updated', ({ text, totalBytes }) => {
      // Remote user updated text
      setSyncStatus('remote');
      setRoomData(prev => ({
        ...prev,
        text,
        totalBytes: totalBytes ?? prev.totalBytes
      }));
      setTimeout(() => setSyncStatus('synced'), 600);
    });

    socket.on('room:files-updated', ({ files, images, totalBytes, percentUsed }) => {
      setRoomData(prev => ({
        ...prev,
        files: files || [],
        images: images || [],
        totalBytes: totalBytes ?? prev.totalBytes
      }));
    });

    socket.on('room:expired', ({ message }) => {
      addToast(message || 'This room has expired after 20 minutes.', 'error', 6000);
      navigateToHome();
    });

    socket.on('room:error', ({ message }) => {
      addToast(message || 'Connection or update issue occurred.', 'error', 4500);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', () => {
      // Background reconnecting
    });

    return () => {
      socket.disconnect();
    };
  }, [navigateToHome, addToast]);

  // Load initial room data from REST endpoint whenever currentRoomId changes
  useEffect(() => {
    if (!currentRoomId) return;

    let isMounted = true;

    async function loadRoom() {
      try {
        const res = await fetch(`/api/room/${currentRoomId}`);
        if (!res.ok) throw new Error('Failed to load room details');
        const data = await res.json();
        if (isMounted) {
          setRoomData({
            text: data.text || '',
            files: data.files || [],
            images: data.images || [],
            totalBytes: data.totalBytes || 0,
            maxBytes: data.maxBytes || 65 * 1024 * 1024
          });
          // Join room via socket if already connected
          if (socketRef.current?.connected) {
            socketRef.current.emit('room:join', { roomId: currentRoomId });
          }
          addRecentRoom(currentRoomId);
        }
      } catch (err) {
        console.error('Room fetch error:', err);
        addToast('Unable to connect to room server', 'error');
      }
    }

    loadRoom();

    return () => {
      isMounted = false;
    };
  }, [currentRoomId, addToast]);

  // Re-sync latest room state when tab regains focus or visibility
  useEffect(() => {
    if (!currentRoomId) return;

    const handleFocusSync = async () => {
      if (document.visibilityState === 'visible' && currentRoomId) {
        try {
          const res = await fetch(`/api/room/${currentRoomId}`);
          if (res.ok) {
            const data = await res.json();
            setRoomData(prev => ({
              ...prev,
              text: data.text ?? prev.text,
              files: data.files ?? prev.files,
              images: data.images ?? prev.images,
              totalBytes: data.totalBytes ?? prev.totalBytes
            }));
          }
        } catch {
          // Ignore background sync errors
        }
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);
    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [currentRoomId]);

  // Handle local text changes with real-time Socket broadcast
  const handleTextChange = useCallback((newText) => {
    isLocalTyping.current = true;
    setSyncStatus('saving');

    // Update local state immediately
    setRoomData(prev => ({ ...prev, text: newText }));

    // Debounce socket broadcast
    if (textDebounceTimer.current) {
      clearTimeout(textDebounceTimer.current);
    }

    textDebounceTimer.current = setTimeout(() => {
      if (socketRef.current?.connected && currentRoomId) {
        socketRef.current.emit('room:text-change', {
          roomId: currentRoomId,
          text: newText
        });
      }
      setSyncStatus('synced');
      isLocalTyping.current = false;
    }, 120);
  }, [currentRoomId]);

  // Handle uploading files/images
  const handleUploadFiles = useCallback(async (filesList) => {
    if (!currentRoomId || !filesList || filesList.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (const file of filesList) {
      formData.append('files', file);
    }

    try {
      const res = await fetch(`/api/room/${currentRoomId}/upload`, {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Upload failed');
      }

      addToast(`Successfully uploaded ${json.uploaded?.length || filesList.length} item(s)!`, 'success');

      // Update room state from response
      if (json.room) {
        setRoomData(prev => ({
          ...prev,
          files: json.room.files || [],
          images: json.room.images || [],
          totalBytes: json.room.totalBytes || prev.totalBytes
        }));
      }
    } catch (err) {
      console.error('Upload error:', err);
      addToast(err.message || 'File upload failed', 'error', 4500);
    } finally {
      setIsUploading(false);
    }
  }, [currentRoomId, addToast]);

  // Handle deleting a file or image
  const handleDeleteFile = useCallback(async (fileId) => {
    if (!currentRoomId || !fileId) return;

    try {
      const res = await fetch(`/api/room/${currentRoomId}/file/${fileId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Delete failed');
      }

      // Optimistic update
      setRoomData(prev => ({
        ...prev,
        files: prev.files.filter(f => f.id !== fileId),
        images: prev.images.filter(img => img.id !== fileId)
      }));

      addToast('Item removed from room', 'info');
    } catch (err) {
      console.error('Delete error:', err);
      addToast(err.message || 'Failed to delete file', 'error');
    }
  }, [currentRoomId, addToast]);

  // Toggle maximize state
  const handleToggleMaximize = useCallback((paneName) => {
    setMaximizedPane(prev => (prev === paneName ? null : paneName));
  }, []);

  return (
    <div className="app-shell">
      {/* Ambient Cone of Light shining from the header lamp */}
      <div className={`workspace-lamp-beam ${theme === 'light' ? 'is-lit' : 'is-off'}`} aria-hidden="true" />

      {/* Top Navigation */}
      <Navbar
        roomId={currentRoomId}
        peersCount={peersCount}
        totalBytes={roomData.totalBytes}
        maxBytes={roomData.maxBytes}
        onOpenQr={() => setIsQrOpen(true)}
        onNavigateHome={navigateToHome}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content: Home vs Room Drop Space */}
      <main className="app-main-content">
        {!currentRoomId ? (
          <Home onJoinRoom={navigateToRoom} />
        ) : (
          <div className="room-workspace-wrapper">
            <div className="room-workspace-main">
              <SplitPane
                maximizedPane={maximizedPane}
                onToggleMaximize={handleToggleMaximize}
                textPane={
                  <TextBox
                    roomId={currentRoomId}
                    text={roomData.text}
                    onChangeText={handleTextChange}
                    syncStatus={syncStatus}
                    isMaximized={maximizedPane === 'text'}
                    onToggleMaximize={handleToggleMaximize}
                  />
                }
                filesPane={
                  <FilesBox
                    roomId={currentRoomId}
                    files={roomData.files}
                    onUploadFiles={handleUploadFiles}
                    onDeleteFile={handleDeleteFile}
                    isMaximized={maximizedPane === 'files'}
                    onToggleMaximize={handleToggleMaximize}
                    isUploading={isUploading}
                  />
                }
                imagesPane={
                  <ImagesBox
                    roomId={currentRoomId}
                    images={roomData.images}
                    onUploadFiles={handleUploadFiles}
                    onDeleteFile={handleDeleteFile}
                    isMaximized={maximizedPane === 'images'}
                    onToggleMaximize={handleToggleMaximize}
                    isUploading={isUploading}
                  />
                }
              />
            </div>

            {/* Google Ads Placement: Thin Bottom Banner in Room Workspace */}
            <div className="room-bottom-ad-bar">
              <AdSlot format="horizontal" className="room-ad-slot" label="Advertisement" />
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal for Phone Pairing */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        roomUrl={window.location.href}
        roomId={currentRoomId}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
